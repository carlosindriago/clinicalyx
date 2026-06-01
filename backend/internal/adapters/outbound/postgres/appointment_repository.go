package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"github.com/lib/pq"
)

// PostgresAppointmentRepository implementa el puerto de salida AppointmentRepository para PostgreSQL.
type PostgresAppointmentRepository struct {
	db *sql.DB
}

// NewPostgresAppointmentRepository construye una nueva instancia del adaptador de persistencia.
func NewPostgresAppointmentRepository(db *sql.DB) *PostgresAppointmentRepository {
	return &PostgresAppointmentRepository{
		db: db,
	}
}

// Save persiste la cita médica. Si ocurre un conflicto de exclusión temporal (doble reserva)
// a nivel de base de datos, captura la excepción y retorna domain.ErrDoctorNotAvailable.
func (r *PostgresAppointmentRepository) Save(ctx context.Context, appt *domain.Appointment) error {
	return ExecuteInTenantTx(ctx, r.db, appt.TenantID(), func(tx *sql.Tx) error {
		query := `
			INSERT INTO appointments (
				id, tenant_id, patient_id, doctor_id, time_range, status, created_at, updated_at
			) VALUES ($1, $2, $3, $4, tsrange($5, $6, '[)'), $7, $8, $9)
			ON CONFLICT (id) DO UPDATE SET
				status = EXCLUDED.status,
				time_range = EXCLUDED.time_range,
				updated_at = EXCLUDED.updated_at;`

		_, err := tx.ExecContext(
			ctx,
			query,
			appt.ID().String(),
			appt.TenantID().String(),
			appt.PatientID().String(),
			appt.DoctorID().String(),
			appt.StartTime(),
			appt.EndTime(),
			string(appt.Status()),
			appt.CreatedAt(),
			appt.UpdatedAt(),
		)
		if err != nil {
			var pqErr *pq.Error
			if errors.As(err, &pqErr) {
				// Código SQLSTATE 23P01 es una violación de restricción de exclusión (exclusion_violation)
				if pqErr.Code == "23P01" {
					return domain.ErrDoctorNotAvailable
				}
			}
			return err
		}
		return nil
	})
}

// HasOverlap verifica mediante el operador && si existe alguna cita no cancelada para el médico en el rango indicado.
func (r *PostgresAppointmentRepository) HasOverlap(
	ctx context.Context,
	tenantID domain.TenantID,
	doctorID domain.UserID,
	start time.Time,
	end time.Time,
) (bool, error) {
	var exists bool
	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT EXISTS (
				SELECT 1 FROM appointments
				WHERE tenant_id = $1
				  AND doctor_id = $2
				  AND time_range && tsrange($3, $4, '[)')
				  AND status != $5
			);`
		return tx.QueryRowContext(
			ctx,
			query,
			tenantID.String(),
			doctorID.String(),
			start,
			end,
			string(domain.AppointmentStatusCanceled),
		).Scan(&exists)
	})
	if err != nil {
		return false, fmt.Errorf("error al verificar solapamiento de agenda: %w", err)
	}
	return exists, nil
}

// UpdateStatus actualiza el estado de una cita médica específica.
func (r *PostgresAppointmentRepository) UpdateStatus(
	ctx context.Context,
	id domain.AppointmentID,
	status domain.AppointmentStatus,
) error {
	tenantIDVal := ctx.Value("tenant_id")
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		return errors.New("identificador de tenant ausente o inválido en contexto para actualizar cita RLS")
	}

	return ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			UPDATE appointments
			SET status = $1, updated_at = NOW()
			WHERE id = $2 AND tenant_id = $3;`
		result, err := tx.ExecContext(ctx, query, string(status), id.String(), tenantID.String())
		if err != nil {
			return err
		}
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if rowsAffected == 0 {
			return domain.ErrAppointmentNotFound
		}
		return nil
	})
}
