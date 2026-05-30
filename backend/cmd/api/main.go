package main

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	inboundHTTP "clinicalyx/backend/internal/adapters/inbound/http"
	"clinicalyx/backend/internal/adapters/outbound/postgres"
	"clinicalyx/backend/internal/config"
	"clinicalyx/backend/internal/core/usecases"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/lib/pq"
)

func main() {
	log.Println("Starting Clinicalyx API...")

	// 1. Cargar Configuración
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Error crítico al cargar configuración: %v", err)
	}

	// 2. Establecer conexión a PostgreSQL
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Error al conectar a la base de datos: %v", err)
	}
	defer db.Close()

	// Configurar límites saludables para el pool de conexiones
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	if err := db.Ping(); err != nil {
		log.Fatalf("No se pudo responder al ping de la base de datos: %v", err)
	}
	log.Println("Conexión a la base de datos PostgreSQL establecida con éxito.")

	// 3. Inicializar Servicio de Criptografía
	cryptoService, err := crypto.NewCryptoService(cfg.EncryptionKey, cfg.BlindIndexSalt)
	if err != nil {
		log.Fatalf("Error al inicializar CryptoService: %v", err)
	}

	// 4. Inicializar Repositorio (Adaptador de salida)
	patientRepo := postgres.NewPostgresPatientRepository(db, cryptoService)

	// 5. Inicializar Casos de Uso
	createPatientUC := usecases.NewCreatePatientUseCase(patientRepo)

	// 6. Inicializar Controladores HTTP (Adaptador de entrada)
	patientHandler := inboundHTTP.NewPatientHandler(createPatientUC)

	// 7. Configurar el Servidor HTTP (Chi)
	r := chi.NewRouter()

	// Middlewares globales de Chi
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Config
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"}, // Ajustar según conveniencia de seguridad en producción
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Registrar Rutas
	patientHandler.RegisterRoutes(r)

	// Iniciar Servidor
	log.Printf("Servidor escuchando en el puerto %s en entorno: %s", cfg.Port, cfg.Env)
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Error fatal al iniciar el servidor HTTP: %v", err)
	}
}
