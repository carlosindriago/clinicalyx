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

// authenticatedMiddleware simula un usuario autenticado con el rol indicado
// y un UserID aleatorio. Se usa en los tests de los handlers clínicos
// para que el middleware RequireRole tenga un rol en el contexto y los
// handlers que requieren UserID también lo tengan disponible.
func authenticatedMiddleware(role domain.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := withRole(r.Context(), role)
			ctx = withUserID(ctx, domain.NewUserID())
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func TestPatientHandler_CreatePatient(t *testing.T) {
	tenantID := uuid.New().String()

	t.Run("Creación exitosa de paciente", func(t *testing.T) {
		repo := &MockPatientRepository{}
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

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
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

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
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

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
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

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

		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

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

func TestPatientHandler_GetPatients(t *testing.T) {
	tenantID := uuid.New().String()

	t.Run("Búsqueda exitosa por Blind Index (devuelve array con paciente)", func(t *testing.T) {
		repo := &MockPatientRepository{}
		tID, _ := domain.ParseTenantID(tenantID)
		nameVO, _ := domain.NewFullName("Carlos Pérez")
		docVO, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
		emailVO, _ := domain.NewEmail("carlos@clinicalyx.com")
		existingP, _ := domain.NewPatient(tID, nameVO, docVO, emailVO)
		repo.patients = append(repo.patients, existingP)

		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients?document_id=12345678", nil)
		req.Header.Set("X-Tenant-ID", tenantID)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("se esperaba status 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}

		var resp []usecases.PatientResponse
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("error decodificando respuesta: %v", err)
		}

		if len(resp) != 1 {
			t.Fatalf("se esperaba 1 paciente, se obtuvieron %d", len(resp))
		}

		if resp[0].Name != "Carlos Pérez" || resp[0].DocumentValue != "12345678" {
			t.Errorf("datos del paciente no coinciden. Obtenido: %+v", resp[0])
		}
	})

	t.Run("Búsqueda por documento no existente (devuelve array vacío)", func(t *testing.T) {
		repo := &MockPatientRepository{}
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients?document_id=99999999", nil)
		req.Header.Set("X-Tenant-ID", tenantID)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("se esperaba status 200, se obtuvo %d", w.Code)
		}

		var resp []usecases.PatientResponse
		_ = json.Unmarshal(w.Body.Bytes(), &resp)
		if len(resp) != 0 {
			t.Errorf("se esperaba array vacío, se obtuvieron %d elementos", len(resp))
		}
	})
}

func TestPatientHandler_GetPatientByID(t *testing.T) {
	tenantID := uuid.New().String()

	t.Run("Obtención exitosa por ID", func(t *testing.T) {
		repo := &MockPatientRepository{}
		tID, _ := domain.ParseTenantID(tenantID)
		nameVO, _ := domain.NewFullName("Carlos Pérez")
		docVO, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
		emailVO, _ := domain.NewEmail("carlos@clinicalyx.com")
		existingP, _ := domain.NewPatient(tID, nameVO, docVO, emailVO)
		repo.patients = append(repo.patients, existingP)

		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients/"+existingP.ID().String(), nil)
		req.Header.Set("X-Tenant-ID", tenantID)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("se esperaba status 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}

		var resp usecases.PatientResponse
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("error decodificando respuesta: %v", err)
		}

		if resp.ID != existingP.ID().String() || resp.Name != "Carlos Pérez" {
			t.Errorf("datos del paciente no coinciden. Obtenido: %+v", resp)
		}
	})

	t.Run("ID de paciente no encontrado (404 Not Found)", func(t *testing.T) {
		repo := &MockPatientRepository{}
		createUC := usecases.NewCreatePatientUseCase(repo)
		getUC := usecases.NewGetPatientUseCase(repo)
		handler := NewPatientHandler(createUC, getUC)

		r := chi.NewRouter()
		// Autenticación simulada: inyecta un rol clínico válido en el contexto
		// para que RequireRole (capa perimetral) permita el paso.
		authMW := authenticatedMiddleware(domain.UserRoleReceptionist)
		handler.RegisterRoutes(r, authMW)

		req, _ := http.NewRequest(http.MethodGet, "/api/v1/patients/"+uuid.New().String(), nil)
		req.Header.Set("X-Tenant-ID", tenantID)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("se esperaba status 404, se obtuvo %d", w.Code)
		}
	})
}
