package http

import (
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
func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips:   make(map[string]*limiterInfo),
		limit: r,
		burst: b,
	}

	// Goroutine de limpieza periódica para evitar pérdidas de memoria (memory leaks)
	go limiter.cleanupLoop()

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

func (i *IPRateLimiter) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		i.mu.Lock()
		for ip, info := range i.ips {
			// Si la IP no ha sido vista en más de 1 hora, eliminamos el limitador
			if time.Since(info.lastSeen) > 1*time.Hour {
				delete(i.ips, ip)
			}
		}
		i.mu.Unlock()
	}
}

// ExtractIP extrae la IP real del cliente considerando cabeceras de proxy
func ExtractIP(r *http.Request) string {
	// 1. Intentar cabecera X-Forwarded-For (Cloudflare, Nginx, ALB, etc.)
	xForwardedFor := r.Header.Get("X-Forwarded-For")
	if xForwardedFor != "" {
		// X-Forwarded-For puede contener múltiples IPs: "client, proxy1, proxy2".
		// Tomamos la primera, que es el cliente original.
		ips := strings.Split(xForwardedFor, ",")
		clientIP := strings.TrimSpace(ips[0])
		if clientIP != "" {
			return clientIP
		}
	}

	// 2. Intentar cabecera X-Real-IP
	xRealIP := r.Header.Get("X-Real-IP")
	if xRealIP != "" {
		return strings.TrimSpace(xRealIP)
	}

	// 3. Fallback a RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// RateLimitMiddleware genera un middleware de rate limiting genérico
func RateLimitMiddleware(limiter *IPRateLimiter) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ExtractIP(r)
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

// NewLoginRateLimiter crea un middleware que limita el login a 5 intentos por minuto por IP
func NewLoginRateLimiter() func(http.Handler) http.Handler {
	// 5 peticiones por minuto = 5 / 60 = 0.083 req/seg
	limit := rate.Every(time.Minute / 5)
	limiter := NewIPRateLimiter(limit, 5)
	return RateLimitMiddleware(limiter)
}

// NewDemoRateLimiter crea un middleware que limita la creación de demos a 1 petición por hora por IP
func NewDemoRateLimiter() func(http.Handler) http.Handler {
	limit := rate.Every(1 * time.Hour)
	limiter := NewIPRateLimiter(limit, 1)
	return RateLimitMiddleware(limiter)
}
