package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
)

// PostgresPatientRepository implementa ports.PatientRepository usando PostgreSQL con RLS y cifrado de datos.
type PostgresPatientRepository struct {
	db     *sql.DB
	crypto *crypto.CryptoService
}

// NewPostgresPatientRepository inicializa el repositorio con su pool de conexiones y el servicio criptográfico.
func NewPostgresPatientRepository(db *sql.DB, crypto *crypto.CryptoService) *PostgresPatientRepository {
	return &PostgresPatientRepository{
		db:     db,
		crypto: crypto,
	}
}

// executeInTransaction ejecuta el callback fn dentro de una transacción en la cual se configura localmente el tenant_id.
// Esto es requerido para interactuar de forma segura con las políticas RLS a nivel de base de datos.
func (r *PostgresPatientRepository) executeInTransaction(ctx context.Context, tenantID domain.TenantID, fn func(tx *sql.Tx) error) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("error iniciando transacción: %w", err)
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, "SELECT set_config('app.current_tenant', $1, true)", tenantID.String())
	if err != nil {
		return fmt.Errorf("error configurando tenant local en la sesión: %w", err)
	}

	if err := fn(tx); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error haciendo commit de transacción: %w", err)
	}

	return nil
}

// Save cifra los datos sensibles del paciente y lo persiste en PostgreSQL bajo políticas de RLS.
func (r *PostgresPatientRepository) Save(ctx context.Context, patient *domain.Patient) error {
	// 1. Cifrado e Indexación Ciega en Memoria (Go) antes de enviar a DB
	docEncrypted, err := r.crypto.Encrypt(patient.Document().Value())
	if err != nil {
		return fmt.Errorf("error cifrando documento: %w", err)
	}
	docBlindIndex := r.crypto.BlindIndex(patient.Document().Value())

	emailEncrypted, err := r.crypto.Encrypt(patient.Email().Value())
	if err != nil {
		return fmt.Errorf("error cifrando email: %w", err)
	}
	emailBlindIndex := r.crypto.BlindIndex(patient.Email().Value())

	// 2. Ejecutar inserción dentro de transacción configurada para RLS
	return r.executeInTransaction(ctx, patient.TenantID(), func(tx *sql.Tx) error {
		query := `
			INSERT INTO patients (
				id, tenant_id, name, document_type, document_blind_index, document_encrypted, email_blind_index, email_encrypted
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (tenant_id, document_type, document_blind_index) 
			DO UPDATE SET 
				name = EXCLUDED.name,
				email_blind_index = EXCLUDED.email_blind_index,
				email_encrypted = EXCLUDED.email_encrypted,
				updated_at = NOW();`

		_, err := tx.ExecContext(
			ctx,
			query,
			patient.ID().String(),
			patient.TenantID().String(),
			patient.Name().Value(),
			string(patient.Document().Type()),
			docBlindIndex,
			docEncrypted,
			emailBlindIndex,
			emailEncrypted,
		)
		return err
	})
}

// FindByID recupera un paciente por su ID y descifra sus datos sensibles.
func (r *PostgresPatientRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.PatientID) (*domain.Patient, error) {
	var (
		patientIDStr string
		tenantIDStr  string
		name         string
		docType      string
		docEncrypted string
		emailEncrypted string
	)

	err := r.executeInTransaction(ctx, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT id, tenant_id, name, document_type, document_encrypted, email_encrypted 
			FROM patients 
			WHERE id = $1;`

		row := tx.QueryRowContext(ctx, query, id.String())
		return row.Scan(&patientIDStr, &tenantIDStr, &name, &docType, &docEncrypted, &emailEncrypted)
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error buscando paciente por ID: %w", err)
	}

	// 3. Reconstitución del dominio descifrando valores
	docValue, err := r.crypto.Decrypt(docEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error descifrando documento de identidad desde BD: %w", err)
	}

	emailValue, err := r.crypto.Decrypt(emailEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error descifrando email desde BD: %w", err)
	}

	// Re-validación del dominio para reconstitución segura
	pID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		return nil, err
	}

	tID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return nil, err
	}

	fullName, err := domain.NewFullName(name)
	if err != nil {
		return nil, err
	}

	document, err := domain.NewDocument(domain.DocumentType(docType), docValue)
	if err != nil {
		return nil, err
	}

	email, err := domain.NewEmail(emailValue)
	if err != nil {
		return nil, err
	}

	return domain.UnmarshalPatient(pID, tID, fullName, document, email), nil
}

// FindByDocument recupera un paciente usando Blind Index y descifra sus datos sensibles.
func (r *PostgresPatientRepository) FindByDocument(ctx context.Context, tenantID domain.TenantID, docType domain.DocumentType, docValue string) (*domain.Patient, error) {
	// Calcular el Blind Index del documento buscado para realizar la consulta exacta
	docBlindIndex := r.crypto.BlindIndex(docValue)

	var (
		patientIDStr string
		tenantIDStr  string
		name         string
		documentType string
		docEncrypted string
		emailEncrypted string
	)

	err := r.executeInTransaction(ctx, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT id, tenant_id, name, document_type, document_encrypted, email_encrypted 
			FROM patients 
			WHERE document_type = $1 AND document_blind_index = $2;`

		row := tx.QueryRowContext(ctx, query, string(docType), docBlindIndex)
		return row.Scan(&patientIDStr, &tenantIDStr, &name, &documentType, &docEncrypted, &emailEncrypted)
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error buscando paciente por documento: %w", err)
	}

	// Reconstitución del dominio descifrando valores
	documentDecrypted, err := r.crypto.Decrypt(docEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error descifrando documento de identidad desde BD: %w", err)
	}

	emailValue, err := r.crypto.Decrypt(emailEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error descifrando email desde BD: %w", err)
	}

	pID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		return nil, err
	}

	tID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return nil, err
	}

	fullName, err := domain.NewFullName(name)
	if err != nil {
		return nil, err
	}

	document, err := domain.NewDocument(domain.DocumentType(documentType), documentDecrypted)
	if err != nil {
		return nil, err
	}

	email, err := domain.NewEmail(emailValue)
	if err != nil {
		return nil, err
	}

	return domain.UnmarshalPatient(pID, tID, fullName, document, email), nil
}
