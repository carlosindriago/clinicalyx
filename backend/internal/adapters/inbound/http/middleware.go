package http

import (
	"context"
	"net/http"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
	"github.com/google/uuid"
)

type contextKey string

const (
	TenantIDKey  contextKey = "tenant_id"
	UserIDKey    contextKey = "user_id"
	UserRoleKey  contextKey = "user_role"
	SessionIDKey contextKey = "session_id"
)

// TenantExtractor extrae el tenant_id del header X-Tenant-ID y lo inyecta en el contexto de la petición.
func TenantExtractor(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tenantIDStr := r.Header.Get("X-Tenant-ID")
		if tenantIDStr == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"El header X-Tenant-ID es obligatorio"}`))
			return
		}

		if _, err := uuid.Parse(tenantIDStr); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"El header X-Tenant-ID debe ser un UUID válido"}`))
			return
		}

		tenantID, err := domain.ParseTenantID(tenantIDStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_, _ = w.Write([]byte(`{"error":"` + err.Error() + `"}`))
			return
		}

		ctx := context.WithValue(r.Context(), TenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AuthMiddleware intercepta y valida la identidad del usuario a través de cookies HTTP-Only y fallback de cabecera.
type AuthMiddleware struct {
	jwtService  *crypto.JWTService
	sessionRepo ports.SessionRepository
}

// NewAuthMiddleware inicializa el middleware de autenticación con sus dependencias.
func NewAuthMiddleware(jwtService *crypto.JWTService, sessionRepo ports.SessionRepository) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService:  jwtService,
		sessionRepo: sessionRepo,
	}
}

// Handler valida la sesión activa y expone los claims en el contexto de Go.
func (m *AuthMiddleware) Handler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var tokenStr string

		// 1. Intentar leer desde Cookie "access_token"
		cookie, err := r.Cookie("access_token")
		if err == nil {
			tokenStr = cookie.Value
		}

		// 2. Fallback a la cabecera Authorization (Bearer Token)
		if tokenStr == "" {
			authHeader := r.Header.Get("Authorization")
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				tokenStr = authHeader[7:]
			}
		}

		if tokenStr == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: Token de autenticación ausente"}`))
			return
		}

		// 3. Validar firmas y expiración del JWT
		claims, err := m.jwtService.ValidateToken(tokenStr)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: Token inválido o expirado"}`))
			return
		}

		// 4. Reconstitución de identificadores tipados
		userID, err := domain.ParseUserID(claims.UserID)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: ID de usuario inválido"}`))
			return
		}

		tenantID, err := domain.ParseTenantID(claims.TenantID)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: ID de tenant inválido"}`))
			return
		}

		// 5. Validar revocación contra el SessionRepository
		revoked, err := m.sessionRepo.IsRevoked(r.Context(), claims.SessionID, tenantID)
		if err != nil || revoked {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":"No autorizado: Sesión revocada o inactiva"}`))
			return
		}

		// 6. Inyectar claims en el contexto
		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, userID)
		ctx = context.WithValue(ctx, TenantIDKey, tenantID)
		ctx = context.WithValue(ctx, UserRoleKey, domain.UserRole(claims.Role))
		ctx = context.WithValue(ctx, SessionIDKey, claims.SessionID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
