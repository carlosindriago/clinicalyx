package usecases

import (
	"context"
	"encoding/json"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// RecordConsultationDTO define la estructura de entrada para registrar una consulta.
type RecordConsultationDTO struct {
	TenantID      string
	PatientID     string
	DoctorID      string
	Date          time.Time
	DiagnosticCode string
	Notes         string
	Metadata       json.RawMessage
}

// RecordConsultationResponse contiene el ID del registro de consulta creado.
type RecordConsultationResponse struct {
	ID string
}

// RecordConsultationUseCase orquesta el registro de una consulta validando pre-condiciones clínicas.
type RecordConsultationUseCase struct {
	consultationRepo ports.ConsultationRepository
	patientRepo      ports.PatientRepository
}

// NewRecordConsultationUseCase inicializa el caso de uso con sus repositorios dependientes.
func NewRecordConsultationUseCase(
	consultationRepo ports.ConsultationRepository,
	patientRepo ports.PatientRepository,
) *RecordConsultationUseCase {
	return &RecordConsultationUseCase{
		consultationRepo: consultationRepo,
		patientRepo:      patientRepo,
	}
}

// Execute valida reglas, comprueba la existencia del paciente y persiste el registro.
func (uc *RecordConsultationUseCase) Execute(ctx context.Context, dto RecordConsultationDTO) (RecordConsultationResponse, error) {
	// 1. Validar e instanciar identificadores de dominio
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return RecordConsultationResponse{}, err
	}

	patientID, err := domain.ParsePatientID(dto.PatientID)
	if err != nil {
		return RecordConsultationResponse{}, err
	}

	doctorID, err := domain.ParseUserID(dto.DoctorID)
	if err != nil {
		return RecordConsultationResponse{}, err
	}

	// 2. Validar que el PatientID exista en el tenant
	patient, err := uc.patientRepo.FindByID(ctx, tenantID, patientID)
	if err != nil {
		return RecordConsultationResponse{}, err
	}
	if patient == nil {
		return RecordConsultationResponse{}, domain.ErrPatientNotFound
	}

	// 3. Crear el Agregado de Consulta (ejecuta validaciones internas del dominio)
	consultation, err := domain.NewConsultation(
		tenantID,
		patientID,
		doctorID,
		dto.Date,
		dto.DiagnosticCode,
		dto.Notes,
		dto.Metadata,
	)
	if err != nil {
		return RecordConsultationResponse{}, err
	}

	// 4. Persistir la consulta
	err = uc.consultationRepo.Save(ctx, consultation)
	if err != nil {
		return RecordConsultationResponse{}, err
	}

	return RecordConsultationResponse{
		ID: consultation.ID().String(),
	}, nil
}
