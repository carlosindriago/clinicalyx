package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// MockAppointmentRepositoryHTTP implementa ports.AppointmentRepository en memoria para pruebas HTTP.
type MockAppointmentRepositoryHTTP struct {
	appointments map[string]*domain.Appointment
	overlap      bool
	saveErr      error
	overlapErr   error
	updateErr    error
}

func (m *MockAppointmentRepositoryHTTP) Save(ctx context.Context, appt *domain.Appointment) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.appointments[appt.ID().String()] = appt
	return nil
}

func (m *MockAppointmentRepositoryHTTP) HasOverlap(
	ctx context.Context,
	tenantID domain.TenantID,
	doctorID domain.UserID,
	start time.Time,
	end time.Time,
) (bool, error) {
	if m.overlapErr != nil {
		return false, m.overlapErr
	}
	return m.overlap, nil
}

func (m *MockAppointmentRepositoryHTTP) UpdateStatus(
	ctx context.Context,
	tenantID domain.TenantID,
	id domain.AppointmentID,
	status domain.AppointmentStatus,
) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	appt, exists := m.appointments[id.String()]
	if !exists {
		return domain.ErrAppointmentNotFound
	}

	updated, _ := domain.UnmarshalAppointment(
		appt.ID(),
		appt.TenantID(),
		appt.PatientID(),
		appt.DoctorID(),
		appt.StartTime(),
		appt.EndTime(),
		status,
		appt.CreatedAt(),
		time.Now(),
	)
	m.appointments[id.String()] = updated
	return nil
}

// MockPatientRepositoryHTTP implementa ports.PatientRepository en memoria.
type MockPatientRepositoryHTTP struct {
	patients map[string]*domain.Patient
	findErr  error
}

func (m *MockPatientRepositoryHTTP) Save(ctx context.Context, patient *domain.Patient) error {
	m.patients[patient.ID().String()] = patient
	return nil
}

func (m *MockPatientRepositoryHTTP) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	p, exists := m.patients[id.String()]
	if !exists || p.TenantID() != tenantID {
		return nil, nil
	}
	return p, nil
}

func (m *MockPatientRepositoryHTTP) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	return nil, nil
}

// MockSessionRepositoryHTTP implementa ports.SessionRepository.
type MockSessionRepositoryHTTP struct {
	sessions map[string]bool
}

func (m *MockSessionRepositoryHTTP) CreateSession(ctx context.Context, sessionID string, userID domain.UserID, tenantID domain.TenantID, expiresAt time.Time) error {
	m.sessions[sessionID] = false
	return nil
}

func (m *MockSessionRepositoryHTTP) RevokeSession(ctx context.Context, sessionID string, tenantID domain.TenantID) error {
	m.sessions[sessionID] = true
	return nil
}

func (m *MockSessionRepositoryHTTP) IsRevoked(ctx context.Context, sessionID string, tenantID domain.TenantID) (bool, error) {
	revoked, exists := m.sessions[sessionID]
	if !exists {
		return true, nil
	}
	return revoked, nil
}

func TestAppointmentHandler_HTTP(t *testing.T) {
	tenantID := domain.NewTenantID()
	patientID := domain.NewPatientID()
	doctorID := domain.NewUserID()

	// 1. Configurar Mocks e Inyectores de Infraestructura
	patientRepo := &MockPatientRepositoryHTTP{patients: make(map[string]*domain.Patient)}
	apptRepo := &MockAppointmentRepositoryHTTP{appointments: make(map[string]*domain.Appointment)}
	sessionRepo := &MockSessionRepositoryHTTP{sessions: make(map[string]bool)}

	// Pre-registrar paciente en mock repo para pasar validación de existencia
	pName, _ := domain.NewFullName("Juan Perez")
	pDoc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	pEmail, _ := domain.NewEmail("juan@perez.com")
	patient := domain.UnmarshalPatient(patientID, tenantID, pName, pDoc, pEmail)
	patientRepo.patients[patientID.String()] = patient

	// Configurar JWT para AuthMiddleware
	jwtSecret := "thisisaverysecretkey32byteslong!"
	jwtService := crypto.NewJWTService(jwtSecret, 15*time.Minute, 24*time.Hour)
	authMiddleware := NewAuthMiddleware(jwtService, sessionRepo)

	// Crear token válido de doctor/usuario
	sessionID := "sess_12345"
	sessionRepo.sessions[sessionID] = false // Activa
	token, err := jwtService.GenerateAccessToken(doctorID, tenantID, domain.UserRoleDoctor, sessionID)
	if err != nil {
		t.Fatalf("error generando token: %v", err)
	}

	// 2. Instanciar Casos de Uso y Handler
	scheduleUC := usecases.NewScheduleAppointmentUseCase(apptRepo, patientRepo)
	cancelUC := usecases.NewCancelAppointmentUseCase(apptRepo)
	handler := NewAppointmentHandler(scheduleUC, cancelUC, authMiddleware)

	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	t.Run("Agendar cita exitosamente (201 Created)", func(t *testing.T) {
		apptRepo.overlap = false
		apptRepo.saveErr = nil

		startTime := time.Now().Add(2 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		body := ScheduleAppointmentRequest{
			DoctorID:  doctorID.String(),
			StartTime: startTime,
			EndTime:   endTime,
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients/"+patientID.String()+"/appointments", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID.String())
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("se esperaba código 201, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}

		var resp map[string]string
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if _, err := uuid.Parse(resp["id"]); err != nil {
			t.Errorf("se esperaba un ID UUID válido, se obtuvo %q", resp["id"])
		}
	})

	t.Run("Agendar cita falla por colisión de agenda (409 Conflict)", func(t *testing.T) {
		apptRepo.overlap = true

		startTime := time.Now().Add(4 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		body := ScheduleAppointmentRequest{
			DoctorID:  doctorID.String(),
			StartTime: startTime,
			EndTime:   endTime,
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients/"+patientID.String()+"/appointments", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID.String())
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusConflict {
			t.Errorf("se esperaba código 409, se obtuvo %d", w.Code)
		}
	})

	t.Run("Cancelar cita exitosamente (200 OK)", func(t *testing.T) {
		apptID := domain.NewAppointmentID()
		startTime := time.Now().Add(5 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		// Pre-cargar cita para cancelar
		appt, _ := domain.UnmarshalAppointment(apptID, tenantID, patientID, doctorID, startTime, endTime, domain.AppointmentStatusScheduled, time.Now(), time.Now())
		apptRepo.appointments[apptID.String()] = appt
		apptRepo.updateErr = nil

		req, _ := http.NewRequest(http.MethodPatch, "/api/v1/appointments/"+apptID.String()+"/cancel", nil)
		req.Header.Set("X-Tenant-ID", tenantID.String())
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("se esperaba código 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Cancelar cita inexistente retorna error (404 Not Found)", func(t *testing.T) {
		nonExistentID := domain.NewAppointmentID()

		req, _ := http.NewRequest(http.MethodPatch, "/api/v1/appointments/"+nonExistentID.String()+"/cancel", nil)
		req.Header.Set("X-Tenant-ID", tenantID.String())
		req.Header.Set("Authorization", "Bearer "+token)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("se esperaba código 404, se obtuvo %d", w.Code)
		}
	})
}
