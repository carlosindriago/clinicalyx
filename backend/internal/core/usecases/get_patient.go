package usecases

import (
	"context"
	"errors"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

var (
	ErrPatientNotFound = errors.New("paciente no encontrado")
)

// PatientResponse representa el DTO de salida para los datos del paciente descifrados.
type PatientResponse struct {
	ID            string `json:"id"`
	TenantID      string `json:"tenant_id"`
	Name          string `json:"name"`
	DocumentType  string `json:"document_type"`
	DocumentValue string `json:"document_value"`
	Email         string `json:"email"`
}

// GetPatientUseCase orquesta la obtención y búsqueda de pacientes aplicando el aislamiento del tenant.
type GetPatientUseCase struct {
	repo ports.PatientRepository
}

// NewGetPatientUseCase inicializa el caso de uso.
func NewGetPatientUseCase(repo ports.PatientRepository) *GetPatientUseCase {
	return &GetPatientUseCase{repo: repo}
}

// GetByID busca un paciente por su ID y valida que pertenezca al Tenant inyectado en la sesión.
func (uc *GetPatientUseCase) GetByID(ctx context.Context, tenantIDStr, patientIDStr string) (PatientResponse, error) {
	tenantID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return PatientResponse{}, err
	}

	patientID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		return PatientResponse{}, err
	}

	patient, err := uc.repo.FindByID(ctx, tenantID, patientID)
	if err != nil {
		return PatientResponse{}, err
	}
	if patient == nil {
		return PatientResponse{}, ErrPatientNotFound
	}

	return PatientResponse{
		ID:            patient.ID().String(),
		TenantID:      patient.TenantID().String(),
		Name:          patient.Name().Value(),
		DocumentType:  string(patient.Document().Type()),
		DocumentValue: patient.Document().Value(),
		Email:         patient.Email().Value(),
	}, nil
}

// GetByDocument busca un paciente por su documento de identidad. Intenta buscarlo como DNI
// y como PASSPORT debido a que la interfaz expone la búsqueda exacta por tipo y valor.
func (uc *GetPatientUseCase) GetByDocument(ctx context.Context, tenantIDStr, docValue string) (PatientResponse, error) {
	tenantID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return PatientResponse{}, err
	}

	// 1. Probar búsqueda exacta con tipo DNI
	patient, err := uc.repo.FindByDocument(ctx, tenantID, domain.DocumentTypeDNI, docValue)
	if err != nil {
		return PatientResponse{}, err
	}
	if patient != nil {
		return PatientResponse{
			ID:            patient.ID().String(),
			TenantID:      patient.TenantID().String(),
			Name:          patient.Name().Value(),
			DocumentType:  string(patient.Document().Type()),
			DocumentValue: patient.Document().Value(),
			Email:         patient.Email().Value(),
		}, nil
	}

	// 2. Probar búsqueda exacta con tipo PASSPORT (si falla o retorna nil)
	patient, err = uc.repo.FindByDocument(ctx, tenantID, domain.DocumentTypePassport, docValue)
	if err != nil {
		return PatientResponse{}, err
	}
	if patient != nil {
		return PatientResponse{
			ID:            patient.ID().String(),
			TenantID:      patient.TenantID().String(),
			Name:          patient.Name().Value(),
			DocumentType:  string(patient.Document().Type()),
			DocumentValue: patient.Document().Value(),
			Email:         patient.Email().Value(),
		}, nil
	}

	return PatientResponse{}, ErrPatientNotFound
}
