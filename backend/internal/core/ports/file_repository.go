package ports

import (
	"context"
	"clinicalyx/backend/internal/core/domain"
)

// FileRepository define el contrato para la persistencia de metadatos de archivos médicos
type FileRepository interface {
	// Save guarda los metadatos de un archivo médico en la base de datos
	Save(ctx context.Context, tenantID domain.TenantID, file *domain.MedicalFile) error

	// FindByPatientID recupera todos los archivos médicos asociados a un paciente específico
	FindByPatientID(ctx context.Context, tenantID domain.TenantID, patientID domain.PatientID) ([]*domain.MedicalFile, error)
}