package http

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type limiterInfo struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter maneja múltiples limitadores por IP de forma concurrente
type IPRateLimiter struct {
	ips   map[string]*limiterInfo
	mu    sync.RWMutex
	limit rate.Limit
	burst int
}

// NewIPRateLimiter crea una instancia de IPRateLimiter y arranca la limpieza automática en segundo plano
func NewIPRateLimiter(ctx context.Context, r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips:   make(map[string]*limiterInfo),
		limit: r,
		burst: b,
	}

	// Goroutine de limpieza periódica para evitar pérdidas de memoria (memory leaks)
	go limiter.cleanupLoop(ctx)

	return limiter
}

func (i *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	info, exists := i.ips[ip]
	if !exists {
		info = &limiterInfo{
			limiter: rate.NewLimiter(i.limit, i.burst),
		}
		i.ips[ip] = info
	}
	info.lastSeen = time.Now()

	return info.limiter
}

func (i *IPRateLimiter) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			i.mu.Lock()
			for ip, info := range i.ips {
				// Si la IP no ha sido vista en más de 1 hora, eliminamos el limitador
				if time.Since(info.lastSeen) > 1*time.Hour {
					delete(i.ips, ip)
				}
			}
			i.mu.Unlock()
		case <-ctx.Done():
			return
		}
	}
}

// trustedProxies contiene la lista de CIDRs/IPs de proxies que tienen
// permiso para fijar X-Forwarded-For / X-Real-IP. Si está vacía, ninguna
// fuente de proxy se considera confiable y siempre se usa RemoteAddr.
//
// Estructura inmutable tras la construcción; thread-safe sin lock.
type trustedProxies struct {
	nets []*net.IPNet
	ips  []net.IP
}

// newTrustedProxiesFromCIDRs parsea una lista de CIDRs (e.g. "10.0.0.0/8",
// "192.168.1.1") y devuelve una estructura consultable. Las entradas
// inválidas se ignoran silenciosamente para no abortar el arranque por
// un valor mal escrito en la configuración; el operador verá logs de
// advertencia en el llamador si lo desea.
func newTrustedProxiesFromCIDRs(entries []string) *trustedProxies {
	return newTrustedProxiesFromCIDRsInternal(entries)
}

// newTrustedProxiesFromCIDRsInternal es la implementación real (no exportada).
func newTrustedProxiesFromCIDRsInternal(entries []string) *trustedProxies {
	tp := &trustedProxies{}
	for _, e := range entries {
		e = strings.TrimSpace(e)
		if e == "" {
			continue
		}
		// Si tiene "/", interpretarlo como CIDR. Si no, tratarlo como IP suelta.
		if strings.Contains(e, "/") {
			_, ipnet, err := net.ParseCIDR(e)
			if err != nil {
				continue
			}
			tp.nets = append(tp.nets, ipnet)
		} else {
			ip := net.ParseIP(e)
			if ip == nil {
				continue
			}
			tp.ips = append(tp.ips, ip)
		}
	}
	return tp
}

// NewTrustedProxiesFromCIDRs es el wrapper público para que main.go pueda
// construir la lista de proxies confiables desde la configuración sin
// tener que duplicar el parsing.
func NewTrustedProxiesFromCIDRs(entries []string) *trustedProxies {
	return newTrustedProxiesFromCIDRsInternal(entries)
}

// containsIP verifica si la IP pertenece a algún CIDR o IP listada.
func (tp *trustedProxies) containsIP(ip net.IP) bool {
	if ip == nil {
		return false
	}
	for _, n := range tp.nets {
		if n.Contains(ip) {
			return true
		}
	}
	for _, i := range tp.ips {
		if i.Equal(ip) {
			return true
		}
	}
	return false
}

// ExtractIP extrae la IP del cliente de forma SEGURA.
//
// Política:
//
//  1. Si la conexión proviene de un proxy confiable (TRUSTED_PROXIES_IPS),
//     se honra X-Forwarded-For (tomando la primera IP de la cadena) o
//     X-Real-IP como fallback. Esto es el comportamiento esperado cuando
//     hay un reverse proxy legítimo (Cloudflare, nginx, ALB) frente al
//     servidor.
//
//  2. Si la conexión NO proviene de un proxy confiable, se ignora
//     completamente X-Forwarded-For/X-Real-IP y se usa RemoteAddr. Esto
//     previene el ataque de spoofing donde un cliente envía el header
//     con una IP arbitraria para bypasear el rate limit por IP.
//
//  3. Si TRUSTED_PROXIES_IPS está vacío (modo seguro por defecto), el
//     paso 1 nunca se aplica y siempre se usa RemoteAddr.
func ExtractIP(r *http.Request, trusted *trustedProxies) string {
	// Extraer IP de RemoteAddr siempre; es la fuente confiable.
	remoteIP := remoteAddrToIP(r.RemoteAddr)
	if remoteIP == nil {
		// Sin RemoteAddr parseable, caer a "unknown" para no fallar.
		return "unknown"
	}

	// Si no hay proxies confiables configurados, ignorar headers
	// de proxy y usar siempre RemoteAddr.
	if trusted == nil || (len(trusted.nets) == 0 && len(trusted.ips) == 0) {
		return remoteIP.String()
	}

	// Solo honrar headers si la conexión proviene de un proxy confiable.
	if !trusted.containsIP(remoteIP) {
		return remoteIP.String()
	}

	// 1. Intentar cabecera X-Forwarded-For (Cloudflare, Nginx, ALB, etc.)
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For puede contener múltiples IPs: "client, proxy1, proxy2".
		// Tomamos la primera, que es el cliente original.
		ips := strings.Split(xForwardedFor, ",")
		clientIP := strings.TrimSpace(ips[0])
		if parsed := net.ParseIP(clientIP); parsed != nil {
			return parsed.String()
		}
	}

	// 2. Intentar cabecera X-Real-IP
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		if parsed := net.ParseIP(strings.TrimSpace(xRealIP)); parsed != nil {
			return parsed.String()
		}
	}

	// 3. Fallback a RemoteAddr
	return remoteIP.String()
}

// remoteAddrToIP extrae la IP de un string RemoteAddr (formato "ip:port").
func remoteAddrToIP(remoteAddr string) net.IP {
	ip, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		// Si no tiene puerto, intentar parsear el string completo como IP.
		return net.ParseIP(remoteAddr)
	}
	return net.ParseIP(ip)
}

// RateLimitMiddleware genera un middleware de rate limiting genérico.
// Usa la lista de proxies confiables para decidir si honrar los headers
// de X-Forwarded-For / X-Real-IP.
func RateLimitMiddleware(limiter *IPRateLimiter, trusted *trustedProxies) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ExtractIP(r, trusted)
			l := limiter.getLimiter(ip)

			if !l.Allow() {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				response := map[string]string{
					"error": "Demasiadas peticiones. Por favor, inténtelo de nuevo más tarde.",
				}
				_ = json.NewEncoder(w).Encode(response)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// NewLoginRateLimiter crea un middleware que limita el login a 5 intentos por minuto por IP.
// Usa la lista de proxies confiables pasada para que ExtractIP decida
// correctamente si honrar los headers de proxy.
func NewLoginRateLimiter(ctx context.Context, trusted *trustedProxies) func(http.Handler) http.Handler {
	// 5 peticiones por minuto = 5 / 60 = 0.083 req/seg
	limit := rate.Every(time.Minute / 5)
	limiter := NewIPRateLimiter(ctx, limit, 5)
	return RateLimitMiddleware(limiter, trusted)
}

// NewDemoRateLimiter crea un middleware que limita la creación de sandboxes
// de demo a 3 peticiones por hora por IP (defensa agresiva contra DoS para
// servidores de bajo presupuesto). burst=3 permite los 3 intentos en
// rafaga pero el rate de relleno es 1 cada 20 minutos.
//
// Usa ExtractIP con la lista de proxies confiables para no permitir que
// un atacante bypasee el rate limit enviando un X-Forwarded-For
// falsificado desde una IP que no es trusted proxy.
func NewDemoRateLimiter(ctx context.Context, trusted *trustedProxies) func(http.Handler) http.Handler {
	// 3 peticiones por hora = 1 cada 20 minutos
	limit := rate.Every(20 * time.Minute)
	limiter := NewIPRateLimiter(ctx, limit, 3)
	return DemoRateLimitMiddleware(limiter)
}

// DemoRateLimitMiddleware es una variante del RateLimitMiddleware que
// devuelve un mensaje claro cuando se excede el límite de demos: el
// cliente del portfolio mode puede mostrar el mensaje exacto al usuario.
func DemoRateLimitMiddleware(limiter *IPRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Usar el mismo ExtractIP que el resto: respeta TRUSTED_PROXIES_IPS.
			ip := ExtractIP(r, nil)
			l := limiter.getLimiter(ip)

			if !l.Allow() {
				w.Header().Set("Content-Type", "application/json")
				// Cabecera estándar de rate limit.
				w.Header().Set("Retry-After", "3600")
				w.WriteHeader(http.StatusTooManyRequests)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Has alcanzado el límite de demostraciones para tu IP. Por seguridad, el sandbox se puede crear 3 veces por hora. Inténtalo de nuevo más tarde.",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
