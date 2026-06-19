package http

import (
	"context"
	"crypto/subtle"
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
	refreshSessionUC   *usecases.RefreshSessionUseCase
	toggleUserStatusUC *usecases.ToggleUserStatusUseCase
	userRepo           ports.UserRepository
	jwtService         *crypto.JWTService
	authMiddleware     *AuthMiddleware
	loginRateLimiter   func(http.Handler) http.Handler
	setupTokenMW       func(http.Handler) http.Handler
	trustedProxies     *trustedProxies
}

// NewAuthHandler construye una instancia de AuthHandler.
//
// Si trustedProxies es nil o está vacío, el rate limiter de login usará
// siempre RemoteAddr (modo seguro por defecto).
func NewAuthHandler(
	ctx context.Context,
	setupTenantUC *usecases.SetupTenantUseCase,
	loginUC *usecases.LoginUseCase,
	logoutUC *usecases.LogoutUseCase,
	refreshSessionUC *usecases.RefreshSessionUseCase,
	toggleUserStatusUC *usecases.ToggleUserStatusUseCase,
	userRepo ports.UserRepository,
	jwtService *crypto.JWTService,
	authMiddleware *AuthMiddleware,
	trustedProxies *trustedProxies,
) *AuthHandler {
	return &AuthHandler{
		setupTenantUC:      setupTenantUC,
		loginUC:            loginUC,
		logoutUC:           logoutUC,
		refreshSessionUC:   refreshSessionUC,
		toggleUserStatusUC: toggleUserStatusUC,
		userRepo:           userRepo,
		jwtService:         jwtService,
		authMiddleware:     authMiddleware,
		loginRateLimiter:   NewLoginRateLimiter(ctx, trustedProxies),
		trustedProxies:     trustedProxies,
		// setupTokenMW queda nil hasta que main.go llame a
		// SetSetupTokenMiddleware. El getter setupTokenMiddleware() aplica
		// un fail-closed por defecto.
	}
}

// SetSetupTokenMiddleware inyecta el middleware que valida el header
// X-Setup-Token contra el token configurado en el arranque. Si
// expectedToken está vacío, el endpoint /api/v1/auth/setup queda cerrado
// (responde 503), porque un SetupTenant sin gate es un riesgo crítico
// de tenant-takeover.
func (h *AuthHandler) SetSetupTokenMiddleware(expectedToken string) {
	if expectedToken == "" {
		h.setupTokenMW = func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Endpoint deshabilitado: el bootstrap de tenant no está configurado (SETUP_TOKEN ausente)",
				})
			})
		}
		return
	}

	// Captura el token esperado en el closure para evitar condiciones de carrera
	// si el handler fuera reconfigurado en caliente.
	expected := []byte(expectedToken)
	h.setupTokenMW = func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			provided := []byte(r.Header.Get("X-Setup-Token"))
			// subtle.ConstantTimeCompare requiere slices de igual longitud.
			// Si las longitudes difieren, devolvemos 401 sin filtrar info
			// sobre la longitud esperada.
			if len(provided) != len(expected) || subtle.ConstantTimeCompare(provided, expected) != 1 {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "No autorizado: token de bootstrap inválido o ausente",
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// setupTokenMiddleware devuelve el middleware configurado por SetSetupTokenMiddleware.
// Si no se ha configurado, se aplica un middleware fail-closed que rechaza
// todas las peticiones con 503. Esto evita que el endpoint quede abierto
// si el operador olvida inyectar el SETUP_TOKEN.
func (h *AuthHandler) setupTokenMiddleware() func(http.Handler) http.Handler {
	if h.setupTokenMW == nil {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusServiceUnavailable)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Endpoint deshabilitado: el bootstrap de tenant no está configurado",
				})
			})
		}
	}
	return h.setupTokenMW
}

// RegisterRoutes registra los endpoints de autenticación en Chi.
func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.With(TenantExtractor, h.setupTokenMiddleware()).Post("/api/v1/auth/setup", h.SetupTenant)
	r.With(TenantExtractor, h.loginRateLimiter).Post("/api/v1/auth/login", h.Login)
	// Refresh: lee el refresh_token de la cookie HttpOnly, valida la
	// firma, verifica que la sesión no esté revocada, rota (revoca la
	// vieja + crea una nueva) y emite un par nuevo de access/refresh.
	// El tenant se extrae del JWT firmado criptográficamente, NO del
	// header X-Tenant-ID (que el cliente puede falsificar).
	r.With(TenantExtractor).Post("/api/v1/auth/refresh", h.Refresh)
	r.With(TenantExtractor, h.authMiddleware.Handler).Post("/api/v1/auth/logout", h.Logout)
	r.With(TenantExtractor, h.authMiddleware.Handler, RequireRole(domain.UserRoleSuperAdmin)).Put("/api/v1/auth/users/{id}/status", h.ToggleStatus)
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

	// El rol viaja en LoginResponse desde el LoginUseCase, evitando una
	// segunda consulta al repositorio de usuarios en la capa de transporte.
	userID, _ := domain.ParseUserID(resp.UserID)

	// Generar tokens de sesión
	accessToken, err := h.jwtService.GenerateAccessToken(userID, tenantID, resp.Role, resp.SessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al generar token de acceso"}`))
		return
	}

	refreshToken, err := h.jwtService.GenerateRefreshToken(userID, tenantID, resp.SessionID)
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

// Refresh implementa POST /api/v1/auth/refresh con rotación de refresh
// token. Lee el refresh_token de la cookie HttpOnly (NO del body, para
// evitar que sea exfiltrado por XSS), valida la firma, ejecuta la
// rotación (revoca la sesión vieja y crea una nueva) y emite un par
// fresco de access_token y refresh_token en cookies HttpOnly.
//
// Si el refresh token es inválido, expirado, o la sesión fue revocada,
// devuelve 401 sin filtrar la causa específica. Tras un 401, el cliente
// debe re-loguear.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Extraer el refresh_token de la cookie HttpOnly.
	cookie, err := r.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"No autorizado: refresh token ausente"}`))
		return
	}

	// 2. Validar firma y claims del JWT.
	claims, err := h.jwtService.ValidateToken(cookie.Value)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"No autorizado: refresh token inválido o expirado"}`))
		return
	}

	// 3. Ejecutar la rotación en el caso de uso. ErrRefreshTokenInvalid
	// se traduce a 401; cualquier otro error a 500.
	resp, err := h.refreshSessionUC.Execute(r.Context(), usecases.RefreshSessionDTO{
		RefreshClaims: claims,
	})
	if err != nil {
		if errors.Is(err, usecases.ErrRefreshTokenInvalid) {
			// Limpiar las cookies potencialmente obsoletas para que el
			// cliente no siga reintentando con tokens viejos.
			h.clearAuthCookies(w)
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: refresh token inválido, expirado o revocado"}`))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al refrescar la sesión"}`))
		return
	}

	// 4. Generar el nuevo par de tokens.
	userID, _ := domain.ParseUserID(resp.UserID)
	tenantID, _ := domain.ParseTenantID(resp.TenantID)

	accessToken, err := h.jwtService.GenerateAccessToken(userID, tenantID, resp.Role, resp.NewSessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al generar access token"}`))
		return
	}

	refreshToken, err := h.jwtService.GenerateRefreshToken(userID, tenantID, resp.NewSessionID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Error al generar refresh token"}`))
		return
	}

	// 5. Sobrescribir las cookies con el par nuevo.
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
	})
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
		"message":     "Sesión refrescada correctamente",
		"user_id":     resp.UserID,
		"tenant_id":   resp.TenantID,
		"expires_at":  resp.ExpiresAt.UTC().Format(time.RFC3339),
	})
}

// clearAuthCookies elimina ambas cookies de sesión. Se usa en el
// endpoint /refresh cuando el token presentado es inválido, para
// forzar al cliente a re-loguear limpiamente.
func (h *AuthHandler) clearAuthCookies(w http.ResponseWriter) {
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
}
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
