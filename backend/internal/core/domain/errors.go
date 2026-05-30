package domain

import "errors"

// Errores comunes de Dominio
var (
	ErrInvalidEmail      = errors.New("formato de correo electrónico inválido")
	ErrInvalidDocumentID = errors.New("documento de identidad inválido o vacío")
	ErrInvalidPatientID  = errors.New("identificador de paciente inválido")
	ErrMissingTenantID   = errors.New("identificador de tenant (clínica) requerido")
	ErrInvalidPatientName = errors.New("nombre de paciente inválido o vacío")
	ErrInvalidPhone       = errors.New("formato de teléfono inválido (debe cumplir E.164)")
	ErrInvalidUserRole    = errors.New("rol de usuario inválido")
	ErrInvalidUserStatus  = errors.New("estado de usuario inválido")
	ErrInvalidUserLastName = errors.New("apellido de usuario inválido o vacío")
	ErrInvalidPassword    = errors.New("contraseña de usuario inválida")
	ErrInvalidUserID      = errors.New("identificador de usuario inválido")
)
