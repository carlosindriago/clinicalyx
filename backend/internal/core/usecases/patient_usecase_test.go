package usecases

import (
	"context"
	"errors"
	"testing"

	"clinicalyx/backend/internal/core/domain"
)

// MockPatientRepository es un mock idiomático y manual para pruebas.
type MockPatientRepository struct {
	SaveFunc           func(ctx context.Context, patient *domain.Patient) error
	FindByIDFunc       func(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error)
	FindByDocumentFunc func(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error)
}

func (m *MockPatientRepository) Save(ctx context.Context, patient *domain.Patient) error {
	if m.SaveFunc != nil {
		return m.SaveFunc(ctx, patient)
	}
	return nil
}

func (m *MockPatientRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	if m.FindByIDFunc != nil {
		return m.FindByIDFunc(ctx, tenantID, id)
	}
	return nil, nil
}

func (m *MockPatientRepository) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	if m.FindByDocumentFunc != nil {
		return m.FindByDocumentFunc(ctx, tenantID, docType, docValue)
	}
	return nil, nil
}

func TestCreatePatientUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()

	t.Run("Creación exitosa de paciente", func(t *testing.T) {
		repo := &MockPatientRepository{
			FindByDocumentFunc: func(ctx context.Context, tID domain.TenantID, docType domain.DocumentType, value string) (*domain.Patient, error) {
				// No existe previamente
				return nil, nil
			},
			SaveFunc: func(ctx context.Context, patient *domain.Patient) error {
				if patient.TenantID() != tenantID {
					t.Errorf("se esperaba tenantID %s, se obtuvo %s", tenantID, patient.TenantID())
				}
				if patient.Name().Value() != "Carlos Pérez" {
					t.Errorf("se esperaba nombre Carlos Pérez, se obtuvo %s", patient.Name().Value())
				}
				return nil
			},
		}

		useCase := NewCreatePatientUseCase(repo)

		input := CreatePatientDTO{
			TenantID:      tenantID.String(),
			Name:          "Carlos Pérez",
			DocumentType:  "DNI",
			DocumentValue: "12345678",
			Email:         "carlos@clinicalyx.com",
		}

		output, err := useCase.Execute(context.Background(), input)
		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		if output.ID == "" {
			t.Error("se esperaba un ID generado para el paciente")
		}
	})

	t.Run("Falla de validación en datos de entrada", func(t *testing.T) {
		repo := &MockPatientRepository{}
		useCase := NewCreatePatientUseCase(repo)

		input := CreatePatientDTO{
			TenantID:      tenantID.String(),
			Name:          "", // Inválido
			DocumentType:  "DNI",
			DocumentValue: "12345678",
			Email:         "carlos@clinicalyx.com",
		}

		_, err := useCase.Execute(context.Background(), input)
		if !errors.Is(err, domain.ErrInvalidPatientName) {
			t.Errorf("se esperaba error %v, se obtuvo %v", domain.ErrInvalidPatientName, err)
		}
	})

	t.Run("Falla por paciente duplicado en el mismo tenant", func(t *testing.T) {
		existingPatient, _ := domain.NewPatient(
			tenantID,
			domain.FullName{}, // Value object vacío solo para mock
			domain.Document{},
			domain.Email{},
		)

		repo := &MockPatientRepository{
			FindByDocumentFunc: func(ctx context.Context, tID domain.TenantID, docType domain.DocumentType, value string) (*domain.Patient, error) {
				return existingPatient, nil
			},
		}

		useCase := NewCreatePatientUseCase(repo)

		input := CreatePatientDTO{
			TenantID:      tenantID.String(),
			Name:          "Carlos Pérez",
			DocumentType:  "DNI",
			DocumentValue: "12345678",
			Email:         "carlos@clinicalyx.com",
		}

		_, err := useCase.Execute(context.Background(), input)
		if !errors.Is(err, ErrPatientAlreadyExists) {
			t.Errorf("se esperaba error %v, se obtuvo %v", ErrPatientAlreadyExists, err)
		}
	})

	t.Run("Falla si falla la persistencia", func(t *testing.T) {
		dbErr := errors.New("error de base de datos")
		repo := &MockPatientRepository{
			FindByDocumentFunc: func(ctx context.Context, tID domain.TenantID, docType domain.DocumentType, value string) (*domain.Patient, error) {
				return nil, nil
			},
			SaveFunc: func(ctx context.Context, patient *domain.Patient) error {
				return dbErr
			},
		}

		useCase := NewCreatePatientUseCase(repo)

		input := CreatePatientDTO{
			TenantID:      tenantID.String(),
			Name:          "Carlos Pérez",
			DocumentType:  "DNI",
			DocumentValue: "12345678",
			Email:         "carlos@clinicalyx.com",
		}

		_, err := useCase.Execute(context.Background(), input)
		if !errors.Is(err, dbErr) {
			t.Errorf("se esperaba error %v, se obtuvo %v", dbErr, err)
		}
	})
}
