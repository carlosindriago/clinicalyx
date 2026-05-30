package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
)

// PostgresUserRepository implementa ports.UserRepository usando PostgreSQL con RLS y cifrado de datos.
type PostgresUserRepository struct {
	db     *sql.DB
	crypto *crypto.CryptoService
}

// NewPostgresUserRepository inicializa el repositorio de usuarios con su pool de conexiones y servicio criptográfico.
func NewPostgresUserRepository(db *sql.DB, crypto *crypto.CryptoService) *PostgresUserRepository {
	return &PostgresUserRepository{
		db:     db,
		crypto: crypto,
	}
}

// Save cifra los datos sensibles del usuario y lo persiste en PostgreSQL.
func (r *PostgresUserRepository) Save(ctx context.Context, user *domain.User) error {
	emailEncrypted, err := r.crypto.Encrypt(user.Email().Value())
	if err != nil {
		return fmt.Errorf("error al cifrar email: %w", err)
	}
	emailBlindIndex := r.crypto.BlindIndex(user.Email().Value())

	phoneEncrypted, err := r.crypto.Encrypt(user.Phone().Value())
	if err != nil {
		return fmt.Errorf("error al cifrar teléfono: %w", err)
	}
	phoneBlindIndex := r.crypto.BlindIndex(user.Phone().Value())

	var mfaSecretEncrypted string
	if user.MFASecret() != "" {
		mfaSecretEncrypted, err = r.crypto.Encrypt(user.MFASecret())
		if err != nil {
			return fmt.Errorf("error al cifrar MFA secret: %w", err)
		}
	}

	return ExecuteInTenantTx(ctx, r.db, user.TenantID(), func(tx *sql.Tx) error {
		query := `
			INSERT INTO users (
				id, tenant_id, first_name, last_name, email_blind_index, email_encrypted,
				password_hash, phone_blind_index, phone_encrypted, role, status,
				mfa_enabled, mfa_secret, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
			ON CONFLICT (tenant_id, email_blind_index)
			DO UPDATE SET
				first_name = EXCLUDED.first_name,
				last_name = EXCLUDED.last_name,
				phone_blind_index = EXCLUDED.phone_blind_index,
				phone_encrypted = EXCLUDED.phone_encrypted,
				role = EXCLUDED.role,
				status = EXCLUDED.status,
				mfa_enabled = EXCLUDED.mfa_enabled,
				mfa_secret = EXCLUDED.mfa_secret,
				updated_at = NOW();`

		_, err := tx.ExecContext(
			ctx,
			query,
			user.ID().String(),
			user.TenantID().String(),
			user.Name().Value(),
			user.LastName().Value(),
			emailBlindIndex,
			emailEncrypted,
			user.PasswordHash(),
			phoneBlindIndex,
			phoneEncrypted,
			string(user.Role()),
			string(user.Status()),
			user.MFAEnabled(),
			mfaSecretEncrypted,
			user.CreatedAt(),
			user.UpdatedAt(),
		)
		return err
	})
}

// FindByEmail recupera un usuario usando Blind Index y desencripta sus datos.
func (r *PostgresUserRepository) FindByEmail(ctx context.Context, tenantID domain.TenantID, emailStr string) (*domain.User, error) {
	emailBlindIndex := r.crypto.BlindIndex(emailStr)

	var (
		idStr              string
		tenantIDStr        string
		firstName          string
		lastName           string
		emailEncrypted     string
		passwordHash       string
		phoneEncrypted     string
		roleStr            string
		statusStr          string
		mfaEnabled         bool
		mfaSecretEncrypted string
		createdAt          time.Time
		updatedAt          time.Time
	)

	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT id, tenant_id, first_name, last_name, email_encrypted, password_hash,
			       phone_encrypted, role, status, mfa_enabled, mfa_secret, created_at, updated_at
			FROM users
			WHERE email_blind_index = $1;`

		row := tx.QueryRowContext(ctx, query, emailBlindIndex)
		return row.Scan(
			&idStr, &tenantIDStr, &firstName, &lastName, &emailEncrypted, &passwordHash,
			&phoneEncrypted, &roleStr, &statusStr, &mfaEnabled, &mfaSecretEncrypted, &createdAt, &updatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al buscar usuario por email: %w", err)
	}

	return r.reconstituteUser(
		idStr, tenantIDStr, firstName, lastName, emailEncrypted, passwordHash,
		phoneEncrypted, roleStr, statusStr, mfaEnabled, mfaSecretEncrypted, createdAt, updatedAt,
	)
}

// FindByID recupera un usuario por su identificador único y descifra sus datos.
func (r *PostgresUserRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.UserID) (*domain.User, error) {
	var (
		idStr              string
		tenantIDStr        string
		firstName          string
		lastName           string
		emailEncrypted     string
		passwordHash       string
		phoneEncrypted     string
		roleStr            string
		statusStr          string
		mfaEnabled         bool
		mfaSecretEncrypted string
		createdAt          time.Time
		updatedAt          time.Time
	)

	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `
			SELECT id, tenant_id, first_name, last_name, email_encrypted, password_hash,
			       phone_encrypted, role, status, mfa_enabled, mfa_secret, created_at, updated_at
			FROM users
			WHERE id = $1;`

		row := tx.QueryRowContext(ctx, query, id.String())
		return row.Scan(
			&idStr, &tenantIDStr, &firstName, &lastName, &emailEncrypted, &passwordHash,
			&phoneEncrypted, &roleStr, &statusStr, &mfaEnabled, &mfaSecretEncrypted, &createdAt, &updatedAt,
		)
	})

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("error al buscar usuario por ID: %w", err)
	}

	return r.reconstituteUser(
		idStr, tenantIDStr, firstName, lastName, emailEncrypted, passwordHash,
		phoneEncrypted, roleStr, statusStr, mfaEnabled, mfaSecretEncrypted, createdAt, updatedAt,
	)
}

// UpdateStatus modifica el estado del usuario (soft delete).
func (r *PostgresUserRepository) UpdateStatus(ctx context.Context, tenantID domain.TenantID, id domain.UserID, status domain.UserStatus) error {
	return ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;`
		_, err := tx.ExecContext(ctx, query, string(status), id.String())
		return err
	})
}

// HasUsers verifica de forma segura si el tenant ya posee usuarios registrados.
func (r *PostgresUserRepository) HasUsers(ctx context.Context, tenantID domain.TenantID) (bool, error) {
	var exists bool
	err := ExecuteInTenantTx(ctx, r.db, tenantID, func(tx *sql.Tx) error {
		query := `SELECT EXISTS(SELECT 1 FROM users LIMIT 1);`
		return tx.QueryRowContext(ctx, query).Scan(&exists)
	})
	return exists, err
}

func (r *PostgresUserRepository) reconstituteUser(
	idStr, tenantIDStr, firstName, lastName, emailEncrypted, passwordHash,
	phoneEncrypted, roleStr, statusStr string,
	mfaEnabled bool,
	mfaSecretEncrypted string,
	createdAt, updatedAt time.Time,
) (*domain.User, error) {
	emailVal, err := r.crypto.Decrypt(emailEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error al descifrar email: %w", err)
	}

	phoneVal, err := r.crypto.Decrypt(phoneEncrypted)
	if err != nil {
		return nil, fmt.Errorf("error al descifrar teléfono: %w", err)
	}

	var mfaSecret string
	if mfaSecretEncrypted != "" {
		mfaSecret, err = r.crypto.Decrypt(mfaSecretEncrypted)
		if err != nil {
			return nil, fmt.Errorf("error al descifrar MFA secret: %w", err)
		}
	}

	userID, err := domain.ParseUserID(idStr)
	if err != nil {
		return nil, err
	}

	tenantID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return nil, err
	}

	nameVO, err := domain.NewFullName(firstName)
	if err != nil {
		return nil, err
	}

	lastNameVO, err := domain.NewFullName(lastName)
	if err != nil {
		return nil, err
	}

	emailVO, err := domain.NewEmail(emailVal)
	if err != nil {
		return nil, err
	}

	phoneVO, err := domain.NewPhone(phoneVal)
	if err != nil {
		return nil, err
	}

	return domain.UnmarshalUser(
		userID,
		tenantID,
		nameVO,
		lastNameVO,
		emailVO,
		passwordHash,
		phoneVO,
		domain.UserRole(roleStr),
		domain.UserStatus(statusStr),
		mfaEnabled,
		mfaSecret,
		createdAt,
		updatedAt,
	), nil
}
