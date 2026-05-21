package domain_test

import (
	"errors"
	"testing"

	"clinicalyx/backend/internal/core/domain"
)

func TestNewEmail(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedValue string
		expectedErr   error
	}{
		// Casos felices (deben pasar y normalizarse)
		{
			name:          "Email válido simple",
			input:         "carlos@clinicalyx.com",
			expectedValue: "carlos@clinicalyx.com",
			expectedErr:   nil,
		},
		{
			name:          "Email válido con espacios iniciales y finales",
			input:         "   carlos@clinicalyx.com   ",
			expectedValue: "carlos@clinicalyx.com",
			expectedErr:   nil,
		},
		{
			name:          "Email válido con mayúsculas mezcladas",
			input:         "CaRlOs.PeReZ@ClInIcAlYx.CoM",
			expectedValue: "carlos.perez@clinicalyx.com",
			expectedErr:   nil,
		},
		{
			name:          "Email válido con subdirección de Gmail (+)",
			input:         "carlos+alertas@clinicalyx.com",
			expectedValue: "carlos+alertas@clinicalyx.com",
			expectedErr:   nil,
		},
		{
			name:          "Email válido con subdominio",
			input:         "carlos@admin.clinicalyx.co.uk",
			expectedValue: "carlos@admin.clinicalyx.co.uk",
			expectedErr:   nil,
		},

		// Casos tristes (deben fallar con ErrInvalidEmail)
		{
			name:          "Email vacío",
			input:         "",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email con puros espacios",
			input:         "    ",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email sin arroba",
			input:         "carlos.clinicalyx.com",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email sin usuario",
			input:         "@clinicalyx.com",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email sin dominio",
			input:         "carlos@",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email con dominio incompleto",
			input:         "carlos@clinicalyx.",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
		{
			name:          "Email con espacios intercalados",
			input:         "carlos @clinicalyx.com",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidEmail,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			email, err := domain.NewEmail(tt.input)

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

			if email.Value() != tt.expectedValue {
				t.Errorf("se esperaba el valor normalizado %q, pero se obtuvo %q", tt.expectedValue, email.Value())
			}
		})
	}
}

func TestNewDocument(t *testing.T) {
	tests := []struct {
		name          string
		docType       domain.DocumentType
		value         string
		expectedValue string
		expectedErr   error
	}{
		// Casos felices: DNI
		{
			name:          "DNI válido numérico puro",
			docType:       domain.DocumentTypeDNI,
			value:         "12345678",
			expectedValue: "12345678",
			expectedErr:   nil,
		},
		{
			name:          "DNI válido con puntos y guiones",
			docType:       domain.DocumentTypeDNI,
			value:         "12.345.678-9",
			expectedValue: "123456789",
			expectedErr:   nil,
		},
		{
			name:          "DNI válido con espacios iniciales y finales",
			docType:       domain.DocumentTypeDNI,
			value:         "   87654321   ",
			expectedValue: "87654321",
			expectedErr:   nil,
		},

		// Casos tristes: DNI
		{
			name:          "DNI vacío",
			docType:       domain.DocumentTypeDNI,
			value:         "",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},
		{
			name:          "DNI muy corto",
			docType:       domain.DocumentTypeDNI,
			value:         "12345",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},
		{
			name:          "DNI con letras (inválido para DNI)",
			docType:       domain.DocumentTypeDNI,
			value:         "1234567A",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},

		// Casos felices: PASSPORT
		{
			name:          "PASSPORT válido con letras y guiones",
			docType:       domain.DocumentTypePassport,
			value:         "PA-123456F",
			expectedValue: "PA123456F",
			expectedErr:   nil,
		},
		{
			name:          "PASSPORT válido con minúsculas y espacios",
			docType:       domain.DocumentTypePassport,
			value:         "   ab123456   ",
			expectedValue: "AB123456",
			expectedErr:   nil,
		},

		// Casos tristes: PASSPORT
		{
			name:          "PASSPORT vacío",
			docType:       domain.DocumentTypePassport,
			value:         "",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},
		{
			name:          "PASSPORT muy corto",
			docType:       domain.DocumentTypePassport,
			value:         "PA12",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},
		{
			name:          "PASSPORT con caracteres especiales inválidos",
			docType:       domain.DocumentTypePassport,
			value:         "PA-123456F#",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidDocumentID,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			doc, err := domain.NewDocument(tt.docType, tt.value)

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

			if doc.Value() != tt.expectedValue {
				t.Errorf("se esperaba el valor normalizado %q, pero se obtuvo %q", tt.expectedValue, doc.Value())
			}

			if doc.Type() != tt.docType {
				t.Errorf("se esperaba el tipo %q, pero se obtuvo %q", tt.docType, doc.Type())
			}
		})
	}
}

func TestNewFullName(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedValue string
		expectedErr   error
	}{
		{
			name:          "Nombre válido estándar",
			input:         "Juan Pérez",
			expectedValue: "Juan Pérez",
			expectedErr:   nil,
		},
		{
			name:          "Nombre con espacios extra",
			input:         "   Juan    Pérez   Gómez   ",
			expectedValue: "Juan Pérez Gómez",
			expectedErr:   nil,
		},
		{
			name:          "Nombre vacío",
			input:         "",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPatientName,
		},
		{
			name:          "Nombre solo espacios",
			input:         "      ",
			expectedValue: "",
			expectedErr:   domain.ErrInvalidPatientName,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fn, err := domain.NewFullName(tt.input)

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

			if fn.Value() != tt.expectedValue {
				t.Errorf("se esperaba %q, pero se obtuvo %q", tt.expectedValue, fn.Value())
			}
		})
	}
}

func TestNewPatient(t *testing.T) {
	// Preparar dependencias válidas
	tenantID := domain.NewTenantID()
	name, _ := domain.NewFullName("Carlos Pérez")
	doc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	email, _ := domain.NewEmail("carlos@clinicalyx.com")

	t.Run("Creación de paciente exitosa", func(t *testing.T) {
		patient, err := domain.NewPatient(tenantID, name, doc, email)
		if err != nil {
			t.Fatalf("no se esperaba error, pero se obtuvo %v", err)
		}

		if patient.ID().IsNil() {
			t.Error("se esperaba que el Patient ID no fuera nil/nulo")
		}

		if patient.TenantID() != tenantID {
			t.Errorf("se esperaba tenantID %v, pero se obtuvo %v", tenantID, patient.TenantID())
		}

		if patient.Name().Value() != "Carlos Pérez" {
			t.Errorf("nombre incorrecto: %s", patient.Name().Value())
		}
	})

	t.Run("Creación fallida por TenantID nulo", func(t *testing.T) {
		nilTenant := domain.NilTenantID()
		_, err := domain.NewPatient(nilTenant, name, doc, email)
		if !errors.Is(err, domain.ErrMissingTenantID) {
			t.Errorf("se esperaba error %v, pero se obtuvo %v", domain.ErrMissingTenantID, err)
		}
	})
}

func TestUnmarshalPatient(t *testing.T) {
	patientID := domain.NewPatientID()
	tenantID := domain.NewTenantID()
	name, _ := domain.NewFullName("Carlos Pérez")
	doc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	email, _ := domain.NewEmail("carlos@clinicalyx.com")

	t.Run("Reconstitución exitosa desde persistencia", func(t *testing.T) {
		patient := domain.UnmarshalPatient(patientID, tenantID, name, doc, email)

		if patient.ID() != patientID {
			t.Errorf("se esperaba ID %v, pero se obtuvo %v", patientID, patient.ID())
		}

		if patient.TenantID() != tenantID {
			t.Errorf("se esperaba TenantID %v, pero se obtuvo %v", tenantID, patient.TenantID())
		}

		if patient.Name() != name {
			t.Error("el nombre no coincide")
		}

		if patient.Document() != doc {
			t.Error("el documento no coincide")
		}

		if patient.Email() != email {
			t.Error("el email no coincide")
		}
	})
}

