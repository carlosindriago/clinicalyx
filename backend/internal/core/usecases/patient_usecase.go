package usecases

import (
	"context"
	"errors"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// Errores específicos de los Casos de Uso de Pacientes.
var (
	ErrPatientAlreadyExists = errors.New("ya existe un paciente registrado con este documento de identidad")
)

// CreatePatientDTO contiene los datos requeridos para registrar un paciente.
type CreatePatientDTO struct {
	TenantID      string
	Name          string
	DocumentType  string
	DocumentValue string
	Email         string
}

// CreatePatientResponse contiene los datos de retorno tras registrar un paciente.
type CreatePatientResponse struct {
	ID string
}

// CreatePatientUseCase orquesta el flujo de negocio para registrar nuevos pacientes.
type CreatePatientUseCase struct {
	repo ports.PatientRepository
}

// NewCreatePatientUseCase inicializa el caso de uso con su puerto de salida.
func NewCreatePatientUseCase(repo ports.PatientRepository) *CreatePatientUseCase {
	return &CreatePatientUseCase{repo: repo}
}

// Execute valida las reglas de negocio, verifica la existencia de duplicados y persiste el nuevo paciente.
func (uc *CreatePatientUseCase) Execute(ctx context.Context, dto CreatePatientDTO) (CreatePatientResponse, error) {
	// 1. Validar e instanciar Value Objects
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	fullName, err := domain.NewFullName(dto.Name)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	docType := domain.DocumentType(dto.DocumentType)
	document, err := domain.NewDocument(docType, dto.DocumentValue)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	email, err := domain.NewEmail(dto.Email)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	// 2. Comprobar si ya existe un paciente con el mismo documento en este tenant
	existing, err := uc.repo.FindByDocument(ctx, tenantID, document.Type(), document.Value())
	if err != nil {
		return CreatePatientResponse{}, err
	}
	if existing != nil {
		return CreatePatientResponse{}, ErrPatientAlreadyExists
	}

	// 3. Crear la entidad Patient (se genera el ID del dominio y valida el estado completo)
	patient, err := domain.NewPatient(tenantID, fullName, document, email)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	// 4. Persistir a través del adaptador (implementando el puerto)
	err = uc.repo.Save(ctx, patient)
	if err != nil {
		return CreatePatientResponse{}, err
	}

	return CreatePatientResponse{
		ID: patient.ID().String(),
	}, nil
}
