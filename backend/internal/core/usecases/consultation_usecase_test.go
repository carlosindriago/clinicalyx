package usecases_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
)

// --- MOCKS MANUALES ---

type mockPatientRepository struct {
	patients map[string]*domain.Patient
	err      error
}

func (m *mockPatientRepository) Save(ctx context.Context, patient *domain.Patient) error {
	m.patients[patient.ID().String()] = patient
	return m.err
}

func (m *mockPatientRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	if m.err != nil {
		return nil, m.err
	}
	p, ok := m.patients[id.String()]
	if ok && p.TenantID() == tenantID {
		return p, nil
	}
	return nil, nil
}

func (m *mockPatientRepository) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	return nil, nil
}

type mockConsultationRepository struct {
	consultations map[string]*domain.Consultation
	list          []*domain.Consultation
	err           error
}

func (m *mockConsultationRepository) Save(ctx context.Context, c *domain.Consultation) error {
	if m.err != nil {
		return m.err
	}
	m.consultations[c.ID().String()] = c
	m.list = append(m.list, c)
	return nil
}

func (m *mockConsultationRepository) ListByPatientID(ctx context.Context, patientID domain.PatientID, limit, offset int) ([]*domain.Consultation, error) {
	if m.err != nil {
		return nil, m.err
	}

	var filtered []*domain.Consultation
	for _, c := range m.list {
		if c.PatientID() == patientID {
			filtered = append(filtered, c)
		}
	}

	// Ordenar de forma descendente por fecha (más reciente primero)
	for i := 0; i < len(filtered); i++ {
		for j := i + 1; j < len(filtered); j++ {
			if filtered[i].Date().Before(filtered[j].Date()) {
				filtered[i], filtered[j] = filtered[j], filtered[i]
			}
		}
	}

	if offset >= len(filtered) {
		return []*domain.Consultation{}, nil
	}

	end := offset + limit
	if end > len(filtered) {
		end = len(filtered)
	}

	return filtered[offset:end], nil
}

// --- TESTS ---

func TestRecordConsultationUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	doctorID := domain.NewUserID()
	
	// Registrar un paciente en el repositorio mock
	patientName, _ := domain.NewFullName("Carlos Mendoza")
	patientDoc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	patientEmail, _ := domain.NewEmail("carlos@clinicalyx.com")
	patient := domain.UnmarshalPatient(domain.NewPatientID(), tenantID, patientName, patientDoc, patientEmail)

	patientsMap := map[string]*domain.Patient{
		patient.ID().String(): patient,
	}

	t.Run("Registro de consulta exitoso", func(t *testing.T) {
		patientRepo := &mockPatientRepository{patients: patientsMap}
		consultationRepo := &mockConsultationRepository{
			consultations: make(map[string]*domain.Consultation),
		}

		uc := usecases.NewRecordConsultationUseCase(consultationRepo, patientRepo)
		
		dto := usecases.RecordConsultationDTO{
			TenantID:       tenantID.String(),
			PatientID:      patient.ID().String(),
			DoctorID:       doctorID.String(),
			Date:           time.Now(),
			DiagnosticCode: "CIE-K21",
			Notes:          "Reflujo gastroesofágico leve. Se receta antiácidos.",
			Metadata:       json.RawMessage(`{"tags":["gastroenterology"]}`),
		}

		resp, err := uc.Execute(context.Background(), dto)

		if err != nil {
			t.Fatalf("se esperaba error nulo, se obtuvo %v", err)
		}
		if resp.ID == "" {
			t.Fatal("se esperaba un ID de consulta no vacío en la respuesta")
		}

		// Verificar persistencia en mock
		saved, exists := consultationRepo.consultations[resp.ID]
		if !exists {
			t.Fatal("la consulta no fue guardada en el repositorio")
		}
		if saved.Notes() != dto.Notes {
			t.Errorf("se esperaba notas %s, se obtuvo %s", dto.Notes, saved.Notes())
		}
	})

	t.Run("Falla si el paciente no existe", func(t *testing.T) {
		patientRepo := &mockPatientRepository{patients: patientsMap}
		consultationRepo := &mockConsultationRepository{
			consultations: make(map[string]*domain.Consultation),
		}

		uc := usecases.NewRecordConsultationUseCase(consultationRepo, patientRepo)
		nonExistentPatientID := domain.NewPatientID().String()

		dto := usecases.RecordConsultationDTO{
			TenantID:       tenantID.String(),
			PatientID:      nonExistentPatientID,
			DoctorID:       doctorID.String(),
			Date:           time.Now(),
			DiagnosticCode: "CIE-K21",
			Notes:          "Reflujo gastroesofágico.",
			Metadata:       nil,
		}

		_, err := uc.Execute(context.Background(), dto)

		if err != domain.ErrPatientNotFound {
			t.Errorf("se esperaba error ErrPatientNotFound, se obtuvo %v", err)
		}
	})

	t.Run("Falla con IDs inválidos", func(t *testing.T) {
		patientRepo := &mockPatientRepository{patients: patientsMap}
		consultationRepo := &mockConsultationRepository{}
		uc := usecases.NewRecordConsultationUseCase(consultationRepo, patientRepo)

		dto := usecases.RecordConsultationDTO{
			TenantID:  "no-uuid",
			PatientID: patient.ID().String(),
			DoctorID:  doctorID.String(),
			Date:      time.Now(),
		}

		_, err := uc.Execute(context.Background(), dto)
		if err == nil {
			t.Error("se esperaba error al parsear un TenantID inválido")
		}
	})
}

func TestGetConsultationHistoryUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	doctorID := domain.NewUserID()
	
	// Registrar un paciente en el repositorio mock
	patientName, _ := domain.NewFullName("Carlos Mendoza")
	patientDoc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	patientEmail, _ := domain.NewEmail("carlos@clinicalyx.com")
	patient := domain.UnmarshalPatient(domain.NewPatientID(), tenantID, patientName, patientDoc, patientEmail)

	patientsMap := map[string]*domain.Patient{
		patient.ID().String(): patient,
	}

	// Crear algunas consultas con fechas distintas para probar el orden descendente
	t1 := time.Now().Add(-2 * time.Hour)
	t2 := time.Now().Add(-1 * time.Hour)
	t3 := time.Now() // Más reciente

	c1, _ := domain.NewConsultation(tenantID, patient.ID(), doctorID, t1, "A00", "Nota 1", nil)
	c2, _ := domain.NewConsultation(tenantID, patient.ID(), doctorID, t2, "B00", "Nota 2", nil)
	c3, _ := domain.NewConsultation(tenantID, patient.ID(), doctorID, t3, "C00", "Nota 3", nil)

	t.Run("Historial retornado en orden descendente y con paginación", func(t *testing.T) {
		patientRepo := &mockPatientRepository{patients: patientsMap}
		consultationRepo := &mockConsultationRepository{
			consultations: make(map[string]*domain.Consultation),
			list:          []*domain.Consultation{c1, c2, c3}, // Desordenado o temporal
		}

		uc := usecases.NewGetConsultationHistoryUseCase(consultationRepo, patientRepo)

		// Probar con límite 2, offset 0 (debería retornar c3 y c2 en ese orden)
		dto := usecases.GetConsultationHistoryDTO{
			TenantID:  tenantID.String(),
			PatientID: patient.ID().String(),
			Limit:     2,
			Offset:    0,
		}

		history, err := uc.Execute(context.Background(), dto)

		if err != nil {
			t.Fatalf("se esperaba error nulo, se obtuvo %v", err)
		}
		if len(history) != 2 {
			t.Fatalf("se esperaban 2 consultas en el historial, se obtuvieron %d", len(history))
		}

		// c3 es el más reciente (time.Now())
		if history[0].ID != c3.ID().String() {
			t.Errorf("se esperaba que la primera consulta sea %s (la más reciente), se obtuvo %s", c3.ID().String(), history[0].ID)
		}
		// c2 es la segunda más reciente
		if history[1].ID != c2.ID().String() {
			t.Errorf("se esperaba que la segunda consulta sea %s, se obtuvo %s", c2.ID().String(), history[1].ID)
		}

		// Probar offset para avanzar (debería retornar c1)
		dtoOffset := usecases.GetConsultationHistoryDTO{
			TenantID:  tenantID.String(),
			PatientID: patient.ID().String(),
			Limit:     2,
			Offset:    2,
		}

		historyOffset, err := uc.Execute(context.Background(), dtoOffset)
		if err != nil {
			t.Fatalf("se esperaba error nulo en offset, se obtuvo %v", err)
		}
		if len(historyOffset) != 1 {
			t.Fatalf("se esperaba 1 consulta en el offset, se obtuvieron %d", len(historyOffset))
		}
		if historyOffset[0].ID != c1.ID().String() {
			t.Errorf("se esperaba la consulta %s (la más antigua), se obtuvo %s", c1.ID().String(), historyOffset[0].ID)
		}
	})

	t.Run("Falla si el paciente no existe en historial", func(t *testing.T) {
		patientRepo := &mockPatientRepository{patients: patientsMap}
		consultationRepo := &mockConsultationRepository{}
		uc := usecases.NewGetConsultationHistoryUseCase(consultationRepo, patientRepo)
		nonExistentPatientID := domain.NewPatientID().String()

		dto := usecases.GetConsultationHistoryDTO{
			TenantID:  tenantID.String(),
			PatientID: nonExistentPatientID,
			Limit:     10,
			Offset:    0,
		}

		_, err := uc.Execute(context.Background(), dto)
		if err != domain.ErrPatientNotFound {
			t.Errorf("se esperaba error ErrPatientNotFound, se obtuvo %v", err)
		}
	})
}
