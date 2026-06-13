package usecases_test

import (
	"context"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
)

// --- MOCKS MANUALES ---

type mockPatientRepositoryForAppt struct {
	patients map[string]*domain.Patient
}

func (m *mockPatientRepositoryForAppt) Save(ctx context.Context, patient *domain.Patient) error {
	m.patients[patient.ID().String()] = patient
	return nil
}

func (m *mockPatientRepositoryForAppt) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	p, ok := m.patients[id.String()]
	if ok && p.TenantID() == tenantID {
		return p, nil
	}
	return nil, nil
}

func (m *mockPatientRepositoryForAppt) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	return nil, nil
}

type mockAppointmentRepository struct {
	appointments map[string]*domain.Appointment
	overlap      bool
	err          error
}

func (m *mockAppointmentRepository) Save(ctx context.Context, appt *domain.Appointment) error {
	if m.err != nil {
		return m.err
	}
	m.appointments[appt.ID().String()] = appt
	return nil
}

func (m *mockAppointmentRepository) HasOverlap(ctx context.Context, tenantID domain.TenantID, doctorID domain.UserID, start time.Time, end time.Time) (bool, error) {
	if m.err != nil {
		return false, m.err
	}
	return m.overlap, nil
}

func (m *mockAppointmentRepository) UpdateStatus(ctx context.Context, tenantID domain.TenantID, id domain.AppointmentID, status domain.AppointmentStatus) error {
	if m.err != nil {
		return m.err
	}
	appt, ok := m.appointments[id.String()]
	if !ok {
		return domain.ErrAppointmentNotFound
	}
	
	updated, err := domain.UnmarshalAppointment(
		appt.ID(),
		appt.TenantID(),
		appt.PatientID(),
		appt.DoctorID(),
		appt.StartTime(),
		appt.EndTime(),
		status,
		appt.CreatedAt(),
		time.Now(),
	)
	if err != nil {
		return err
	}
	
	m.appointments[id.String()] = updated
	return nil
}

// --- TESTS ---

func TestScheduleAppointmentUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	doctorID := domain.NewUserID()

	// Registrar un paciente de prueba
	patientName, _ := domain.NewFullName("Claudio Valdivia")
	patientDoc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	patientEmail, _ := domain.NewEmail("claudio@clinicalyx.com")
	patient := domain.UnmarshalPatient(domain.NewPatientID(), tenantID, patientName, patientDoc, patientEmail)

	patientsMap := map[string]*domain.Patient{
		patient.ID().String(): patient,
	}

	t.Run("Agendamiento de cita exitoso", func(t *testing.T) {
		patientRepo := &mockPatientRepositoryForAppt{patients: patientsMap}
		apptRepo := &mockAppointmentRepository{
			appointments: make(map[string]*domain.Appointment),
			overlap:      false,
		}

		uc := usecases.NewScheduleAppointmentUseCase(apptRepo, patientRepo)

		dto := usecases.ScheduleAppointmentDTO{
			TenantID:  tenantID.String(),
			PatientID: patient.ID().String(),
			DoctorID:  doctorID.String(),
			StartTime: time.Now().Add(1 * time.Hour),
			EndTime:   time.Now().Add(2 * time.Hour),
		}

		resp, err := uc.Execute(context.Background(), dto)

		if err != nil {
			t.Fatalf("se esperaba error nulo, se obtuvo %v", err)
		}
		if resp.ID == "" {
			t.Fatal("se esperaba un ID de cita no vacío")
		}

		// Verificar que fue guardado en el mock
		saved, exists := apptRepo.appointments[resp.ID]
		if !exists {
			t.Fatal("la cita no fue guardada en el repositorio")
		}
		if saved.Status() != domain.AppointmentStatusScheduled {
			t.Errorf("se esperaba estado SCHEDULED, se obtuvo %s", saved.Status())
		}
	})

	t.Run("Falla si el paciente no existe", func(t *testing.T) {
		patientRepo := &mockPatientRepositoryForAppt{patients: patientsMap}
		apptRepo := &mockAppointmentRepository{
			appointments: make(map[string]*domain.Appointment),
			overlap:      false,
		}

		uc := usecases.NewScheduleAppointmentUseCase(apptRepo, patientRepo)
		nonExistentPatientID := domain.NewPatientID().String()

		dto := usecases.ScheduleAppointmentDTO{
			TenantID:  tenantID.String(),
			PatientID: nonExistentPatientID,
			DoctorID:  doctorID.String(),
			StartTime: time.Now().Add(1 * time.Hour),
			EndTime:   time.Now().Add(2 * time.Hour),
		}

		_, err := uc.Execute(context.Background(), dto)

		if err != domain.ErrPatientNotFound {
			t.Errorf("se esperaba error ErrPatientNotFound, se obtuvo %v", err)
		}
	})

	t.Run("Falla si hay colisión de agenda (solapamiento)", func(t *testing.T) {
		patientRepo := &mockPatientRepositoryForAppt{patients: patientsMap}
		apptRepo := &mockAppointmentRepository{
			appointments: make(map[string]*domain.Appointment),
			overlap:      true, // Colisión activa
		}

		uc := usecases.NewScheduleAppointmentUseCase(apptRepo, patientRepo)

		dto := usecases.ScheduleAppointmentDTO{
			TenantID:  tenantID.String(),
			PatientID: patient.ID().String(),
			DoctorID:  doctorID.String(),
			StartTime: time.Now().Add(1 * time.Hour),
			EndTime:   time.Now().Add(2 * time.Hour),
		}

		_, err := uc.Execute(context.Background(), dto)

		if err != domain.ErrDoctorNotAvailable {
			t.Errorf("se esperaba error ErrDoctorNotAvailable, se obtuvo %v", err)
		}
	})
}

func TestCancelAppointmentUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	patientID := domain.NewPatientID()
	doctorID := domain.NewUserID()
	
	start := time.Now().Add(1 * time.Hour)
	end := time.Now().Add(2 * time.Hour)
	
	// Crear y registrar una cita en el repositorio mock
	appt, _ := domain.NewAppointment(tenantID, patientID, doctorID, start, end)
	apptsMap := map[string]*domain.Appointment{
		appt.ID().String(): appt,
	}

	t.Run("Cancelación exitosa", func(t *testing.T) {
		apptRepo := &mockAppointmentRepository{appointments: apptsMap}
		uc := usecases.NewCancelAppointmentUseCase(apptRepo)

		dto := usecases.CancelAppointmentDTO{
			TenantID:      tenantID.String(),
			AppointmentID: appt.ID().String(),
		}

		err := uc.Execute(context.Background(), dto)

		if err != nil {
			t.Fatalf("se esperaba error nulo, se obtuvo %v", err)
		}

		// Verificar que el estado cambió a CANCELED en la persistencia
		updated := apptRepo.appointments[appt.ID().String()]
		if updated.Status() != domain.AppointmentStatusCanceled {
			t.Errorf("se esperaba estado CANCELED, se obtuvo %s", updated.Status())
		}
	})

	t.Run("Falla si la cita no existe", func(t *testing.T) {
		apptRepo := &mockAppointmentRepository{appointments: apptsMap}
		uc := usecases.NewCancelAppointmentUseCase(apptRepo)
		nonExistentApptID := domain.NewAppointmentID().String()

		dto := usecases.CancelAppointmentDTO{
			TenantID:      tenantID.String(),
			AppointmentID: nonExistentApptID,
		}

		err := uc.Execute(context.Background(), dto)

		if err != domain.ErrAppointmentNotFound {
			t.Errorf("se esperaba error ErrAppointmentNotFound, se obtuvo %v", err)
		}
	})
}
