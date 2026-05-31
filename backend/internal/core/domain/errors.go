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
	ErrInvalidPassword     = errors.New("contraseña de usuario inválida")
	ErrInvalidUserID       = errors.New("identificador de usuario inválido")
	ErrFutureConsultationDate = errors.New("la fecha de la consulta no puede ser en el futuro")
	ErrInvalidConsultationID  = errors.New("identificador de consulta inválido")
	ErrEmptyDiagnosticCode    = errors.New("el código de diagnóstico no puede estar vacío")
	ErrEmptyNotes             = errors.New("las notas de la consulta no pueden estar vacías")
	ErrPatientNotFound        = errors.New("el paciente especificado no existe")
	ErrInvalidTimeRange       = errors.New("la hora de finalización debe ser posterior a la de inicio")
	ErrPastAppointment        = errors.New("la cita no puede programarse en el pasado")
	ErrDoctorNotAvailable     = errors.New("el médico no se encuentra disponible en el horario seleccionado")
	ErrInvalidAppointmentStatus = errors.New("estado de cita inválido")
	ErrInvalidAppointmentID   = errors.New("identificador de cita inválido")
	ErrAppointmentNotFound    = errors.New("la cita especificada no existe")
)


