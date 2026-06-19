package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	inboundHTTP "clinicalyx/backend/internal/adapters/inbound/http"
	"clinicalyx/backend/internal/adapters/outbound/postgres"
	"clinicalyx/backend/internal/adapters/outbound/s3"
	"clinicalyx/backend/internal/config"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/lib/pq"
)

func main() {
	log.Println("Starting Clinicalyx API...")

	// 1. Configurar contexto principal para graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 2. Cargar Configuración
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
		defer ticker.Stop()
		
		for {
			select {
			case <-ticker.C:
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
			case <-ctx.Done():
				return
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
	fileRepo := postgres.NewPostgresFileRepository(db)
	passwordHasher := crypto.NewArgon2idPasswordHasher()

	// 5. Inicializar Servicio de Tokens JWT y Middleware de Autenticación
	jwtService := crypto.NewJWTService(
		cfg.JWTSecret,
		time.Duration(cfg.JWTAccessDurationMinutes)*time.Minute,
		time.Duration(cfg.JWTRefreshDurationDays)*24*time.Hour,
	)
	authMiddleware := inboundHTTP.NewAuthMiddleware(jwtService, sessionRepo)

	// 5b. Inicializar Servicio de Almacenamiento S3/MinIO
	storageService, err := s3.NewS3StorageService(
		cfg.AWSEndpoint,
		cfg.AWSRegion,
		cfg.AWSAccessKeyID,
		cfg.AWSSecretAccessKey,
		cfg.AWSBucket,
	)
	if err != nil {
		log.Fatalf("Error al inicializar servicio de almacenamiento S3: %v", err)
	}
	log.Println("Servicio de almacenamiento S3/MinIO inicializado exitosamente")

	// 6. Inicializar Casos de Uso
	createPatientUC := usecases.NewCreatePatientUseCase(patientRepo)
	getPatientUC := usecases.NewGetPatientUseCase(patientRepo)
	setupTenantUC := usecases.NewSetupTenantUseCase(userRepo, passwordHasher)
	loginUC := usecases.NewLoginUseCase(userRepo, sessionRepo, passwordHasher)
	logoutUC := usecases.NewLogoutUseCase(sessionRepo)
	refreshSessionUC := usecases.NewRefreshSessionUseCase(sessionRepo, userRepo)
	toggleUserStatusUC := usecases.NewToggleUserStatusUseCase(userRepo, passwordHasher)
	recordConsultationUC := usecases.NewRecordConsultationUseCase(consultationRepo, patientRepo)
	getConsultationHistoryUC := usecases.NewGetConsultationHistoryUseCase(consultationRepo, patientRepo)
	scheduleAppointmentUC := usecases.NewScheduleAppointmentUseCase(appointmentRepo, patientRepo)
	cancelAppointmentUC := usecases.NewCancelAppointmentUseCase(appointmentRepo)
	fileUseCases := usecases.NewFileUseCases(fileRepo, storageService)

	// 7. Inicializar Controladores HTTP (Adaptadores de entrada)
	// Construir la lista de proxies confiables desde la configuración.
	// Si está vacía, el rate limiter usará siempre RemoteAddr (modo
	// seguro por defecto: nunca se confía en headers de proxy).
	trustedProxies := inboundHTTP.NewTrustedProxiesFromCIDRs(cfg.TrustedProxiesIPs)
	if len(cfg.TrustedProxiesIPs) == 0 {
		log.Println("[INFO] TRUSTED_PROXIES_IPS ausente: el rate limiter usará solo RemoteAddr (no se honra X-Forwarded-For ni X-Real-IP).")
	}

	patientHandler := inboundHTTP.NewPatientHandler(createPatientUC, getPatientUC)
	authHandler := inboundHTTP.NewAuthHandler(
		ctx,
		setupTenantUC,
		loginUC,
		logoutUC,
		refreshSessionUC,
		toggleUserStatusUC,
		userRepo,
		jwtService,
		authMiddleware,
		trustedProxies,
	)
	// Inyectar el middleware de setup-token desde la configuración. Si
	// SETUP_TOKEN está vacío, el endpoint /api/v1/auth/setup queda cerrado
	// (responde 503). Esto previene tenant-takeover por cualquier caller
	// que conozca un UUID de tenant sin usuarios.
	authHandler.SetSetupTokenMiddleware(cfg.SetupToken)
	if cfg.SetupToken == "" {
		log.Println("[WARN] SETUP_TOKEN ausente: POST /api/v1/auth/setup deshabilitado. Use un token de bootstrap para provisionar nuevos tenants.")
	}
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
	fileHandler := inboundHTTP.NewFileHandler(fileUseCases)

	// 8. Configurar el Servidor HTTP (Chi)
	r := chi.NewRouter()

	// Middlewares globales de Chi
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	// Defensa contra DoS por bodies JSON enormes. Limita el tamaño de
	// CUALQUIER request a 2 MiB. Los handlers deben usar decodeJSONBody
	// del paquete inboundHTTP para traducir el error a 413 Request
	// Entity Too Large. Si no, json.NewDecoder devolverá un error
	// genérico que se traduce a 400 Bad Request.
	r.Use(inboundHTTP.MaxBytesMiddleware(inboundHTTP.DefaultMaxRequestBodyBytes))

	// CORS Config
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Tenant-ID"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Registrar Rutas
	patientHandler.RegisterRoutes(r, authMiddleware.Handler)
	authHandler.RegisterRoutes(r)
	consultationHandler.RegisterRoutes(r)
	appointmentHandler.RegisterRoutes(r)
	
	// Registrar rutas para archivos médicos dentro del grupo autenticado de pacientes
	r.Route("/api/v1/patients/{patient_id}/files", func(r chi.Router) {
		r.Use(authMiddleware.Handler) // Asegurar protección
		// Solo personal clínico y de gestión accede a archivos médicos.
		r.Use(inboundHTTP.RequireRole(
			domain.UserRoleSuperAdmin,
			domain.UserRoleDoctor,
			domain.UserRoleNurse,
			domain.UserRoleReceptionist,
		))
		r.Post("/presign", fileHandler.GenerateUploadURL)
		r.Post("/", fileHandler.ConfirmUpload)
		r.Get("/", fileHandler.ListFiles)
		r.Get("/{file_id}/download", fileHandler.GetDownloadURL)
	})

	// Condicionalmente registrar Ephemeral Demo Handler protegido por el Kill Switch y el Rate Limiter
	if cfg.EnableEphemeralDemo {
		demoHandler := inboundHTTP.NewDemoHandler(db, cryptoService, passwordHasher, jwtService, sessionRepo)
		r.Group(func(r chi.Router) {
			r.Use(inboundHTTP.NewDemoRateLimiter(ctx, trustedProxies))
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

	// Ejecutar servidor en goroutine separada para no bloquear el hilo principal
	serverErr := make(chan error, 1)
	go func() {
		log.Println("Servidor HTTP iniciado")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Configurar canal para señales del sistema operativo
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	// Esperar señal de terminación o error del servidor
	select {
	case sig := <-sigCh:
		log.Printf("Recibida señal %v, iniciando graceful shutdown...", sig)
		
		// Cancelar contexto para detener goroutines (Grim Reaper y Rate Limiter)
		cancel()
		
		// Crear contexto con timeout para shutdown
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		
		// Intentar graceful shutdown
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("Error durante graceful shutdown: %v", err)
		} else {
			log.Println("Graceful shutdown completado exitosamente")
		}
		
	case err := <-serverErr:
		log.Fatalf("Error fatal del servidor HTTP: %v", err)
	}
}
