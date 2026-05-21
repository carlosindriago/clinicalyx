package ports

import (
	"context"
	"clinicalyx/backend/internal/core/domain"
)

// PatientRepository define el puerto de salida para la persistencia de Pacientes.
type PatientRepository interface {
	Save(ctx context.Context, patient *domain.Patient) error
	FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error)
	FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error)
}
