package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

// PostgresSessionRepository gestiona el ciclo de vida y revocación de sesiones en PostgreSQL.
type PostgresSessionRepository struct {
	db *sql.DB
}

// NewPostgresSessionRepository inicializa el repositorio con su conexión a la base de datos.
func NewPostgresSessionRepository(db *sql.DB) *PostgresSessionRepository {
	return &PostgresSessionRepository{
		db: db,
	}
}

// CreateSession inserta una nueva sesión en la base de datos bajo aislamiento RLS.
func (r *PostgresSessionRepository) CreateSession(ctx context.Context, sessionID string, userID domain.UserID, tenantID domain.TenantID, expiresAt time.Time) error {
	return ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			INSERT INTO sessions (id, user_id, tenant_id, revoked, expires_at)
			VALUES ($1, $2, $3, FALSE, $4);`
		_, err := tx.ExecContext(ctx, query, sessionID, userID.String(), tenantID.String(), expiresAt)
		return err
	})
}

// RevokeSession marca la sesión como revocada.
func (r *PostgresSessionRepository) RevokeSession(ctx context.Context, sessionID string, tenantID domain.TenantID) error {
	return ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `UPDATE sessions SET revoked = TRUE WHERE id = $1;`
		_, err := tx.ExecContext(ctx, query, sessionID)
		return err
	})
}

// IsRevoked verifica si la sesión fue marcada como revocada o si ya ha expirado temporalmente.
func (r *PostgresSessionRepository) IsRevoked(ctx context.Context, sessionID string, tenantID domain.TenantID) (bool, error) {
	var revoked bool
	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `SELECT revoked OR (expires_at < NOW()) FROM sessions WHERE id = $1;`
		row := tx.QueryRowContext(ctx, query, sessionID)
		err := row.Scan(&revoked)
		if errors.Is(err, sql.ErrNoRows) {
			revoked = true
			return nil
		}
		return err
	})
	return revoked, err
}
