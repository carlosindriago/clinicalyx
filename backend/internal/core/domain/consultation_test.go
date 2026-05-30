package domain_test

import (
	"encoding/json"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

func TestNewConsultation(t *testing.T) {
	validTenantID := domain.NewTenantID()
	validPatientID := domain.NewPatientID()
	validDoctorID := domain.NewUserID()
	now := time.Now()
	metadata := json.RawMessage(`{"specialty": "cardiology", "blood_pressure": "120/80"}`)

	tests := []struct {
		name           string
		tenantID       domain.TenantID
		patientID      domain.PatientID
		doctorID       domain.UserID
		date           time.Time
		diagnosticCode string
		notes          string
		metadata       json.RawMessage
		expectedErr    error
	}{
		{
			name:           "Creación de consulta válida",
			tenantID:       validTenantID,
			patientID:      validPatientID,
			doctorID:       validDoctorID,
			date:           now,
			diagnosticCode: "CIE-I10",
			notes:          "Paciente estable con presión arterial controlada.",
			metadata:       metadata,
			expectedErr:    nil,
		},
		{
			name:           "Falla con TenantID nulo",
			tenantID:       domain.NilTenantID(),
			patientID:      validPatientID,
			doctorID:       validDoctorID,
			date:           now,
			diagnosticCode: "CIE-I10",
			notes:          "Paciente estable.",
			metadata:       metadata,
			expectedErr:    domain.ErrMissingTenantID,
		},
		{
			name:           "Falla con PatientID nulo",
			tenantID:       validTenantID,
			patientID:      domain.PatientID{},
			doctorID:       validDoctorID,
			date:           now,
			diagnosticCode: "CIE-I10",
			notes:          "Paciente estable.",
			metadata:       metadata,
			expectedErr:    domain.ErrInvalidPatientID,
		},
		{
			name:           "Falla con DoctorID nulo",
			tenantID:       validTenantID,
			patientID:      validPatientID,
			doctorID:       domain.UserID{},
			date:           now,
			diagnosticCode: "CIE-I10",
			notes:          "Paciente estable.",
			metadata:       metadata,
			expectedErr:    domain.ErrInvalidUserID,
		},
		{
			name:           "Falla con código diagnóstico vacío",
			tenantID:       validTenantID,
			patientID:      validPatientID,
			doctorID:       validDoctorID,
			date:           now,
			diagnosticCode: "",
			notes:          "Paciente estable.",
			metadata:       metadata,
			expectedErr:    domain.ErrEmptyDiagnosticCode,
		},
		{
			name:           "Falla con notas vacías",
			tenantID:       validTenantID,
			patientID:      validPatientID,
			doctorID:       validDoctorID,
			date:           now,
			diagnosticCode: "CIE-I10",
			notes:          "",
			metadata:       metadata,
			expectedErr:    domain.ErrEmptyNotes,
		},
		{
			name:           "Falla con fecha futura",
			tenantID:       validTenantID,
			patientID:      validPatientID,
			doctorID:       validDoctorID,
			date:           now.Add(10 * time.Minute),
			diagnosticCode: "CIE-I10",
			notes:          "Paciente estable.",
			metadata:       metadata,
			expectedErr:    domain.ErrFutureConsultationDate,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			consultation, err := domain.NewConsultation(
				tt.tenantID,
				tt.patientID,
				tt.doctorID,
				tt.date,
				tt.diagnosticCode,
				tt.notes,
				tt.metadata,
			)

			if tt.expectedErr != nil {
				if err != tt.expectedErr {
					t.Errorf("se esperaba error %v, se obtuvo %v", tt.expectedErr, err)
				}
				if consultation != nil {
					t.Errorf("se esperaba consulta nula ante error")
				}
			} else {
				if err != nil {
					t.Errorf("se esperaba error nulo, se obtuvo %v", err)
				}
				if consultation == nil {
					t.Fatalf("se esperaba una consulta válida, se obtuvo nil")
				}

				// Validar getters
				if consultation.ID().IsNil() {
					t.Error("se esperaba un ID de consulta autogenerado no nulo")
				}
				if consultation.TenantID() != tt.tenantID {
					t.Errorf("se esperaba TenantID %v, se obtuvo %v", tt.tenantID, consultation.TenantID())
				}
				if consultation.PatientID() != tt.patientID {
					t.Errorf("se esperaba PatientID %v, se obtuvo %v", tt.patientID, consultation.PatientID())
				}
				if consultation.DoctorID() != tt.doctorID {
					t.Errorf("se esperaba DoctorID %v, se obtuvo %v", tt.doctorID, consultation.DoctorID())
				}
				if !consultation.Date().Equal(tt.date) {
					t.Errorf("se esperaba Date %v, se obtuvo %v", tt.date, consultation.Date())
				}
				if consultation.DiagnosticCode() != tt.diagnosticCode {
					t.Errorf("se esperaba DiagnosticCode %v, se obtuvo %v", tt.diagnosticCode, consultation.DiagnosticCode())
				}
				if consultation.Notes() != tt.notes {
					t.Errorf("se esperaba Notes %v, se obtuvo %v", tt.notes, consultation.Notes())
				}
				if string(consultation.Metadata()) != string(tt.metadata) {
					t.Errorf("se esperaba Metadata %s, se obtuvo %s", string(tt.metadata), string(consultation.Metadata()))
				}
				if consultation.CreatedAt().IsZero() || consultation.UpdatedAt().IsZero() {
					t.Error("se esperaba que CreatedAt y UpdatedAt fuesen inicializados con valores temporales válidos")
				}
			}
		})
	}
}

func TestUnmarshalConsultation(t *testing.T) {
	id := domain.NewConsultationID()
	tenantID := domain.NewTenantID()
	patientID := domain.NewPatientID()
	doctorID := domain.NewUserID()
	date := time.Now().Add(-1 * time.Hour)
	diag := "CIE-J45"
	notes := "Asma bronquial en tratamiento."
	meta := json.RawMessage(`{"severity": "moderate"}`)
	created := time.Now().Add(-2 * time.Hour)
	updated := time.Now().Add(-1 * time.Hour)

	c := domain.UnmarshalConsultation(id, tenantID, patientID, doctorID, date, diag, notes, meta, created, updated)

	if c == nil {
		t.Fatalf("se esperaba una consulta reconstituida válida, se obtuvo nil")
	}
	if c.ID() != id {
		t.Errorf("se esperaba ID %v, se obtuvo %v", id, c.ID())
	}
	if c.TenantID() != tenantID {
		t.Errorf("se esperaba TenantID %v, se obtuvo %v", tenantID, c.TenantID())
	}
	if c.PatientID() != patientID {
		t.Errorf("se esperaba PatientID %v, se obtuvo %v", patientID, c.PatientID())
	}
	if c.DoctorID() != doctorID {
		t.Errorf("se esperaba DoctorID %v, se obtuvo %v", doctorID, c.DoctorID())
	}
	if !c.Date().Equal(date) {
		t.Errorf("se esperaba Date %v, se obtuvo %v", date, c.Date())
	}
	if c.DiagnosticCode() != diag {
		t.Errorf("se esperaba DiagnosticCode %s, se obtuvo %s", diag, c.DiagnosticCode())
	}
	if c.Notes() != notes {
		t.Errorf("se esperaba Notes %s, se obtuvo %s", notes, c.Notes())
	}
	if string(c.Metadata()) != string(meta) {
		t.Errorf("se esperaba Metadata %s, se obtuvo %s", string(meta), string(c.Metadata()))
	}
	if !c.CreatedAt().Equal(created) {
		t.Errorf("se esperaba CreatedAt %v, se obtuvo %v", created, c.CreatedAt())
	}
	if !c.UpdatedAt().Equal(updated) {
		t.Errorf("se esperaba UpdatedAt %v, se obtuvo %v", updated, c.UpdatedAt())
	}
}
