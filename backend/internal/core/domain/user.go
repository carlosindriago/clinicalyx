package domain

import (
	"time"
)

// UserRole define los roles permitidos en el sistema.
type UserRole string

const (
	UserRoleSuperAdmin   UserRole = "SUPERADMIN"
	UserRoleDoctor       UserRole = "DOCTOR"
	UserRoleNurse        UserRole = "NURSE"
	UserRoleReceptionist UserRole = "RECEPTIONIST"
)

// IsValid verifica si el rol es uno de los permitidos.
func (r UserRole) IsValid() bool {
	switch r {
	case UserRoleSuperAdmin, UserRoleDoctor, UserRoleNurse, UserRoleReceptionist:
		return true
	default:
		return false
	}
}

// UserStatus define los estados del usuario en el sistema.
type UserStatus string

const (
	UserStatusActive   UserStatus = "ACTIVE"
	UserStatusInactive UserStatus = "INACTIVE"
)

// IsValid verifica si el estado es válido.
func (s UserStatus) IsValid() bool {
	switch s {
	case UserStatusActive, UserStatusInactive:
		return true
	default:
		return false
	}
}

// User representa la entidad agregada de un usuario/personal dentro del sistema.
type User struct {
	id           UserID
	tenantID     TenantID
	name         FullName
	lastName     FullName
	email        Email
	passwordHash string
	phone        Phone
	role         UserRole
	status       UserStatus
	mfaEnabled   bool
	mfaSecret    string
	createdAt    time.Time
	updatedAt    time.Time
}

// NewUser crea una nueva entidad de usuario realizando validaciones y generando metadatos iniciales.
func NewUser(
	tenantID TenantID,
	name FullName,
	lastName FullName,
	email Email,
	passwordHash string,
	phone Phone,
	role UserRole,
) (*User, error) {
	if tenantID.IsNil() {
		return nil, ErrMissingTenantID
	}

	if !role.IsValid() {
		return nil, ErrInvalidUserRole
	}

	if passwordHash == "" {
		return nil, ErrInvalidPassword
	}

	now := time.Now()

	return &User{
		id:           NewUserID(),
		tenantID:     tenantID,
		name:         name,
		lastName:     lastName,
		email:        email,
		passwordHash: passwordHash,
		phone:        phone,
		role:         role,
		status:       UserStatusActive,
		mfaEnabled:   false,
		mfaSecret:    "",
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

// UnmarshalUser reconstituye un usuario desde el almacenamiento sin realizar validaciones de estado inicial.
func UnmarshalUser(
	id UserID,
	tenantID TenantID,
	name FullName,
	lastName FullName,
	email Email,
	passwordHash string,
	phone Phone,
	role UserRole,
	status UserStatus,
	mfaEnabled bool,
	mfaSecret string,
	createdAt time.Time,
	updatedAt time.Time,
) *User {
	return &User{
		id:           id,
		tenantID:     tenantID,
		name:         name,
		lastName:     lastName,
		email:        email,
		passwordHash: passwordHash,
		phone:        phone,
		role:         role,
		status:       status,
		mfaEnabled:   mfaEnabled,
		mfaSecret:    mfaSecret,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
	}
}

// ID retorna el identificador del usuario.
func (u *User) ID() UserID {
	return u.id
}

// TenantID retorna el identificador del tenant.
func (u *User) TenantID() TenantID {
	return u.tenantID
}

// Name retorna el nombre del usuario.
func (u *User) Name() FullName {
	return u.name
}

// LastName retorna el apellido del usuario.
func (u *User) LastName() FullName {
	return u.lastName
}

// Email retorna el email de acceso.
func (u *User) Email() Email {
	return u.email
}

// PasswordHash retorna el hash de contraseña.
func (u *User) PasswordHash() string {
	return u.passwordHash
}

// Phone retorna el teléfono del usuario.
func (u *User) Phone() Phone {
	return u.phone
}

// Role retorna el rol.
func (u *User) Role() UserRole {
	return u.role
}

// Status retorna el estado actual del usuario.
func (u *User) Status() UserStatus {
	return u.status
}

// MFAEnabled verifica si tiene habilitado MFA.
func (u *User) MFAEnabled() bool {
	return u.mfaEnabled
}

// MFASecret retorna el secreto para la generación de TOTP.
func (u *User) MFASecret() string {
	return u.mfaSecret
}

// CreatedAt retorna la fecha de creación del registro.
func (u *User) CreatedAt() time.Time {
	return u.createdAt
}

// UpdatedAt retorna la fecha de la última actualización del registro.
func (u *User) UpdatedAt() time.Time {
	return u.updatedAt
}

// UpdateStatus permite modificar el estado del usuario (soft delete).
func (u *User) UpdateStatus(status UserStatus) error {
	if !status.IsValid() {
		return ErrInvalidUserStatus
	}
	u.status = status
	u.updatedAt = time.Now()
	return nil
}

// EnableMFA activa el doble factor de autenticación e inyecta su secreto.
func (u *User) EnableMFA(secret string) {
	u.mfaEnabled = true
	u.mfaSecret = secret
	u.updatedAt = time.Now()
}

// DisableMFA desactiva el doble factor de autenticación.
func (u *User) DisableMFA() {
	u.mfaEnabled = false
	u.mfaSecret = ""
	u.updatedAt = time.Now()
}
