package domain

import (
	"regexp"
	"strings"
)

// DocumentType define los tipos de documentos aceptados por el sistema.
type DocumentType string

const (
	DocumentTypeDNI      DocumentType = "DNI"
	DocumentTypePassport DocumentType = "PASSPORT"
)


var (
	dniCleanRegex      = regexp.MustCompile(`[.\-\s]`)
	dniValidationRegex = regexp.MustCompile(`^[0-9]{7,12}$`)

	passportCleanRegex      = regexp.MustCompile(`[\-\s]`)
	passportValidationRegex = regexp.MustCompile(`^[A-Z0-9]{5,15}$`)
)

// Document representa el Value Object de documentos de identidad de pacientes.
type Document struct {
	docType DocumentType
	value   string
}

// NewDocument crea, valida y normaliza un documento según su tipo.
func NewDocument(docType DocumentType, valueStr string) (Document, error) {
	switch docType {
	case DocumentTypeDNI:
		// Limpieza de caracteres de formato comunes (puntos, guiones, espacios)
		cleaned := dniCleanRegex.ReplaceAllString(valueStr, "")

		// Validación de que contenga solo dígitos de longitud permitida (7 a 12)
		if !dniValidationRegex.MatchString(cleaned) {
			return Document{}, ErrInvalidDocumentID
		}

		return Document{docType: docType, value: cleaned}, nil

	case DocumentTypePassport:
		// Limpieza de guiones y espacios
		cleaned := passportCleanRegex.ReplaceAllString(valueStr, "")
		cleaned = strings.ToUpper(cleaned)

		// Validación de formato alfanumérico estricto y longitud (5 a 15)
		if !passportValidationRegex.MatchString(cleaned) {
			return Document{}, ErrInvalidDocumentID
		}

		return Document{docType: docType, value: cleaned}, nil

	default:
		return Document{}, ErrInvalidDocumentID
	}
}

// Type retorna el tipo de documento.
func (d Document) Type() DocumentType {
	return d.docType
}

// Value retorna el valor normalizado del documento.
func (d Document) Value() string {
	return d.value
}
