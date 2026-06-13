package usecases

import (
	"context"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// CancelAppointmentDTO define la estructura de entrada para cancelar una cita.
type CancelAppointmentDTO struct {
	TenantID      string
	AppointmentID string
}

// CancelAppointmentUseCase actualiza el estado de una cita médica a CANCELED.
type CancelAppointmentUseCase struct {
	appointmentRepo ports.AppointmentRepository
}

// NewCancelAppointmentUseCase inicializa el caso de uso.
func NewCancelAppointmentUseCase(appointmentRepo ports.AppointmentRepository) *CancelAppointmentUseCase {
	return &CancelAppointmentUseCase{
		appointmentRepo: appointmentRepo,
	}
}

// Execute valida los parámetros y ejecuta la transición de estado en la persistencia.
func (uc *CancelAppointmentUseCase) Execute(ctx context.Context, dto CancelAppointmentDTO) error {
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return err
	}

	apptID, err := domain.ParseAppointmentID(dto.AppointmentID)
	if err != nil {
		return err
	}

	// Transicionar directamente en la persistencia
	err = uc.appointmentRepo.UpdateStatus(ctx, tenantID, apptID, domain.AppointmentStatusCanceled)
	if err != nil {
		return err
	}

	return nil
}
