package domain

import (
	"regexp"
	"strings"
)

// phoneRegex precompila la expresión regular para validar el formato E.164.
// Consiste en un signo "+" seguido por 10 a 15 dígitos, donde el primer dígito es del 1 al 9.
var phoneRegex = regexp.MustCompile(`^\+[1-9]\d{9,14}$`)

// Phone representa el Value Object para números de teléfono válidos bajo E.164.
type Phone struct {
	value string
}

// NewPhone valida, normaliza y construye un Value Object Phone.
func NewPhone(phoneStr string) (Phone, error) {
	// Normalización inicial: eliminar espacios iniciales, finales e internos
	cleaned := strings.ReplaceAll(phoneStr, " ", "")
	cleaned = strings.TrimSpace(cleaned)

	// Validación semántica
	if !phoneRegex.MatchString(cleaned) {
		return Phone{}, ErrInvalidPhone
	}

	return Phone{value: cleaned}, nil
}

// Value retorna el valor normalizado del teléfono.
func (p Phone) Value() string {
	return p.value
}
