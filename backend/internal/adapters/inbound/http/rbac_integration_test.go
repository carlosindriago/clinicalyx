package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"clinicalyx/backend/internal/core/domain"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// TestRequireRole_OverConsultationRoutes verifica que el middleware
// RequireRole aplicado a nivel de ruta bloquea correctamente roles no
// autorizados para el módulo de consultas clínicas.
//
// Receptionist NO debe poder REGISTRAR una consulta (POST → 403) pero
// SÍ debe poder ver el historial (GET → 200). Doctor debe poder ambas.
func TestRequireRole_OverConsultationRoutes(t *testing.T) {
	tenantID := uuid.New().String()

	// Mock de PatientRepository que devuelve un paciente válido
	// para que el caso de uso pase su primera validación.
	tenantIDVO, _ := domain.ParseTenantID(tenantID)
	nameVO, _ := domain.NewFullName("Juan")
	docVO, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	emailVO, _ := domain.NewEmail("juan@test.com")
	patient, _ := domain.NewPatient(tenantIDVO, nameVO, docVO, emailVO)
	// Usar el ID real del paciente mockeado para que el handler lo encuentre.
	patientID := patient.ID().String()
	patientRepo := &MockPatientRepository{patients: []*domain.Patient{patient}}

	// Mock de ConsultationRepository que no hace nada: la prueba
	// debe terminar ANTES de invocarlo, gracias al middleware RequireRole.
	consultationRepo := &MockConsultationRepository{}

	// Construir el caso de uso real con los mocks
	recordUC := newRecordConsultationUCForTest(consultationRepo, patientRepo)
	historyUC := newGetConsultationHistoryUCForTest(consultationRepo, patientRepo)

	doRequest := func(t *testing.T, role domain.UserRole, method, path string, body string) *httptest.ResponseRecorder {
		t.Helper()
		handler := newConsultationHandlerForTest(recordUC, historyUC, authenticatedMiddleware(role))
		r := chi.NewRouter()
		handler.registerRoutes(r)

		var req *http.Request
		if method == http.MethodPost {
			req = httptest.NewRequest(method, path, strings.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
		} else {
			req = httptest.NewRequest(method, path, nil)
		}
		req.Header.Set("X-Tenant-ID", tenantID)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		return w
	}

	t.Run("Receptionist NO puede REGISTRAR consulta (POST → 403)", func(t *testing.T) {
		w := doRequest(t, domain.UserRoleReceptionist, http.MethodPost,
			"/api/v1/patients/"+patientID+"/consultations",
			`{"diagnostic_code":"J00","notes":"Notas suficientemente largas para validación"}`)
		if w.Code != http.StatusForbidden {
			t.Errorf("se esperaba 403, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Receptionist SÍ puede VER historial (GET → 200)", func(t *testing.T) {
		w := doRequest(t, domain.UserRoleReceptionist, http.MethodGet,
			"/api/v1/patients/"+patientID+"/consultations", "")
		if w.Code != http.StatusOK {
			t.Errorf("se esperaba 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Doctor SÍ puede REGISTRAR consulta (POST → 201)", func(t *testing.T) {
		w := doRequest(t, domain.UserRoleDoctor, http.MethodPost,
			"/api/v1/patients/"+patientID+"/consultations",
			`{"diagnostic_code":"J00","notes":"Notas suficientemente largas para validación"}`)
		if w.Code != http.StatusCreated {
			t.Errorf("se esperaba 201, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})
}
