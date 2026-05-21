package domain

import "errors"

// Errores comunes de Dominio
var (
	ErrInvalidEmail      = errors.New("formato de correo electrónico inválido")
	ErrInvalidDocumentID = errors.New("documento de identidad inválido o vacío")
	ErrInvalidPatientID  = errors.New("identificador de paciente inválido")
	ErrMissingTenantID   = errors.New("identificador de tenant (clínica) requerido")
	ErrInvalidPatientName = errors.New("nombre de paciente inválido o vacío")
)
