package ports

import (
	"context"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

// SessionRepository define el puerto de salida para la gestión y persistencia de sesiones de usuario.
type SessionRepository interface {
	CreateSession(ctx context.Context, sessionID string, userID domain.UserID, tenantID domain.TenantID, expiresAt time.Time) error
	RevokeSession(ctx context.Context, sessionID string, tenantID domain.TenantID) error
	IsRevoked(ctx context.Context, sessionID string, tenantID domain.TenantID) (bool, error)
}
