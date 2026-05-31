package domain_test

import (
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

func TestNewAppointment(t *testing.T) {
	validTenantID := domain.NewTenantID()
	validPatientID := domain.NewPatientID()
	validDoctorID := domain.NewUserID()
	now := time.Now()

	tests := []struct {
		name        string
		tenantID    domain.TenantID
		patientID   domain.PatientID
		doctorID    domain.UserID
		startTime   time.Time
		endTime     time.Time
		expectedErr error
	}{
		{
			name:        "Programación de cita válida",
			tenantID:    validTenantID,
			patientID:   validPatientID,
			doctorID:    validDoctorID,
			startTime:   now.Add(1 * time.Hour),
			endTime:     now.Add(2 * time.Hour),
			expectedErr: nil,
		},
		{
			name:        "Falla con TenantID nulo",
			tenantID:    domain.NilTenantID(),
			patientID:   validPatientID,
			doctorID:    validDoctorID,
			startTime:   now.Add(1 * time.Hour),
			endTime:     now.Add(2 * time.Hour),
			expectedErr: domain.ErrMissingTenantID,
		},
		{
			name:        "Falla con PatientID nulo",
			tenantID:    validTenantID,
			patientID:   domain.PatientID{},
			doctorID:    validDoctorID,
			startTime:   now.Add(1 * time.Hour),
			endTime:     now.Add(2 * time.Hour),
			expectedErr: domain.ErrInvalidPatientID,
		},
		{
			name:        "Falla con DoctorID nulo",
			tenantID:    validTenantID,
			patientID:   validPatientID,
			doctorID:    domain.UserID{},
			startTime:   now.Add(1 * time.Hour),
			endTime:     now.Add(2 * time.Hour),
			expectedErr: domain.ErrInvalidUserID,
		},
		{
			name:        "Falla si EndTime es anterior a StartTime",
			tenantID:    validTenantID,
			patientID:   validPatientID,
			doctorID:    validDoctorID,
			startTime:   now.Add(2 * time.Hour),
			endTime:     now.Add(1 * time.Hour),
			expectedErr: domain.ErrInvalidTimeRange,
		},
		{
			name:        "Falla si EndTime es igual a StartTime",
			tenantID:    validTenantID,
			patientID:   validPatientID,
			doctorID:    validDoctorID,
			startTime:   now.Add(1 * time.Hour),
			endTime:     now.Add(1 * time.Hour),
			expectedErr: domain.ErrInvalidTimeRange,
		},
		{
			name:        "Falla si StartTime está en el pasado",
			tenantID:    validTenantID,
			patientID:   validPatientID,
			doctorID:    validDoctorID,
			startTime:   now.Add(-10 * time.Minute),
			endTime:     now.Add(1 * time.Hour),
			expectedErr: domain.ErrPastAppointment,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appt, err := domain.NewAppointment(
				tt.tenantID,
				tt.patientID,
				tt.doctorID,
				tt.startTime,
				tt.endTime,
			)

			if tt.expectedErr != nil {
				if err != tt.expectedErr {
					t.Errorf("se esperaba error %v, se obtuvo %v", tt.expectedErr, err)
				}
				if appt != nil {
					t.Errorf("se esperaba cita nula ante error")
				}
			} else {
				if err != nil {
					t.Errorf("se esperaba error nulo, se obtuvo %v", err)
				}
				if appt == nil {
					t.Fatalf("se esperaba una cita válida, se obtuvo nil")
				}

				// Validar valores por defecto y getters
				if appt.ID().IsNil() {
					t.Error("se esperaba un ID de cita autogenerado")
				}
				if appt.Status() != domain.AppointmentStatusScheduled {
					t.Errorf("se esperaba estado %s, se obtuvo %s", domain.AppointmentStatusScheduled, appt.Status())
				}
				if appt.TenantID() != tt.tenantID {
					t.Errorf("se esperaba TenantID %v, se obtuvo %v", tt.tenantID, appt.TenantID())
				}
				if appt.PatientID() != tt.patientID {
					t.Errorf("se esperaba PatientID %v, se obtuvo %v", tt.patientID, appt.PatientID())
				}
				if appt.DoctorID() != tt.doctorID {
					t.Errorf("se esperaba DoctorID %v, se obtuvo %v", tt.doctorID, appt.DoctorID())
				}
				if !appt.StartTime().Equal(tt.startTime) {
					t.Errorf("se esperaba StartTime %v, se obtuvo %v", tt.startTime, appt.StartTime())
				}
				if !appt.EndTime().Equal(tt.endTime) {
					t.Errorf("se esperaba EndTime %v, se obtuvo %v", tt.endTime, appt.EndTime())
				}
				if appt.CreatedAt().IsZero() || appt.UpdatedAt().IsZero() {
					t.Error("se esperaba que CreatedAt y UpdatedAt fuesen inicializados")
				}
			}
		})
	}
}

func TestUnmarshalAppointment(t *testing.T) {
	id := domain.NewAppointmentID()
	tenantID := domain.NewTenantID()
	patientID := domain.NewPatientID()
	doctorID := domain.NewUserID()
	start := time.Now().Add(1 * time.Hour)
	end := time.Now().Add(2 * time.Hour)
	created := time.Now()
	updated := time.Now()

	t.Run("Reconstitución exitosa", func(t *testing.T) {
		appt, err := domain.UnmarshalAppointment(
			id,
			tenantID,
			patientID,
			doctorID,
			start,
			end,
			domain.AppointmentStatusCompleted,
			created,
			updated,
		)

		if err != nil {
			t.Fatalf("se esperaba error nulo, se obtuvo %v", err)
		}
		if appt == nil {
			t.Fatal("se esperaba una cita reconstituida válida")
		}
		if appt.ID() != id {
			t.Errorf("se esperaba ID %v, se obtuvo %v", id, appt.ID())
		}
		if appt.Status() != domain.AppointmentStatusCompleted {
			t.Errorf("se esperaba estado %s, se obtuvo %s", domain.AppointmentStatusCompleted, appt.Status())
		}
	})

	t.Run("Falla con estado inválido", func(t *testing.T) {
		_, err := domain.UnmarshalAppointment(
			id,
			tenantID,
			patientID,
			doctorID,
			start,
			end,
			domain.AppointmentStatus("INVALID_STATUS"),
			created,
			updated,
		)

		if err != domain.ErrInvalidAppointmentStatus {
			t.Errorf("se esperaba error ErrInvalidAppointmentStatus, se obtuvo %v", err)
		}
	})
}
