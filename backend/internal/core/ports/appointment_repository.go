package ports

import (
	"context"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

// AppointmentRepository define el puerto de salida para persistir y gestionar citas médicas.
type AppointmentRepository interface {
	Save(ctx context.Context, appt *domain.Appointment) error
	HasOverlap(ctx context.Context, tenantID domain.TenantID, doctorID domain.UserID, start time.Time, end time.Time) (bool, error)
	UpdateStatus(ctx context.Context, id domain.AppointmentID, status domain.AppointmentStatus) error
}
