package domain

import (
	"github.com/google/uuid"
)

// PatientID es un identificador fuertemente tipado para el paciente.
type PatientID uuid.UUID

// NewPatientID genera un nuevo PatientID (UUIDv4).
func NewPatientID() PatientID {
	return PatientID(uuid.New())
}

// IsNil comprueba si el PatientID es el valor nulo de UUID.
func (id PatientID) IsNil() bool {
	return uuid.UUID(id) == uuid.Nil
}

// String convierte el PatientID a string.
func (id PatientID) String() string {
	return uuid.UUID(id).String()
}

// ParsePatientID intenta parsear un string como PatientID.
func ParsePatientID(s string) (PatientID, error) {
	val, err := uuid.Parse(s)
	if err != nil {
		return PatientID(uuid.Nil), ErrInvalidPatientID
	}
	return PatientID(val), nil
}

// TenantID es un identificador fuertemente tipado para la clínica/tenant.
type TenantID uuid.UUID

// NewTenantID genera un nuevo TenantID (UUIDv4).
func NewTenantID() TenantID {
	return TenantID(uuid.New())
}

// NilTenantID retorna un TenantID vacío (nulo).
func NilTenantID() TenantID {
	return TenantID(uuid.Nil)
}

// IsNil comprueba si el TenantID es el valor nulo de UUID.
func (id TenantID) IsNil() bool {
	return uuid.UUID(id) == uuid.Nil
}

// String convierte el TenantID a string.
func (id TenantID) String() string {
	return uuid.UUID(id).String()
}

// ParseTenantID intenta parsear un string como TenantID.
func ParseTenantID(s string) (TenantID, error) {
	val, err := uuid.Parse(s)
	if err != nil {
		return TenantID(uuid.Nil), ErrMissingTenantID
	}
	return TenantID(val), nil
}

// UserID es un identificador fuertemente tipado para el usuario.
type UserID uuid.UUID

// NewUserID genera un nuevo UserID (UUIDv4).
func NewUserID() UserID {
	return UserID(uuid.New())
}

// IsNil comprueba si el UserID es el valor nulo de UUID.
func (id UserID) IsNil() bool {
	return uuid.UUID(id) == uuid.Nil
}

// String convierte el UserID a string.
func (id UserID) String() string {
	return uuid.UUID(id).String()
}

// ParseUserID intenta parsear un string como UserID.
func ParseUserID(s string) (UserID, error) {
	val, err := uuid.Parse(s)
	if err != nil {
		return UserID(uuid.Nil), ErrInvalidUserID
	}
	return UserID(val), nil
}

// ConsultationID es un identificador fuertemente tipado para la consulta médica.
type ConsultationID uuid.UUID

// NewConsultationID genera un nuevo ConsultationID (UUIDv4).
func NewConsultationID() ConsultationID {
	return ConsultationID(uuid.New())
}

// IsNil comprueba si el ConsultationID es el valor nulo de UUID.
func (id ConsultationID) IsNil() bool {
	return uuid.UUID(id) == uuid.Nil
}

// String convierte el ConsultationID a string.
func (id ConsultationID) String() string {
	return uuid.UUID(id).String()
}

// ParseConsultationID intenta parsear un string como ConsultationID.
func ParseConsultationID(s string) (ConsultationID, error) {
	val, err := uuid.Parse(s)
	if err != nil {
		return ConsultationID(uuid.Nil), ErrInvalidConsultationID
	}
	return ConsultationID(val), nil
}

