package usecases

import (
	"context"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// ScheduleAppointmentDTO define los parámetros de entrada para agendar una cita.
type ScheduleAppointmentDTO struct {
	TenantID  string
	PatientID string
	DoctorID  string
	StartTime time.Time
	EndTime   time.Time
}

// ScheduleAppointmentResponse contiene el ID de la cita recién creada.
type ScheduleAppointmentResponse struct {
	ID string
}

// ScheduleAppointmentUseCase orquesta el flujo para validar y programar una cita en la agenda.
type ScheduleAppointmentUseCase struct {
	appointmentRepo ports.AppointmentRepository
	patientRepo      ports.PatientRepository
}

// NewScheduleAppointmentUseCase construye el caso de uso con sus dependencias inyectadas.
func NewScheduleAppointmentUseCase(
	appointmentRepo ports.AppointmentRepository,
	patientRepo ports.PatientRepository,
) *ScheduleAppointmentUseCase {
	return &ScheduleAppointmentUseCase{
		appointmentRepo: appointmentRepo,
		patientRepo:      patientRepo,
	}
}

// Execute valida pre-condiciones, disponibilidad del doctor y persiste la cita si no hay colisión.
func (uc *ScheduleAppointmentUseCase) Execute(
	ctx context.Context,
	dto ScheduleAppointmentDTO,
) (ScheduleAppointmentResponse, error) {
	// 1. Validar e instanciar identificadores de dominio
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}

	patientID, err := domain.ParsePatientID(dto.PatientID)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}

	doctorID, err := domain.ParseUserID(dto.DoctorID)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}

	// 2. Verificar que el paciente exista
	patient, err := uc.patientRepo.FindByID(ctx, tenantID, patientID)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}
	if patient == nil {
		return ScheduleAppointmentResponse{}, domain.ErrPatientNotFound
	}

	// 3. Validar colisión de agenda (solapamiento) para el médico en el rango seleccionado
	overlap, err := uc.appointmentRepo.HasOverlap(ctx, tenantID, doctorID, dto.StartTime, dto.EndTime)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}
	if overlap {
		return ScheduleAppointmentResponse{}, domain.ErrDoctorNotAvailable
	}

	// 4. Instanciar la entidad del dominio (ejecuta validaciones temporales e inicializa en SCHEDULED)
	appt, err := domain.NewAppointment(
		tenantID,
		patientID,
		doctorID,
		dto.StartTime,
		dto.EndTime,
	)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}

	// 5. Persistir la cita agendada
	err = uc.appointmentRepo.Save(ctx, appt)
	if err != nil {
		return ScheduleAppointmentResponse{}, err
	}

	return ScheduleAppointmentResponse{
		ID: appt.ID().String(),
	}, nil
}
