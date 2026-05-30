package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// MockPatientRepository implementa ports.PatientRepository en memoria para tests.
type MockPatientRepository struct {
	patients []*domain.Patient
	saveErr  error
	findErr  error
}

func (m *MockPatientRepository) Save(ctx context.Context, patient *domain.Patient) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.patients = append(m.patients, patient)
	return nil
}

func (m *MockPatientRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	for _, p := range m.patients {
		if p.TenantID() == tenantID && p.ID() == id {
			return p, nil
		}
	}
	return nil, nil
}

func (m *MockPatientRepository) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	for _, p := range m.patients {
		if p.TenantID() == tenantID && p.Document().Type() == docType && p.Document().Value() == docValue {
			return p, nil
		}
	}
	return nil, nil
}

func TestPatientHandler_CreatePatient(t *testing.T) {
	tenantID := uuid.New().String()

	t.Run("Creación exitosa de paciente", func(t *testing.T) {
		repo := &MockPatientRepository{}
		useCase := usecases.NewCreatePatientUseCase(repo)
		handler := NewPatientHandler(useCase)

		r := chi.NewRouter()
		handler.RegisterRoutes(r)

		body := map[string]string{
			"name":           "Carlos Pérez",
			"document_type":  "DNI",
			"document_value": "12345678",
			"email":          "carlos@clinicalyx.com",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("se esperaba status 201, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}

		var resp map[string]string
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("error decodificando respuesta: %v", err)
		}

		if _, err := uuid.Parse(resp["id"]); err != nil {
			t.Errorf("se esperaba un ID UUID válido en la respuesta, se obtuvo %q", resp["id"])
		}
	})

	t.Run("Falta header X-Tenant-ID", func(t *testing.T) {
		repo := &MockPatientRepository{}
		useCase := usecases.NewCreatePatientUseCase(repo)
		handler := NewPatientHandler(useCase)

		r := chi.NewRouter()
		handler.RegisterRoutes(r)

		body := map[string]string{
			"name":           "Carlos Pérez",
			"document_type":  "DNI",
			"document_value": "12345678",
			"email":          "carlos@clinicalyx.com",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("se esperaba status 400, se obtuvo %d", w.Code)
		}
	})

	t.Run("Header X-Tenant-ID inválido (no UUID)", func(t *testing.T) {
		repo := &MockPatientRepository{}
		useCase := usecases.NewCreatePatientUseCase(repo)
		handler := NewPatientHandler(useCase)

		r := chi.NewRouter()
		handler.RegisterRoutes(r)

		body := map[string]string{
			"name":           "Carlos Pérez",
			"document_type":  "DNI",
			"document_value": "12345678",
			"email":          "carlos@clinicalyx.com",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", "123-no-soy-uuid")
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("se esperaba status 400, se obtuvo %d", w.Code)
		}
	})

	t.Run("Validación fallida por datos incorrectos", func(t *testing.T) {
		repo := &MockPatientRepository{}
		useCase := usecases.NewCreatePatientUseCase(repo)
		handler := NewPatientHandler(useCase)

		r := chi.NewRouter()
		handler.RegisterRoutes(r)

		body := map[string]string{
			"name":           "Carlos Pérez",
			"document_type":  "DNI",
			"document_value": "12345678",
			"email":          "email-invalido", // email inválido
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Errorf("se esperaba status 400, se obtuvo %d", w.Code)
		}
	})

	t.Run("Paciente duplicado (Conflict)", func(t *testing.T) {
		repo := &MockPatientRepository{}
		// Pre-registrar un paciente idéntico en el mock para gatillar duplicado
		tID, _ := domain.ParseTenantID(tenantID)
		nameVO, _ := domain.NewFullName("Carlos Pérez")
		docVO, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
		emailVO, _ := domain.NewEmail("carlos@clinicalyx.com")
		existingP, _ := domain.NewPatient(tID, nameVO, docVO, emailVO)
		repo.patients = append(repo.patients, existingP)

		useCase := usecases.NewCreatePatientUseCase(repo)
		handler := NewPatientHandler(useCase)

		r := chi.NewRouter()
		handler.RegisterRoutes(r)

		body := map[string]string{
			"name":           "Carlos Pérez",
			"document_type":  "DNI",
			"document_value": "12345678",
			"email":          "carlos@clinicalyx.com",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/patients", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusConflict {
			t.Errorf("se esperaba status 409 (Conflict), se obtuvo %d", w.Code)
		}
	})
}
