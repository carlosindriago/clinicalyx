package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"clinicalyx/backend/internal/core/domain"
)

var (
	ErrMissingTenant = errors.New("identificador de tenant ausente en el contexto")
)

// ExecuteInTenantTx ejecuta fn dentro de una transacción SQL inyectando el tenant_id en la sesión local.
// Esto garantiza la correcta aplicación de políticas de Row-Level Security (RLS) en PostgreSQL.
func ExecuteInTenantTx(ctx context.Context, db *sql.DB, tenantID domain.TenantID, fn func(tx *sql.Tx) error) error {
	if tenantID.IsNil() {
		return ErrMissingTenant
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error al iniciar transacción: %w", err)
	}
	defer tx.Rollback()

	// SELECT set_config('app.current_tenant', $1, true) limita el alcance al ámbito de la transacción
	_, err = tx.ExecContext(ctx, "SELECT set_config('app.current_tenant', $1, true)", tenantID.String())
	if err != nil {
		return fmt.Errorf("error al configurar current_tenant para RLS: %w", err)
	}

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error al confirmar (commit) transacción: %w", err)
	}

	return nil
}
