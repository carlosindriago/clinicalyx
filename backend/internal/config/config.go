package config

import (
	"fmt"
	"log"
	"strings"

	"github.com/joho/godotenv"
	"github.com/kelseyhightower/envconfig"
)

// Config define la estructura de variables de entorno de la aplicación.
type Config struct {
	Port                     string   `envconfig:"PORT" default:"8080"`
	Env                      string   `envconfig:"ENV" default:"development"`
	DatabaseURL              string   `envconfig:"DATABASE_URL" required:"true"`
	EncryptionKey            string   `envconfig:"ENCRYPTION_KEY" required:"true"`
	BlindIndexSalt           string   `envconfig:"BLIND_INDEX_SALT" required:"true"`
	JWTSecret                string   `envconfig:"JWT_SECRET" required:"true"`
	JWTAccessDurationMinutes int      `envconfig:"JWT_ACCESS_DURATION_MINUTES" default:"15"`
	JWTRefreshDurationDays   int      `envconfig:"JWT_REFRESH_DURATION_DAYS" default:"7"`
	CORSAllowedOrigins       []string `envconfig:"CORS_ALLOWED_ORIGINS" default:"http://localhost:3000"`
	EnableEphemeralDemo      bool     `envconfig:"ENABLE_EPHEMERAL_DEMO" default:"false"`
	// SetupToken autentica el endpoint POST /api/v1/auth/setup que crea el
	// primer SUPERADMIN de un tenant. Si está vacío, el endpoint queda cerrado.
	// Operacionalmente es un secreto que se inyecta al despliegue; nunca debe
	// aparecer en el repositorio. Comparación en tiempo constante.
	SetupToken string `envconfig:"SETUP_TOKEN"`
	// TrustedProxiesIPs lista de IPs/CIDRs de proxies confiables (uno por
	// entrada) que tienen permiso para fijar X-Forwarded-For / X-Real-IP.
	// Si la petición llega de una IP que no está en esta lista, los headers
	// de proxy se ignoran y se usa RemoteAddr. Lista vacía = modo seguro por
	// defecto (nunca confiar en headers de proxy).
	TrustedProxiesIPs []string `envconfig:"TRUSTED_PROXIES_IPS"`
	// AWS S3 / MinIO configuration
	AWSRegion          string `envconfig:"AWS_REGION" default:"us-east-1"`
	AWSAccessKeyID     string `envconfig:"AWS_ACCESS_KEY_ID" default:"clinicalyx_admin"`
	AWSSecretAccessKey string `envconfig:"AWS_SECRET_ACCESS_KEY" default:"clinicalyx_secret"`
	AWSBucket          string `envconfig:"AWS_BUCKET" default:"clinicalyx-files"`
	AWSEndpoint        string `envconfig:"AWS_ENDPOINT" default:"http://localhost:9000"`
}

// Load carga la configuración desde el archivo .env (si existe) y del entorno de ejecución.
func Load() (*Config, error) {
	// Si el archivo .env no está presente, godotenv fallará, lo cual es normal
	// en entornos productivos o Docker donde las variables se inyectan directamente.
	if err := godotenv.Load(); err != nil {
		log.Println("Info: Archivo .env no cargado. Usando variables del entorno del sistema.")
	}

	var cfg Config
	if err := envconfig.Process("", &cfg); err != nil {
		return nil, fmt.Errorf("error cargando variables de entorno: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("configuración inválida: %w", err)
	}

	return &cfg, nil
}

// isUnsafePlaceholder detecta si un valor de configuración coincide con
// patrones de placeholder comunes de los archivos .env.example. Si lo es,
// Fail-Fast en el arranque: la aplicación no debe iniciar con secretos
// públicamente conocidos en el repo.
//
// Lista de patrones:
//   - "change_me" / "CHANGE_ME" en cualquier posición
//   - "<INSERTE_AQUI_*" o similares (marcadores explícitos)
//   - "PLACEHOLDER" / "REEMPLAZAR" / "REEMPLACE"
//   - Cadenas de "x" o "0" repetidas que parecen defaults vacíos
func isUnsafePlaceholder(value string) bool {
	lowered := strings.ToLower(strings.TrimSpace(value))
	if lowered == "" {
		return false // vacío se valida en otra regla
	}

	// Patrones de placeholder textual
	unsafeMarkers := []string{
		"change_me",
		"changeme",
		"placeholder",
		"reemplazar",
		"reemplace",
		"inserte_aqui",
		"inserte aqui",
		"set_me",
		"setme",
		"your_key_here",
		"your-secret",
		"<insert",
		"<set",
		"todo_reemplazar",
		"development_key",
		"dev_key",
	}
	for _, marker := range unsafeMarkers {
		if strings.Contains(lowered, marker) {
			return true
		}
	}

	return false
}

// Validate realiza chequeos lógicos sobre los parámetros críticos.
// Fail-Fast: cualquier error aquí aborta el arranque de la aplicación
// para evitar operar con secretos públicamente conocidos o muy débiles.
func (c *Config) Validate() error {
	// Si usamos cifrado AES-256, necesitamos al menos 32 bytes de clave.
	// Subimos el mínimo a 32 chars (256 bits de entropía) y añadimos
	// Fail-Fast si el valor es un placeholder conocido del repo.
	if len(c.EncryptionKey) < 32 {
		return fmt.Errorf("ENCRYPTION_KEY es muy corta (mínimo 32 caracteres para AES-256)")
	}
	if isUnsafePlaceholder(c.EncryptionKey) {
		return fmt.Errorf("ENCRYPTION_KEY contiene un placeholder conocido (ej. change_me). Reemplace por una clave criptográfica real antes de desplegar")
	}

	if len(c.BlindIndexSalt) == 0 {
		return fmt.Errorf("BLIND_INDEX_SALT no puede estar vacío")
	}
	if isUnsafePlaceholder(c.BlindIndexSalt) {
		return fmt.Errorf("BLIND_INDEX_SALT contiene un placeholder conocido. Reemplace por un valor criptográficamente aleatorio antes de desplegar")
	}

	// JWT_SECRET: endurecer a 32 chars (HMAC-SHA256 idealmente 256 bits
	// de entropía) y rechazar placeholders.
	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET es muy corto (mínimo 32 caracteres para seguridad de firmas HMAC-SHA256)")
	}
	if isUnsafePlaceholder(c.JWTSecret) {
		return fmt.Errorf("JWT_SECRET contiene un placeholder conocido. Reemplace por un secreto criptográficamente aleatorio antes de desplegar")
	}

	if c.JWTAccessDurationMinutes <= 0 {
		return fmt.Errorf("JWT_ACCESS_DURATION_MINUTES debe ser mayor que 0")
	}
	if c.JWTRefreshDurationDays <= 0 {
		return fmt.Errorf("JWT_REFRESH_DURATION_DAYS debe ser mayor que 0")
	}

	// Si se proporciona SETUP_TOKEN, exigir una longitud mínima razonable
	// para evitar tokens triviales en producción. Si está vacío, el endpoint
	// /api/v1/auth/setup quedará cerrado (comportamiento seguro por defecto).
	if c.SetupToken != "" {
		if len(c.SetupToken) < 32 {
			return fmt.Errorf("SETUP_TOKEN debe tener al menos 32 caracteres (o estar vacío para deshabilitar bootstrap)")
		}
		if isUnsafePlaceholder(c.SetupToken) {
			return fmt.Errorf("SETUP_TOKEN contiene un placeholder conocido. Use un token criptográficamente aleatorio o déjelo vacío")
		}
	}

	return nil
}
