package domain

import (
	"strings"
)

// FullName representa el Value Object del nombre completo del paciente.
type FullName struct {
	value string
}

// NewFullName valida, limpia y construye el Value Object FullName.
func NewFullName(name string) (FullName, error) {
	// Normalización: removemos espacios redundantes e intercalados
	words := strings.Fields(name)
	cleaned := strings.Join(words, " ")

	if cleaned == "" {
		return FullName{}, ErrInvalidPatientName
	}

	return FullName{value: cleaned}, nil
}

// Value retorna el string limpio y normalizado del nombre.
func (f FullName) Value() string {
	return f.value
}
