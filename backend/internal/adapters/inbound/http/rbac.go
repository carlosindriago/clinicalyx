package http

import (
	"encoding/json"
	"net/http"

	"clinicalyx/backend/internal/core/domain"
)

// RequireRole devuelve un middleware que rechaza la petición con 403 Forbidden
// si el rol del usuario autenticado (inyectado por AuthMiddleware en el
// contexto bajo UserRoleKey) no se encuentra entre los roles permitidos.
//
// Debe aplicarse DESPUÉS de AuthMiddleware.Handler; si no hay un rol en el
// contexto (p. ej. porque AuthMiddleware no se ejecutó), se rechaza con 401.
//
// Defense-in-depth: este middleware no sustituye a la validación de rol a
// nivel de dominio/caso de uso. Se mantiene como barrera perimetral en la
// capa de transporte para evitar accesos accidentales.
func RequireRole(allowed ...domain.UserRole) func(http.Handler) http.Handler {
	allowedSet := make(map[domain.UserRole]struct{}, len(allowed))
	for _, r := range allowed {
		allowedSet[r] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			roleVal := r.Context().Value(UserRoleKey)
			role, ok := roleVal.(domain.UserRole)
			if !ok || role == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "No autorizado: rol de usuario ausente en el contexto",
				})
				return
			}

			if _, permitted := allowedSet[role]; !permitted {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(map[string]string{
					"error": "Acceso prohibido: el rol del usuario no tiene permiso para esta operación",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
