package domain

import (
	"regexp"
	"strings"
)

// regexEmail es la expresión regular precompilada para validar correos.
// Nota: Es óptimo compilarla una sola vez al cargar el paquete.
var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

// Email representa el Value Object para correos electrónicos.
type Email struct {
	value string
}

// NewEmail valida, normaliza y construye un Value Object Email.
func NewEmail(emailStr string) (Email, error) {
	// Normalización inicial: quitar espacios en los extremos
	normalized := strings.TrimSpace(emailStr)

	// Normalización obligatoria: forzar todo a minúsculas
	normalized = strings.ToLower(normalized)

	// Validación semántica
	if !emailRegex.MatchString(normalized) {
		return Email{}, ErrInvalidEmail
	}

	return Email{value: normalized}, nil
}

// Value retorna el valor interno normalizado del correo.
func (e Email) Value() string {
	return e.value
}
