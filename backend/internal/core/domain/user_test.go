package domain_test

import (
	"errors"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"github.com/google/uuid"
)

func TestNewPhone(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedValue string
		expectedErr   error
	}{
		// Casos felices
		{
			name:          "Teléfono válido Perú",
			input:         "+51999888777",
			expectedValue: "+51999888777",
			expectedErr:   nil,
		},
		{
			name:          "Teléfono válido USA",
			input:         "+14155552671",
			expectedValue: "+14155552671",
			expectedErr:   nil,
		},
		{
			name:          "Teléfono válido España",
			input:         "+34666555444",
			expectedValue: "+34666555444",
			expectedErr:   nil,
		},
		{
			name:          "Teléfono con espacios que deben ser limpiados",
			input:         "  +51 999 888 777  ",
			expectedValue: "+51999888777",
			expectedErr:   nil,
		},
		// Casos tristes
		{
			name:          "Teléfono vacío",
			input:         "",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPhone,
		},
		{
			name:          "Sin signo más inicial",
			input:         "51999888777",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPhone,
		},
		{
			name:          "Muy corto",
			input:         "+12345",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPhone,
		},
		{
			name:          "Muy largo",
			input:         "+1234567890123456",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPhone,
		},
		{
			name:          "Contiene letras",
			input:         "+5199988877A",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPhone,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			phone, err := domain.NewPhone(tt.input)

			if tt.expectedErr != nil {
				if err == nil {
					t.Fatalf("se esperaba error %v, pero se obtuvo nil", tt.expectedErr)
				}
				if !errors.Is(err, tt.expectedErr) {
					t.Errorf("se esperaba error %v, pero se obtuvo %v", tt.expectedErr, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("no se esperaba error, pero se obtuvo: %v", err)
			}

			if phone.Value() != tt.expectedValue {
				t.Errorf("se esperaba el valor %q, pero se obtuvo %q", tt.expectedValue, phone.Value())
			}
		})
	}
}

func TestNewUser(t *testing.T) {
	tenantID := domain.NewTenantID()
	name, _ := domain.NewFullName("Juan")
	lastName, _ := domain.NewFullName("Pérez")
	email, _ := domain.NewEmail("juan.perez@clinicalyx.com")
	phone, _ := domain.NewPhone("+51999888777")
	passwordHash := "$argon2id$v=19$m=65536,t=3,p=2$..."

	t.Run("Creación exitosa de usuario", func(t *testing.T) {
		user, err := domain.NewUser(
			tenantID,
			name,
			lastName,
			email,
			passwordHash,
			phone,
			domain.UserRoleDoctor,
		)

		if err != nil {
			t.Fatalf("no se esperaba error, pero se obtuvo %v", err)
		}

		if user.ID().String() == uuid.Nil.String() {
			t.Error("se esperaba un ID de usuario válido, no vacío")
		}

		if user.TenantID() != tenantID {
			t.Errorf("se esperaba TenantID %v, pero se obtuvo %v", tenantID, user.TenantID())
		}

		if user.Name().Value() != "Juan" {
			t.Errorf("se esperaba nombre Juan, se obtuvo %q", user.Name().Value())
		}

		if user.LastName().Value() != "Pérez" {
			t.Errorf("se esperaba apellido Pérez, se obtuvo %q", user.LastName().Value())
		}

		if user.Email().Value() != "juan.perez@clinicalyx.com" {
			t.Errorf("se esperaba email, se obtuvo %q", user.Email().Value())
		}

		if user.Role() != domain.UserRoleDoctor {
			t.Errorf("se esperaba rol DOCTOR, se obtuvo %v", user.Role())
		}

		if user.Status() != domain.UserStatusActive {
			t.Errorf("se esperaba estado ACTIVE, se obtuvo %v", user.Status())
		}

		if user.MFAEnabled() {
			t.Error("se esperaba MFA desactivado por defecto")
		}

		if user.CreatedAt().IsZero() || user.UpdatedAt().IsZero() {
			t.Error("las fechas de creación y actualización no deben ser nulas")
		}
	})

	t.Run("Falla por TenantID nulo", func(t *testing.T) {
		_, err := domain.NewUser(
			domain.NilTenantID(),
			name,
			lastName,
			email,
			passwordHash,
			phone,
			domain.UserRoleDoctor,
		)
		if !errors.Is(err, domain.ErrMissingTenantID) {
			t.Errorf("se esperaba error %v, pero se obtuvo %v", domain.ErrMissingTenantID, err)
		}
	})

	t.Run("Falla por rol de usuario inválido", func(t *testing.T) {
		_, err := domain.NewUser(
			tenantID,
			name,
			lastName,
			email,
			passwordHash,
			phone,
			domain.UserRole("INVALID_ROLE"),
		)
		if !errors.Is(err, domain.ErrInvalidUserRole) {
			t.Errorf("se esperaba error %v, pero se obtuvo %v", domain.ErrInvalidUserRole, err)
		}
	})
}

func TestUnmarshalUser(t *testing.T) {
	id := domain.PatientID(uuid.New()) // Reutilizar estructura UUID envuelta
	tenantID := domain.NewTenantID()
	name, _ := domain.NewFullName("Ana")
	lastName, _ := domain.NewFullName("Gómez")
	email, _ := domain.NewEmail("ana@clinicalyx.com")
	phone, _ := domain.NewPhone("+14155552671")
	passwordHash := "$argon2id$v=19$..."
	createdAt := time.Now().Add(-24 * time.Hour)
	updatedAt := time.Now()

	t.Run("Reconstitución exitosa de usuario", func(t *testing.T) {
		userID := domain.UserID(id)
		user := domain.UnmarshalUser(
			userID,
			tenantID,
			name,
			lastName,
			email,
			passwordHash,
			phone,
			domain.UserRoleReceptionist,
			domain.UserStatusInactive,
			true,
			"MFASECRET123",
			createdAt,
			updatedAt,
		)

		if user.ID() != userID {
			t.Errorf("se esperaba ID %v, se obtuvo %v", userID, user.ID())
		}

		if user.TenantID() != tenantID {
			t.Errorf("se esperaba TenantID %v, se obtuvo %v", tenantID, user.TenantID())
		}

		if user.Role() != domain.UserRoleReceptionist {
			t.Errorf("se esperaba rol RECEPTIONIST, se obtuvo %v", user.Role())
		}

		if user.Status() != domain.UserStatusInactive {
			t.Errorf("se esperaba estado INACTIVE, se obtuvo %v", user.Status())
		}

		if !user.MFAEnabled() {
			t.Error("se esperaba MFA habilitado")
		}

		if user.MFASecret() != "MFASECRET123" {
			t.Errorf("se esperaba mfa secret, se obtuvo %q", user.MFASecret())
		}

		if user.CreatedAt() != createdAt || user.UpdatedAt() != updatedAt {
			t.Error("las fechas de creación y actualización no coinciden")
		}
	})
}
