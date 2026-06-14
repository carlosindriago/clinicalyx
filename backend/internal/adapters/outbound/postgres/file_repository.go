package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"github.com/google/uuid"
)

// PostgresFileRepository implementa ports.FileRepository usando PostgreSQL con RLS
type PostgresFileRepository struct {
	db *sql.DB
}

// NewPostgresFileRepository inicializa el repositorio con su pool de conexiones
func NewPostgresFileRepository(db *sql.DB) *PostgresFileRepository {
	return &PostgresFileRepository{
		db: db,
	}
}

// Save guarda los metadatos de un archivo médico en la base de datos
func (r *PostgresFileRepository) Save(ctx context.Context, tenantID domain.TenantID, file *domain.MedicalFile) error {
	if err := file.Validate(); err != nil {
		return fmt.Errorf("validación de archivo médico fallida: %w", err)
	}

	return ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			INSERT INTO medical_files (
				id, tenant_id, patient_id, file_name, content_type, size, object_key, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		`

		_, err := tx.ExecContext(ctx, query,
			uuid.UUID(file.ID),
			uuid.UUID(file.TenantID),
			uuid.UUID(file.PatientID),
			file.FileName,
			file.ContentType,
			file.Size,
			file.ObjectKey,
			file.CreatedAt,
		)

		if err != nil {
			return fmt.Errorf("error al guardar archivo médico en la base de datos: %w", err)
		}

		return nil
	})
}

// FindByPatientID recupera todos los archivos médicos asociados a un paciente específico
func (r *PostgresFileRepository) FindByPatientID(ctx context.Context, tenantID domain.TenantID, patientID domain.PatientID) ([]*domain.MedicalFile, error) {
	var files []*domain.MedicalFile

	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT 
				id, tenant_id, patient_id, file_name, content_type, size, object_key, created_at
			FROM medical_files
			WHERE patient_id = $1
			ORDER BY created_at DESC
		`

		rows, err := tx.QueryContext(ctx, query, uuid.UUID(patientID))
		if err != nil {
			return fmt.Errorf("error al consultar archivos médicos: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			var (
				id          uuid.UUID
				tenantID    uuid.UUID
				patientID   uuid.UUID
				fileName    string
				contentType string
				size        int64
				objectKey   string
				createdAt   time.Time
			)

			if err := rows.Scan(
				&id,
				&tenantID,
				&patientID,
				&fileName,
				&contentType,
				&size,
				&objectKey,
				&createdAt,
			); err != nil {
				return fmt.Errorf("error al escanear fila de archivo médico: %w", err)
			}

			file := &domain.MedicalFile{
				ID:          domain.FileID(id),
				TenantID:    domain.TenantID(tenantID),
				PatientID:   domain.PatientID(patientID),
				FileName:    fileName,
				ContentType: contentType,
				Size:        size,
				ObjectKey:   objectKey,
				CreatedAt:   createdAt,
			}

			files = append(files, file)
		}

		if err := rows.Err(); err != nil {
			return fmt.Errorf("error iterando sobre filas de archivos médicos: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return files, nil
}