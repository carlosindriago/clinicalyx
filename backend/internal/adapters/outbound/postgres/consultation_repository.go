package postgres

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
)

// sqlJSONB es un tipo adaptador privado que permite mapear json.RawMessage
// del dominio a la columna JSONB de PostgreSQL mediante Scanner/Valuer.
type sqlJSONB json.RawMessage

// Value implementa la interfaz driver.Valuer.
func (j sqlJSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return string(j), nil
}

// Scan implementa la interfaz sql.Scanner.
func (j *sqlJSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	switch v := value.(type) {
	case string:
		*j = append((*j)[0:0], []byte(v)...)
	case []byte:
		*j = append((*j)[0:0], v...)
	default:
		return fmt.Errorf("tipo no soportado para mapeo JSONB: %T", value)
	}
	return nil
}

// bufferPool es un pool de buffers temporales reutilizables para evitar
// asignaciones constantes en el Heap de Go durante el descifrado masivo.
var bufferPool = sync.Pool{
	New: func() interface{} {
		// Capacidad de 4KB para notas e índices
		b := make([]byte, 4096)
		return &b
	},
}

// PostgresConsultationRepository persiste y consulta el historial clínico en Postgres aplicando RLS.
type PostgresConsultationRepository struct {
	db     *sql.DB
	crypto *crypto.CryptoService
}

// NewPostgresConsultationRepository construye una instancia de PostgresConsultationRepository.
func NewPostgresConsultationRepository(db *sql.DB, crypto *crypto.CryptoService) *PostgresConsultationRepository {
	return &PostgresConsultationRepository{
		db:     db,
		crypto: crypto,
	}
}

// Save cifra las notas clínicas y persiste el registro bajo el aislamiento RLS del Tenant.
func (r *PostgresConsultationRepository) Save(ctx context.Context, consultation *domain.Consultation) error {
	// Cifrar notas antes de ingresar a la base de datos
	notesEncrypted, err := r.crypto.Encrypt(consultation.Notes())
	if err != nil {
		return fmt.Errorf("error cifrando notas de consulta: %w", err)
	}

	// Mapear metadatos dinámicos
	metaVal := sqlJSONB(consultation.Metadata())

	// Utilizar helper obligatorio de aislamiento multi-tenant RLS
	return ExecuteInTenantTx(ctx, r.db, consultation.TenantID(), func(tx *sql.Tx) error {
		query := `
			INSERT INTO consultations (
				id, tenant_id, patient_id, doctor_id, date, diagnostic_code, notes_encrypted, metadata
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`

		_, err := tx.ExecContext(
			ctx,
			query,
			consultation.ID().String(),
			consultation.TenantID().String(),
			consultation.PatientID().String(),
			consultation.DoctorID().String(),
			consultation.Date(),
			consultation.DiagnosticCode(),
			notesEncrypted,
			metaVal,
		)
		return err
	})
}

// ListByPatientID recupera la lista paginada de consultas de un paciente descifrando notas clínicamente.
func (r *PostgresConsultationRepository) ListByPatientID(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
	limit int,
	offset int,
) ([]*domain.Consultation, error) {
	var consultations []*domain.Consultation

	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT id, tenant_id, patient_id, doctor_id, date, diagnostic_code, notes_encrypted, metadata, created_at, updated_at
			FROM consultations
			WHERE patient_id = $1
			ORDER BY date DESC
			LIMIT $2 OFFSET $3;`

		rows, err := tx.QueryContext(ctx, query, patientID.String(), limit, offset)
		if err != nil {
			return err
		}
		defer rows.Close()

		// Adquirir buffers reutilizables del pool para la descodificación hex y descifrado
		hexBufPtr := bufferPool.Get().(*[]byte)
		decryptedBufPtr := bufferPool.Get().(*[]byte)
		defer func() {
			bufferPool.Put(hexBufPtr)
			bufferPool.Put(decryptedBufPtr)
		}()

		for rows.Next() {
			var (
				idStr             string
				tIDStr            string
				pIDStr            string
				dIDStr            string
				date              time.Time
				diagCode          string
				notesEnc          string
				metaRaw           sqlJSONB
				createdAt, upAt   time.Time
			)

			err := rows.Scan(
				&idStr,
				&tIDStr,
				&pIDStr,
				&dIDStr,
				&date,
				&diagCode,
				&notesEnc,
				&metaRaw,
				&createdAt,
				&upAt,
			)
			if err != nil {
				return err
			}

			// 2. Descifrado optimizado reduciendo asignaciones en el Heap
			// Ajustar tamaño de buffers en caso de que las notas sean grandes
			hexLen := len(notesEnc) / 2
			if len(*hexBufPtr) < hexLen {
				*hexBufPtr = make([]byte, hexLen*2)
			}
			if len(*decryptedBufPtr) < hexLen {
				*decryptedBufPtr = make([]byte, hexLen*2)
			}

			// Decodificar hex de Postgres en el buffer
			n, err := hex.Decode(*hexBufPtr, []byte(notesEnc))
			if err != nil {
				return fmt.Errorf("error al decodificar notas hex: %w", err)
			}

			// Descifrar bytes usando el buffer reutilizado
			decryptedBytes, err := r.crypto.DecryptBytes((*hexBufPtr)[:n], *decryptedBufPtr)
			if err != nil {
				return fmt.Errorf("error descifrando notas médicas: %w", err)
			}

			// Mapear a entidades de dominio
			cID, err := domain.ParseConsultationID(idStr)
			if err != nil {
				return err
			}
			tID, err := domain.ParseTenantID(tIDStr)
			if err != nil {
				return err
			}
			pID, err := domain.ParsePatientID(pIDStr)
			if err != nil {
				return err
			}
			dID, err := domain.ParseUserID(dIDStr)
			if err != nil {
				return err
			}

			consultation := domain.UnmarshalConsultation(
				cID,
				tID,
				pID,
				dID,
				date,
				diagCode,
				string(decryptedBytes), // Go asigna la cadena aquí, pero optimizamos la transformación del descifrador
				json.RawMessage(metaRaw),
				createdAt,
				upAt,
			)

			consultations = append(consultations, consultation)
		}

		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("error en consulta de historial clínico: %w", err)
	}

	return consultations, nil
}
