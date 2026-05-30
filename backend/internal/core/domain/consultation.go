package domain

import (
	"encoding/json"
	"time"
)

// Consultation representa un agregado independiente del registro clínico de una consulta médica.
type Consultation struct {
	id             ConsultationID
	tenantID       TenantID
	patientID      PatientID
	doctorID       UserID
	date           time.Time
	diagnosticCode string
	notes          string
	metadata       json.RawMessage
	createdAt      time.Time
	updatedAt      time.Time
}

// NewConsultation crea una nueva consulta validando las reglas de negocio del dominio clínico.
func NewConsultation(
	tenantID TenantID,
	patientID PatientID,
	doctorID UserID,
	date time.Time,
	diagnosticCode string,
	notes string,
	metadata json.RawMessage,
) (*Consultation, error) {
	if tenantID.IsNil() {
		return nil, ErrMissingTenantID
	}
	if patientID.IsNil() {
		return nil, ErrInvalidPatientID
	}
	if doctorID.IsNil() {
		return nil, ErrInvalidUserID
	}
	if diagnosticCode == "" {
		return nil, ErrEmptyDiagnosticCode
	}
	if notes == "" {
		return nil, ErrEmptyNotes
	}

	// Regla de negocio: la fecha no puede ser en el futuro (tolerancia de 5 segundos para evitar flaky tests)
	if date.After(time.Now().Add(5 * time.Second)) {
		return nil, ErrFutureConsultationDate
	}

	now := time.Now()

	return &Consultation{
		id:             NewConsultationID(),
		tenantID:       tenantID,
		patientID:      patientID,
		doctorID:       doctorID,
		date:           date,
		diagnosticCode: diagnosticCode,
		notes:          notes,
		metadata:       metadata,
		createdAt:      now,
		updatedAt:      now,
	}, nil
}

// UnmarshalConsultation reconstituye una consulta desde la base de datos (capa de infraestructura).
func UnmarshalConsultation(
	id ConsultationID,
	tenantID TenantID,
	patientID PatientID,
	doctorID UserID,
	date time.Time,
	diagnosticCode string,
	notes string,
	metadata json.RawMessage,
	createdAt time.Time,
	updatedAt time.Time,
) *Consultation {
	return &Consultation{
		id:             id,
		tenantID:       tenantID,
		patientID:      patientID,
		doctorID:       doctorID,
		date:           date,
		diagnosticCode: diagnosticCode,
		notes:          notes,
		metadata:       metadata,
		createdAt:      createdAt,
		updatedAt:      updatedAt,
	}
}

// Getters
func (c *Consultation) ID() ConsultationID { return c.id }
func (c *Consultation) TenantID() TenantID { return c.tenantID }
func (c *Consultation) PatientID() PatientID { return c.patientID }
func (c *Consultation) DoctorID() UserID { return c.doctorID }
func (c *Consultation) Date() time.Time { return c.date }
func (c *Consultation) DiagnosticCode() string { return c.diagnosticCode }
func (c *Consultation) Notes() string { return c.notes }
func (c *Consultation) Metadata() json.RawMessage { return c.metadata }
func (c *Consultation) CreatedAt() time.Time { return c.createdAt }
func (c *Consultation) UpdatedAt() time.Time { return c.updatedAt }
