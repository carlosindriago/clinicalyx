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

	// Iniciar el recolector de basura (Grim Reaper) para eliminar tenants de prueba expirados cada 15 minutos
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		for range ticker.C {
			log.Println("[Grim Reaper] Buscando y eliminando tenants demo expirados...")
			result, err := db.Exec("DELETE FROM tenants WHERE is_demo = true AND expires_at < NOW()")
			if err != nil {
				log.Printf("[Grim Reaper] Error al eliminar tenants expirados: %v", err)
			} else {
				rows, _ := result.RowsAffected()
				if rows > 0 {
					log.Printf("[Grim Reaper] Se eliminaron %d inquilinos de prueba expirados en cascada.", rows)
				}
			}
		}
	}()

	// 3. Inicializar Servicio de Criptografía
	cryptoService, err := crypto.NewCryptoService(cfg.EncryptionKey, cfg.BlindIndexSalt)
	if err != nil {
		log.Fatalf("Error al inicializar CryptoService: %v", err)
	}

	// 4. Inicializar Repositorios (Adaptadores de salida)
	patientRepo := postgres.NewPostgresPatientRepository(db, cryptoService)
	userRepo := postgres.NewPostgresUserRepository(db, cryptoService)
	sessionRepo := postgres.NewPostgresSessionRepository(db)
	consultationRepo := postgres.NewPostgresConsultationRepository(db, cryptoService)
	appointmentRepo := postgres.NewPostgresAppointmentRepository(db)
	passwordHasher := crypto.NewArgon2idPasswordHasher()

	// 5. Inicializar Servicio de Tokens JWT y Middleware de Autenticación
	jwtService := crypto.NewJWTService(
		cfg.JWTSecret,
		time.Duration(cfg.JWTAccessDurationMinutes)*time.Minute,
		time.Duration(cfg.JWTRefreshDurationDays)*24*time.Hour,
	)
	authMiddleware := inboundHTTP.NewAuthMiddleware(jwtService, sessionRepo)

	// 6. Inicializar Casos de Uso
	createPatientUC := usecases.NewCreatePatientUseCase(patientRepo)
	getPatientUC := usecases.NewGetPatientUseCase(patientRepo)
	setupTenantUC := usecases.NewSetupTenantUseCase(userRepo, passwordHasher)
	loginUC := usecases.NewLoginUseCase(userRepo, sessionRepo, passwordHasher)
	logoutUC := usecases.NewLogoutUseCase(sessionRepo)
	toggleUserStatusUC := usecases.NewToggleUserStatusUseCase(userRepo, passwordHasher)
	recordConsultationUC := usecases.NewRecordConsultationUseCase(consultationRepo, patientRepo)
	getConsultationHistoryUC := usecases.NewGetConsultationHistoryUseCase(consultationRepo, patientRepo)
	scheduleAppointmentUC := usecases.NewScheduleAppointmentUseCase(appointmentRepo, patientRepo)
	cancelAppointmentUC := usecases.NewCancelAppointmentUseCase(appointmentRepo)

	// 7. Inicializar Controladores HTTP (Adaptadores de entrada)
	patientHandler := inboundHTTP.NewPatientHandler(createPatientUC, getPatientUC)
	authHandler := inboundHTTP.NewAuthHandler(
		setupTenantUC,
		loginUC,
		logoutUC,
		toggleUserStatusUC,
		userRepo,
		jwtService,
		authMiddleware,
	)
	consultationHandler := inboundHTTP.NewConsultationHandler(
		recordConsultationUC,
		getConsultationHistoryUC,
		authMiddleware,
	)
	appointmentHandler := inboundHTTP.NewAppointmentHandler(
		scheduleAppointmentUC,
		cancelAppointmentUC,
		authMiddleware,
	)

	// 8. Configurar el Servidor HTTP (Chi)
	r := chi.NewRouter()

	// Middlewares globales de Chi
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS Config
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Registrar Rutas
	patientHandler.RegisterRoutes(r)
	authHandler.RegisterRoutes(r)
	consultationHandler.RegisterRoutes(r)
	appointmentHandler.RegisterRoutes(r)

	// Condicionalmente registrar Ephemeral Demo Handler protegido por el Kill Switch y el Rate Limiter
	if cfg.EnableEphemeralDemo {
		demoHandler := inboundHTTP.NewDemoHandler(db, cryptoService, passwordHasher, jwtService, sessionRepo)
		r.Group(func(r chi.Router) {
			r.Use(inboundHTTP.NewDemoRateLimiter())
			demoHandler.RegisterRoutes(r)
		})
		log.Println("Módulo Ephemeral Demo Mode habilitado en /api/v1/demo/start")
	} else {
		log.Println("Módulo Ephemeral Demo Mode desactivado (Kill Switch activo)")
	}

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
