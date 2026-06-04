package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// SetupTenantRequest define la petición HTTP para inicializar un tenant.
type SetupTenantRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Phone     string `json:"phone"`
}

// LoginRequest define las credenciales del login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ToggleStatusRequest define la confirmación para deshabilitar usuarios.
type ToggleStatusRequest struct {
	AdminPassword string `json:"admin_password"`
	NewStatus     string `json:"new_status"`
}

// AuthHandler expone los endpoints HTTP para la autenticación y control de usuarios.
type AuthHandler struct {
	setupTenantUC      *usecases.SetupTenantUseCase
	loginUC            *usecases.LoginUseCase
	logoutUC           *usecases.LogoutUseCase
	toggleUserStatusUC *usecases.ToggleUserStatusUseCase
	userRepo           ports.UserRepository
	jwtService         *crypto.JWTService
	authMiddleware     *AuthMiddleware
}

// NewAuthHandler construye una instancia de AuthHandler.
func NewAuthHandler(
	setupTenantUC *usecases.SetupTenantUseCase,
	loginUC *usecases.LoginUseCase,
	logoutUC *usecases.LogoutUseCase,
	toggleUserStatusUC *usecases.ToggleUserStatusUseCase,
	userRepo ports.UserRepository,
	jwtService *crypto.JWTService,
	authMiddleware *AuthMiddleware,
) *AuthHandler {
	return &AuthHandler{
		setupTenantUC:      setupTenantUC,
		loginUC:            loginUC,
		logoutUC:           logoutUC,
		toggleUserStatusUC: toggleUserStatusUC,
		userRepo:           userRepo,
		jwtService:         jwtService,
		authMiddleware:     authMiddleware,
	}
}

// RegisterRoutes registra los endpoints de autenticación en Chi.
func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.With(TenantExtractor).Post("/api/v1/auth/setup", h.SetupTenant)
	r.With(TenantExtractor, NewLoginRateLimiter()).Post("/api/v1/auth/login", h.Login)
	r.With(TenantExtractor, h.authMiddleware.Handler).Post("/api/v1/auth/logout", h.Logout)
	r.With(TenantExtractor, h.authMiddleware.Handler).Put("/api/v1/auth/users/{id}/status", h.ToggleStatus)
}

// SetupTenant maneja la creación del SuperAdmin inicial de un Tenant.
func (h *AuthHandler) SetupTenant(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	var req SetupTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición inválido o malformado"}`))
		return
	}

	dto := usecases.SetupTenantDTO{
		TenantID:  tenantID.String(),
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Password:  req.Password,
		Phone:     req.Phone,
	}

	resp, err := h.setupTenantUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// Login realiza la autenticación de credenciales e inyecta los tokens en cookies seguras HTTP-Only.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición inválido o malformado"}`))
		return
	}

	dto := usecases.LoginDTO{
		TenantID: tenantID.String(),
		Email:    req.Email,
		Password: req.Password,
	}

	resp, err := h.loginUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	// Si se requiere MFA, no emitimos las cookies todavía (estado intermedio)
	if resp.RequiresMFA {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"requires_mfa": true,
			"user_id":      resp.UserID,
		})
		return
	}

	// Obtener el rol del usuario para incluirlo en el token
	userID, _ := domain.ParseUserID(resp.UserID)
	user, err := h.userRepo.FindByID(r.Context(), tenantID, userID)
	if err != nil || user == nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al recuperar datos del perfil del usuario"}`))
		return
	}

	// Generar tokens de sesión
	accessToken, err := h.jwtService.GenerateAccessToken(user.ID(), tenantID, user.Role(), resp.SessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al generar token de acceso"}`))
		return
	}

	refreshToken, err := h.jwtService.GenerateRefreshToken(user.ID(), tenantID, resp.SessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al generar token de refresco"}`))
		return
	}

	// Establecer Cookie de Access Token (15 minutos)
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	// Establecer Cookie de Refresh Token (7 días)
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"requires_mfa": false,
		"user_id":      resp.UserID,
		"message":      "Autenticación exitosa",
	})
}

// Logout cierra la sesión revocándola y destruyendo las cookies HTTP-Only de sesión.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID ausente"}`))
		return
	}

	sessionIDVal := r.Context().Value(SessionIDKey)
	sessionID, ok := sessionIDVal.(string)
	if !ok || sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"ID de sesión ausente"}`))
		return
	}

	err := h.logoutUC.Execute(r.Context(), sessionID, tenantID.String())
	if err != nil {
		h.handleError(w, err)
		return
	}

	// Destruir cookies
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"message":"Sesión cerrada correctamente"}`))
}

// ToggleStatus cambia el estado activo/inactivo de un usuario.
func (h *AuthHandler) ToggleStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID ausente en el contexto"}`))
		return
	}

	// Recuperar ID de la cuenta que ejecuta (Administrador)
	adminIDVal := r.Context().Value(UserIDKey)
	adminID, ok := adminIDVal.(domain.UserID)
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"No autorizado: ID de administrador ausente"}`))
		return
	}

	// Buscar datos del administrador para obtener su email
	adminUser, err := h.userRepo.FindByID(r.Context(), tenantID, adminID)
	if err != nil || adminUser == nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al recuperar datos del perfil del administrador"}`))
		return
	}

	targetUserIDStr := chi.URLParam(r, "id")
	if targetUserIDStr == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro ID de usuario es obligatorio"}`))
		return
	}

	var req ToggleStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición inválido o malformado"}`))
		return
	}

	dto := usecases.ToggleUserStatusDTO{
		TenantID:      tenantID.String(),
		TargetUserID:  targetUserIDStr,
		AdminEmail:    adminUser.Email().Value(),
		AdminPassword: req.AdminPassword,
		NewStatus:     req.NewStatus,
	}

	err = h.toggleUserStatusUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"message":"Estado de usuario actualizado correctamente"}`))
}

func (h *AuthHandler) handleError(w http.ResponseWriter, err error) {
	if errors.Is(err, usecases.ErrTenantAlreadyInitialized) {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, usecases.ErrInvalidCredentials) || errors.Is(err, usecases.ErrInvalidAdminCredentials) {
		w.WriteHeader(http.StatusUnauthorized)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, usecases.ErrUnauthorizedAction) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, usecases.ErrUserInactive) {
		w.WriteHeader(http.StatusForbidden)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, domain.ErrInvalidEmail) ||
		errors.Is(err, domain.ErrInvalidPhone) ||
		errors.Is(err, domain.ErrInvalidUserRole) ||
		errors.Is(err, domain.ErrInvalidUserStatus) ||
		errors.Is(err, domain.ErrInvalidPassword) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error interno del servidor. Intente de nuevo más tarde."})
}
