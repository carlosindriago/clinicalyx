package ports

import (
	"context"

	"clinicalyx/backend/internal/core/domain"
)

// UserRepository define el puerto de salida para la persistencia de Usuarios.
type UserRepository interface {
	Save(ctx context.Context, user *domain.User) error
	FindByEmail(ctx context.Context, tenantID domain.TenantID, email string) (*domain.User, error)
	FindByID(ctx context.Context, tenantID domain.TenantID, id domain.UserID) (*domain.User, error)
	UpdateStatus(ctx context.Context, tenantID domain.TenantID, id domain.UserID, status domain.UserStatus) error
	HasUsers(ctx context.Context, tenantID domain.TenantID) (bool, error)
}
