package ports

import (
	"context"

	"clinicalyx/backend/internal/core/domain"
)

// ConsultationRepository define el puerto de salida para persistir y listar consultas médicas.
type ConsultationRepository interface {
	Save(ctx context.Context, consultation *domain.Consultation) error
	ListByPatientID(ctx context.Context, tenantID domain.TenantID, patientID domain.PatientID, limit int, offset int) ([]*domain.Consultation, error)
}
