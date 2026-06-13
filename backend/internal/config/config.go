package config

import (
	"fmt"
	"log"

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

// Validate realiza chequeos lógicos sobre los parámetros críticos.
func (c *Config) Validate() error {
	// Si usamos cifrado AES-256, necesitamos al menos 32 bytes de clave
	if len(c.EncryptionKey) < 32 {
		return fmt.Errorf("ENCRYPTION_KEY es muy corta (mínimo 32 caracteres para AES-256)")
	}
	if len(c.BlindIndexSalt) == 0 {
		return fmt.Errorf("BLIND_INDEX_SALT no puede estar vacío")
	}
	if len(c.JWTSecret) < 16 {
		return fmt.Errorf("JWT_SECRET es muy corto (mínimo 16 caracteres para seguridad de firmas)")
	}
	if c.JWTAccessDurationMinutes <= 0 {
		return fmt.Errorf("JWT_ACCESS_DURATION_MINUTES debe ser mayor que 0")
	}
	if c.JWTRefreshDurationDays <= 0 {
		return fmt.Errorf("JWT_REFRESH_DURATION_DAYS debe ser mayor que 0")
	}
	return nil
}
