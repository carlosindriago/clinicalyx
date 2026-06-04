package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/adapters/outbound/postgres"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// DemoHandler gestiona la inicialización de sandboxes efímeros de demostración.
type DemoHandler struct {
	db             *sql.DB
	cryptoService  *crypto.CryptoService
	passwordHasher *crypto.Argon2idPasswordHasher
	jwtService     *crypto.JWTService
	sessionRepo    ports.SessionRepository
}

// NewDemoHandler construye una nueva instancia del DemoHandler.
func NewDemoHandler(
	db *sql.DB,
	cryptoService *crypto.CryptoService,
	passwordHasher *crypto.Argon2idPasswordHasher,
	jwtService *crypto.JWTService,
	sessionRepo ports.SessionRepository,
) *DemoHandler {
	return &DemoHandler{
		db:             db,
		cryptoService:  cryptoService,
		passwordHasher: passwordHasher,
		jwtService:     jwtService,
		sessionRepo:    sessionRepo,
	}
}

// RegisterRoutes registra la ruta del demo handler en el router de chi.
func (h *DemoHandler) RegisterRoutes(r chi.Router) {
	r.Post("/api/v1/demo/start", h.StartDemo)
}

// StartDemo crea un inquilino de prueba temporal con datos precargados y autentica automáticamente al cliente.
func (h *DemoHandler) StartDemo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Generar nuevo Tenant ID
	tenantID := domain.NewTenantID()
	shortUUID := tenantID.String()[:8]
	tenantName := fmt.Sprintf("Portfolio Demo - %s", shortUUID)
	expiresAt := time.Now().Add(2 * time.Hour)

	// 2. Registrar el tenant efímero en la base de datos
	_, err := h.db.ExecContext(r.Context(), `
		INSERT INTO tenants (id, name, is_demo, expires_at)
		VALUES ($1, $2, $3, $4)`,
		tenantID.String(), tenantName, true, expiresAt,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al registrar inquilino demo: " + err.Error()})
		return
	}

	ctx := r.Context()
	userRepo := postgres.NewPostgresUserRepository(h.db, h.cryptoService)
	patientRepo := postgres.NewPostgresPatientRepository(h.db, h.cryptoService)
	appointmentRepo := postgres.NewPostgresAppointmentRepository(h.db)

	// 3. Inyectar Usuarios de Prueba (SUPERADMIN, DOCTOR, RECEPTIONIST)
	usersToCreate := []struct {
		firstName string
		lastName  string
		email     string
		phone     string
		role      domain.UserRole
	}{
		{
			firstName: "Admin",
			lastName:  "Clinicalyx",
			email:     "admin@clinicalyx.com",
			phone:     "+56900000001",
			role:      domain.UserRoleSuperAdmin,
		},
		{
			firstName: "John",
			lastName:  "Smith",
			email:     "dr.smith@clinicalyx.com",
			phone:     "+56900000002",
			role:      domain.UserRoleDoctor,
		},
		{
			firstName: "Front",
			lastName:  "Desk",
			email:     "frontdesk@clinicalyx.com",
			phone:     "+56900000003",
			role:      domain.UserRoleReceptionist,
		},
	}

	createdUsers := make(map[string]domain.UserID)

	for _, uData := range usersToCreate {
		fNameVO, _ := domain.NewFullName(uData.firstName)
		lNameVO, _ := domain.NewFullName(uData.lastName)
		emailVO, _ := domain.NewEmail(uData.email)
		phoneVO, _ := domain.NewPhone(uData.phone)
		passwordHash, err := h.passwordHasher.Hash("password123")
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error hasheando contraseña del demo"})
			return
		}

		user, err := domain.NewUser(
			tenantID,
			fNameVO,
			lNameVO,
			emailVO,
			passwordHash,
			phoneVO,
			uData.role,
		)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error creando instancia del usuario: " + err.Error()})
			return
		}

		err = userRepo.Save(ctx, user)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error guardando usuario del demo: " + err.Error()})
			return
		}
		createdUsers[uData.email] = user.ID()
	}

	// 4. Inyectar 3 Pacientes de Demostración
	patientsToCreate := []struct {
		name     string
		docType  domain.DocumentType
		docValue string
		email    string
	}{
		{
			name:     "Carlos Perez",
			docType:  domain.DocumentTypeDNI,
			docValue: "12345678",
			email:    "carlos.perez@gmail.com",
		},
		{
			name:     "Laura Gomez",
			docType:  domain.DocumentTypeDNI,
			docValue: "87654321",
			email:    "laura.gomez@gmail.com",
		},
		{
			name:     "Richard Hendricks",
			docType:  domain.DocumentTypePassport,
			docValue: "RH987654",
			email:    "richard@piedpiper.com",
		},
	}

	var patientIDs []domain.PatientID

	for _, pData := range patientsToCreate {
		nameVO, _ := domain.NewFullName(pData.name)
		docVO, _ := domain.NewDocument(pData.docType, pData.docValue)
		emailVO, _ := domain.NewEmail(pData.email)

		patient, err := domain.NewPatient(tenantID, nameVO, docVO, emailVO)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al instanciar paciente del demo: " + err.Error()})
			return
		}

		err = patientRepo.Save(ctx, patient)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al guardar paciente del demo: " + err.Error()})
			return
		}
		patientIDs = append(patientIDs, patient.ID())
	}

	// 5. Inyectar 2 Citas Médicas para Hoy en el Futuro
	doctorID := createdUsers["dr.smith@clinicalyx.com"]
	now := time.Now()
	start1 := now.Add(1 * time.Hour).Truncate(time.Minute)
	end1 := start1.Add(30 * time.Minute)
	start2 := now.Add(2 * time.Hour).Truncate(time.Minute)
	end2 := start2.Add(30 * time.Minute)

	appointmentsToCreate := []struct {
		patientID domain.PatientID
		start     time.Time
		end       time.Time
	}{
		{
			patientID: patientIDs[0],
			start:     start1,
			end:       end1,
		},
		{
			patientID: patientIDs[1],
			start:     start2,
			end:       end2,
		},
	}

	for i, apptData := range appointmentsToCreate {
		appt, err := domain.NewAppointment(
			tenantID,
			apptData.patientID,
			doctorID,
			apptData.start,
			apptData.end,
		)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al instanciar cita del demo: " + err.Error()})
			return
		}

		err = appointmentRepo.Save(ctx, appt)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": fmt.Sprintf("Error al guardar la cita %d del demo: %v", i+1, err)})
			return
		}
	}

	// 6. Iniciar Sesión de forma automática para el DOCTOR
	sessionID := uuid.New().String()
	sessionExpiresAt := time.Now().Add(7 * 24 * time.Hour)

	err = h.sessionRepo.CreateSession(ctx, sessionID, doctorID, tenantID, sessionExpiresAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al persistir sesión de demo: " + err.Error()})
		return
	}

	accessToken, err := h.jwtService.GenerateAccessToken(doctorID, tenantID, domain.UserRoleDoctor, sessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al generar token de acceso de demo"})
		return
	}

	refreshToken, err := h.jwtService.GenerateRefreshToken(doctorID, tenantID, sessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al generar token de refresco de demo"})
		return
	}

	// 7. Establecer cookies HTTP-only
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	// 8. Responder JSON de éxito con credenciales y tokens
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":        "success",
		"message":       "Entorno de demostración temporal activado con éxito. Expira en 2 horas.",
		"tenant_id":     tenantID.String(),
		"access_token":  accessToken,
		"refresh_token": refreshToken,
		"credentials": map[string]string{
			"admin_email":       "admin@clinicalyx.com",
			"doctor_email":      "dr.smith@clinicalyx.com",
			"receptionist_email": "frontdesk@clinicalyx.com",
			"password":          "password123",
		},
	})
}
