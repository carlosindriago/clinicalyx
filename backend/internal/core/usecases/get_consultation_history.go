package usecases

import (
	"context"
	"encoding/json"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// GetConsultationHistoryDTO define la estructura de entrada para obtener el historial clínico.
type GetConsultationHistoryDTO struct {
	TenantID  string
	PatientID string
	Limit     int
	Offset    int
}

// ConsultationHistoryResponse contiene la información mapeada para consumo externo.
type ConsultationHistoryResponse struct {
	ID             string          `json:"id"`
	TenantID       string          `json:"tenant_id"`
	PatientID      string          `json:"patient_id"`
	DoctorID       string          `json:"doctor_id"`
	Date           time.Time       `json:"date"`
	DiagnosticCode string          `json:"diagnostic_code"`
	Notes          string          `json:"notes"`
	Metadata       json.RawMessage `json:"metadata"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// GetConsultationHistoryUseCase expone las consultas médicas de un paciente con soporte de paginación.
type GetConsultationHistoryUseCase struct {
	consultationRepo ports.ConsultationRepository
	patientRepo      ports.PatientRepository
}

// NewGetConsultationHistoryUseCase inicializa el caso de uso con sus puertos.
func NewGetConsultationHistoryUseCase(
	consultationRepo ports.ConsultationRepository,
	patientRepo ports.PatientRepository,
) *GetConsultationHistoryUseCase {
	return &GetConsultationHistoryUseCase{
		consultationRepo: consultationRepo,
		patientRepo:      patientRepo,
	}
}

// Execute verifica existencia de paciente y recupera sus consultas paginadas.
func (uc *GetConsultationHistoryUseCase) Execute(
	ctx context.Context,
	dto GetConsultationHistoryDTO,
) ([]ConsultationHistoryResponse, error) {
	// 1. Validar e instanciar identificadores de dominio
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return nil, err
	}

	patientID, err := domain.ParsePatientID(dto.PatientID)
	if err != nil {
		return nil, err
	}

	// 2. Validar existencia del paciente en el tenant
	patient, err := uc.patientRepo.FindByID(ctx, tenantID, patientID)
	if err != nil {
		return nil, err
	}
	if patient == nil {
		return nil, domain.ErrPatientNotFound
	}

	// Ajustar valores por defecto para paginación si fuesen inválidos
	limit := dto.Limit
	if limit <= 0 {
		limit = 10
	}
	offset := dto.Offset
	if offset < 0 {
		offset = 0
	}

	// 3. Consultar historial médico
	consultations, err := uc.consultationRepo.ListByPatientID(ctx, tenantID, patientID, limit, offset)
	if err != nil {
		return nil, err
	}

	// 4. Mapear entidades del dominio a estructuras de respuesta
	response := make([]ConsultationHistoryResponse, len(consultations))
	for i, c := range consultations {
		response[i] = ConsultationHistoryResponse{
			ID:             c.ID().String(),
			TenantID:       c.TenantID().String(),
			PatientID:      c.PatientID().String(),
			DoctorID:       c.DoctorID().String(),
			Date:           c.Date(),
			DiagnosticCode: c.DiagnosticCode(),
			Notes:          c.Notes(),
			Metadata:       c.Metadata(),
			CreatedAt:      c.CreatedAt(),
			UpdatedAt:      c.UpdatedAt(),
		}
	}

	return response, nil
}
