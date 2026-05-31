package domain

import (
	"time"
)

// AppointmentStatus define los posibles estados de una cita médica.
type AppointmentStatus string

const (
	AppointmentStatusScheduled AppointmentStatus = "SCHEDULED"
	AppointmentStatusCompleted AppointmentStatus = "COMPLETED"
	AppointmentStatusCanceled  AppointmentStatus = "CANCELED"
)

// IsValid verifica si el estado del AppointmentStatus es permitido.
func (s AppointmentStatus) IsValid() bool {
	switch s {
	case AppointmentStatusScheduled, AppointmentStatusCompleted, AppointmentStatusCanceled:
		return true
	default:
		return false
	}
}

// Appointment representa la entidad Agregada de una cita médica en la agenda.
type Appointment struct {
	id        AppointmentID
	tenantID  TenantID
	patientID PatientID
	doctorID  UserID
	startTime time.Time
	endTime   time.Time
	status    AppointmentStatus
	createdAt time.Time
	updatedAt time.Time
}

// NewAppointment crea e inicializa una cita médica validando las restricciones de tiempo y negocio.
func NewAppointment(
	tenantID TenantID,
	patientID PatientID,
	doctorID UserID,
	startTime time.Time,
	endTime time.Time,
) (*Appointment, error) {
	if tenantID.IsNil() {
		return nil, ErrMissingTenantID
	}
	if patientID.IsNil() {
		return nil, ErrInvalidPatientID
	}
	if doctorID.IsNil() {
		return nil, ErrInvalidUserID
	}

	// Regla de negocio: EndTime debe ser estrictamente posterior a StartTime
	if !endTime.After(startTime) {
		return nil, ErrInvalidTimeRange
	}

	// Regla de negocio: StartTime no puede ser en el pasado (tolerancia de 5 segundos para pruebas)
	if startTime.Before(time.Now().Add(-5 * time.Second)) {
		return nil, ErrPastAppointment
	}

	now := time.Now()

	return &Appointment{
		id:        NewAppointmentID(),
		tenantID:  tenantID,
		patientID: patientID,
		doctorID:  doctorID,
		startTime: startTime,
		endTime:   endTime,
		status:    AppointmentStatusScheduled,
		createdAt: now,
		updatedAt: now,
	}, nil
}

// UnmarshalAppointment reconstituye una cita médica existente desde la persistencia.
func UnmarshalAppointment(
	id AppointmentID,
	tenantID TenantID,
	patientID PatientID,
	doctorID UserID,
	startTime time.Time,
	endTime time.Time,
	status AppointmentStatus,
	createdAt time.Time,
	updatedAt time.Time,
) (*Appointment, error) {
	if !status.IsValid() {
		return nil, ErrInvalidAppointmentStatus
	}
	return &Appointment{
		id:        id,
		tenantID:  tenantID,
		patientID: patientID,
		doctorID:  doctorID,
		startTime: startTime,
		endTime:   endTime,
		status:    status,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}, nil
}

// Getters
func (a *Appointment) ID() AppointmentID          { return a.id }
func (a *Appointment) TenantID() TenantID        { return a.tenantID }
func (a *Appointment) PatientID() PatientID      { return a.patientID }
func (a *Appointment) DoctorID() UserID          { return a.doctorID }
func (a *Appointment) StartTime() time.Time      { return a.startTime }
func (a *Appointment) EndTime() time.Time        { return a.endTime }
func (a *Appointment) Status() AppointmentStatus { return a.status }
func (a *Appointment) CreatedAt() time.Time      { return a.createdAt }
func (a *Appointment) UpdatedAt() time.Time      { return a.updatedAt }
