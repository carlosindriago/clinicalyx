package http

import (
	"context"
	"net/http"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// newConsultationHandlerForTest construye un ConsultationHandler con un
// authMiddleware intercambiable para tests de integración de RBAC.
func newConsultationHandlerForTest(
	recordUC *usecases.RecordConsultationUseCase,
	historyUC *usecases.GetConsultationHistoryUseCase,
	authMW func(http.Handler) http.Handler,
) *ConsultationHandler {
	return &ConsultationHandler{
		recordConsultationUC:    recordUC,
		getConsultationHistoryUC: historyUC,
		authMiddleware: &AuthMiddleware{
			jwtService:  nil,
			sessionRepo: nil,
		},
		testAuthMW: authMW,
	}
}

// registerRoutes duplica la lógica de RegisterRoutes original pero permite
// usar el testAuthMW inyectado. Solo debe usarse en tests.
func (h *ConsultationHandler) registerRoutes(r chi.Router) {
	authHandler := h.authMiddleware.Handler
	if h.testAuthMW != nil {
		authHandler = h.testAuthMW
	}
	recordHandler := RequireRole(domain.UserRoleDoctor, domain.UserRoleSuperAdmin)(http.HandlerFunc(h.RecordConsultation))
	historyHandler := RequireRole(domain.UserRoleDoctor, domain.UserRoleNurse, domain.UserRoleReceptionist, domain.UserRoleSuperAdmin)(http.HandlerFunc(h.GetConsultationHistory))

	r.Route("/api/v1/patients/{patient_id}/consultations", func(r chi.Router) {
		r.Use(TenantExtractor)
		r.Use(authHandler)
		r.Post("/", recordHandler.ServeHTTP)
		r.Get("/", historyHandler.ServeHTTP)
	})
}

// MockConsultationRepository es un mock mínimo para tests de RBAC. Las
// pruebas deben terminar ANTES de invocar el repositorio (en el middleware
// RequireRole), por lo que los métodos no necesitan lógica real.
type MockConsultationRepository struct {
	records []*domain.Consultation
}

func (m *MockConsultationRepository) Save(ctx context.Context, c *domain.Consultation) error {
	m.records = append(m.records, c)
	return nil
}

func (m *MockConsultationRepository) ListByPatientID(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
	limit, offset int,
) ([]*domain.Consultation, error) {
	return []*domain.Consultation{}, nil
}

// newRecordConsultationUCForTest y newGetConsultationHistoryUCForTest crean
// los casos de uso con mocks. El orden de argumentos en producción es
// (consultationRepo, patientRepo); los helpers lo reflejan.
func newRecordConsultationUCForTest(c ports.ConsultationRepository, p ports.PatientRepository) *usecases.RecordConsultationUseCase {
	return usecases.NewRecordConsultationUseCase(c, p)
}

func newGetConsultationHistoryUCForTest(c ports.ConsultationRepository, p ports.PatientRepository) *usecases.GetConsultationHistoryUseCase {
	return usecases.NewGetConsultationHistoryUseCase(c, p)
}
