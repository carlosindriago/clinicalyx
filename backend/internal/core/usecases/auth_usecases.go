package usecases

import (
	"context"
	"errors"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
	"github.com/google/uuid"
)

var (
	ErrTenantAlreadyInitialized = errors.New("el tenant ya cuenta con personal inicializado")
	ErrInvalidCredentials       = errors.New("correo electrónico o contraseña incorrectos")
	ErrUserInactive             = errors.New("la cuenta de usuario se encuentra inactiva")
	ErrInvalidAdminCredentials  = errors.New("la contraseña del administrador es incorrecta o no existe la cuenta")
	ErrUnauthorizedAction       = errors.New("operación restringida únicamente a administradores (SUPERADMIN)")
)

// --- SetupTenantUseCase ---

type SetupTenantDTO struct {
	TenantID  string
	FirstName string
	LastName  string
	Email     string
	Password  string
	Phone     string
}

type SetupTenantResponse struct {
	UserID string
}

type SetupTenantUseCase struct {
	userRepo ports.UserRepository
	hasher   ports.PasswordHasher
}

func NewSetupTenantUseCase(userRepo ports.UserRepository, hasher ports.PasswordHasher) *SetupTenantUseCase {
	return &SetupTenantUseCase{
		userRepo: userRepo,
		hasher:   hasher,
	}
}

func (uc *SetupTenantUseCase) Execute(ctx context.Context, dto SetupTenantDTO) (SetupTenantResponse, error) {
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	// 1. Validar si el Tenant ya tiene usuarios
	hasUsers, err := uc.userRepo.HasUsers(ctx, tenantID)
	if err != nil {
		return SetupTenantResponse{}, err
	}
	if hasUsers {
		return SetupTenantResponse{}, ErrTenantAlreadyInitialized
	}

	// 2. Validar Value Objects de Dominio
	name, err := domain.NewFullName(dto.FirstName)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	lastName, err := domain.NewFullName(dto.LastName)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	email, err := domain.NewEmail(dto.Email)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	phone, err := domain.NewPhone(dto.Phone)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	// 3. Hashear la contraseña
	passwordHash, err := uc.hasher.Hash(dto.Password)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	// 4. Crear entidad User con rol SUPERADMIN
	user, err := domain.NewUser(
		tenantID,
		name,
		lastName,
		email,
		passwordHash,
		phone,
		domain.UserRoleSuperAdmin,
	)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	// 5. Persistir
	err = uc.userRepo.Save(ctx, user)
	if err != nil {
		return SetupTenantResponse{}, err
	}

	return SetupTenantResponse{
		UserID: user.ID().String(),
	}, nil
}

// --- LoginUseCase ---

type LoginDTO struct {
	TenantID string
	Email    string
	Password string
}

type LoginResponse struct {
	RequiresMFA bool
	UserID      string
	SessionID   string
	Role        domain.UserRole
}

type LoginUseCase struct {
	userRepo    ports.UserRepository
	sessionRepo ports.SessionRepository
	hasher      ports.PasswordHasher
}

func NewLoginUseCase(
	userRepo ports.UserRepository,
	sessionRepo ports.SessionRepository,
	hasher ports.PasswordHasher,
) *LoginUseCase {
	return &LoginUseCase{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		hasher:      hasher,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, dto LoginDTO) (LoginResponse, error) {
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return LoginResponse{}, err
	}

	// 1. Buscar usuario por Email
	user, err := uc.userRepo.FindByEmail(ctx, tenantID, dto.Email)
	if err != nil {
		return LoginResponse{}, err
	}
	if user == nil {
		return LoginResponse{}, ErrInvalidCredentials
	}

	// 2. Verificar si está activo (soft delete)
	if user.Status() == domain.UserStatusInactive {
		return LoginResponse{}, ErrUserInactive
	}

	// 3. Validar contraseña
	match, err := uc.hasher.Verify(dto.Password, user.PasswordHash())
	if err != nil || !match {
		return LoginResponse{}, ErrInvalidCredentials
	}

	// 4. Evaluar si tiene MFA activado
	if user.MFAEnabled() {
		return LoginResponse{
			RequiresMFA: true,
			UserID:      user.ID().String(),
			Role:        user.Role(),
		}, nil
	}

	// 5. Generar una sesión de forma segura
	sessionID := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour) // Expiración por defecto
	err = uc.sessionRepo.CreateSession(ctx, sessionID, user.ID(), tenantID, expiresAt)
	if err != nil {
		return LoginResponse{}, err
	}

	return LoginResponse{
		RequiresMFA: false,
		UserID:      user.ID().String(),
		SessionID:   sessionID,
		Role:        user.Role(),
	}, nil
}

// --- RefreshSessionUseCase ---

// ErrRefreshTokenInvalid se devuelve cuando el refresh token es inválido,
// expirado, la sesión fue revocada o el subject no coincide con un usuario
// activo del tenant. En cualquier caso, la respuesta al cliente es 401
// sin filtrar cuál fue la causa específica.
var ErrRefreshTokenInvalid = errors.New("refresh token inválido, expirado o revocado")

type RefreshSessionDTO struct {
	RefreshClaims *crypto.JWTClaims
}

type RefreshSessionResponse struct {
	UserID      string
	TenantID    string
	Role        domain.UserRole
	NewSessionID string
	ExpiresAt    time.Time
}

type RefreshSessionUseCase struct {
	sessionRepo ports.SessionRepository
	userRepo    ports.UserRepository
}

func NewRefreshSessionUseCase(
	sessionRepo ports.SessionRepository,
	userRepo ports.UserRepository,
) *RefreshSessionUseCase {
	return &RefreshSessionUseCase{
		sessionRepo: sessionRepo,
		userRepo:    userRepo,
	}
}

// Execute implementa refresh token rotation: la sesión vieja se revoca
// y se emite una nueva con un sessionID fresco. Esto mitiga replay
// attacks: si un atacante captura un refresh token usado, ya no le sirve.
//
// Pasos:
//  1. Verificar que la sesión no esté revocada ni expirada en la DB.
//  2. Verificar que el user_id del claim corresponde a un usuario activo
//     del tenant (defense-in-depth: el JWT ya pasó la firma, pero el
//     usuario podría haber sido deshabilitado después de emitido el token).
//  3. Revocar la sesión vieja (idempotente: re-revocar no es error).
//  4. Crear una nueva sesión con un sessionID fresco.
//  5. Devolver la info necesaria para emitir el nuevo access/refresh pair
//     en la capa de transporte.
func (uc *RefreshSessionUseCase) Execute(
	ctx context.Context,
	dto RefreshSessionDTO,
) (RefreshSessionResponse, error) {
	if dto.RefreshClaims == nil {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}
	claims := dto.RefreshClaims

	tenantID, err := domain.ParseTenantID(claims.TenantID)
	if err != nil {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}

	userID, err := domain.ParseUserID(claims.UserID)
	if err != nil {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}

	// 1. Verificar que la sesión no esté revocada ni expirada.
	revoked, err := uc.sessionRepo.IsRevoked(ctx, claims.SessionID, tenantID)
	if err != nil {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}
	if revoked {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}

	// 2. Verificar que el usuario sigue activo en el tenant.
	user, err := uc.userRepo.FindByID(ctx, tenantID, userID)
	if err != nil || user == nil {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}
	if user.Status() == domain.UserStatusInactive {
		return RefreshSessionResponse{}, ErrRefreshTokenInvalid
	}

	// 3. Revocar la sesión vieja (rotation).
	if err := uc.sessionRepo.RevokeSession(ctx, claims.SessionID, tenantID); err != nil {
		return RefreshSessionResponse{}, err
	}

	// 4. Crear nueva sesión con sessionID fresco.
	newSessionID := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)
	if err := uc.sessionRepo.CreateSession(ctx, newSessionID, user.ID(), tenantID, expiresAt); err != nil {
		return RefreshSessionResponse{}, err
	}

	return RefreshSessionResponse{
		UserID:       user.ID().String(),
		TenantID:     tenantID.String(),
		Role:         user.Role(),
		NewSessionID: newSessionID,
		ExpiresAt:    expiresAt,
	}, nil
}

// --- LogoutUseCase ---

type LogoutUseCase struct {
	sessionRepo ports.SessionRepository
}

func NewLogoutUseCase(sessionRepo ports.SessionRepository) *LogoutUseCase {
	return &LogoutUseCase{
		sessionRepo: sessionRepo,
	}
}

func (uc *LogoutUseCase) Execute(ctx context.Context, sessionID string, tenantIDStr string) error {
	tenantID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		return err
	}
	return uc.sessionRepo.RevokeSession(ctx, sessionID, tenantID)
}

// --- ToggleUserStatusUseCase ---

type ToggleUserStatusDTO struct {
	TenantID      string
	TargetUserID  string
	AdminEmail    string
	AdminPassword string
	NewStatus     string
}

type ToggleUserStatusUseCase struct {
	userRepo ports.UserRepository
	hasher   ports.PasswordHasher
}

func NewToggleUserStatusUseCase(userRepo ports.UserRepository, hasher ports.PasswordHasher) *ToggleUserStatusUseCase {
	return &ToggleUserStatusUseCase{
		userRepo: userRepo,
		hasher:   hasher,
	}
}

func (uc *ToggleUserStatusUseCase) Execute(ctx context.Context, dto ToggleUserStatusDTO) error {
	tenantID, err := domain.ParseTenantID(dto.TenantID)
	if err != nil {
		return err
	}

	targetUserID, err := domain.ParseUserID(dto.TargetUserID)
	if err != nil {
		return err
	}

	// 1. Validar la identidad y privilegios del Administrador que ejecuta
	admin, err := uc.userRepo.FindByEmail(ctx, tenantID, dto.AdminEmail)
	if err != nil {
		return err
	}
	if admin == nil {
		return ErrInvalidAdminCredentials
	}

	match, err := uc.hasher.Verify(dto.AdminPassword, admin.PasswordHash())
	if err != nil || !match {
		return ErrInvalidAdminCredentials
	}

	if admin.Role() != domain.UserRoleSuperAdmin {
		return ErrUnauthorizedAction
	}

	// 2. Realizar actualización de estado
	status := domain.UserStatus(dto.NewStatus)
	if !status.IsValid() {
		return domain.ErrInvalidUserStatus
	}

	return uc.userRepo.UpdateStatus(ctx, tenantID, targetUserID, status)
}
