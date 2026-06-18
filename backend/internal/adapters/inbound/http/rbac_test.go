package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"clinicalyx/backend/internal/core/domain"
)

// withRole devuelve un nuevo contexto que contiene el UserRoleKey,
// simulando lo que hace AuthMiddleware.Handler tras validar el JWT.
func withRole(parent context.Context, role domain.UserRole) context.Context {
	return context.WithValue(parent, UserRoleKey, role)
}

// withUserID inyecta el UserIDKey en el contexto, simulando la identidad
// del usuario autenticado. Se usa combinado con withRole para emular
// completamente el estado que produce AuthMiddleware.
func withUserID(parent context.Context, id domain.UserID) context.Context {
	return context.WithValue(parent, UserIDKey, id)
}

func TestRequireRole(t *testing.T) {
	t.Run("Rechaza con 401 si no hay rol en el contexto", func(t *testing.T) {
		mw := RequireRole(domain.UserRoleDoctor)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		w := httptest.NewRecorder()
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("no debe llegar al handler sin rol")
		})).ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("se esperaba 401, se obtuvo %d", w.Code)
		}
	})

	t.Run("Rechaza con 403 si el rol no está permitido", func(t *testing.T) {
		mw := RequireRole(domain.UserRoleDoctor)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req = req.WithContext(withRole(req.Context(), domain.UserRoleReceptionist))
		w := httptest.NewRecorder()
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("no debe llegar al handler con rol no permitido")
		})).ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Errorf("se esperaba 403, se obtuvo %d", w.Code)
		}
	})

	t.Run("Permite el paso si el rol está en la lista permitida", func(t *testing.T) {
		called := false
		mw := RequireRole(domain.UserRoleDoctor, domain.UserRoleSuperAdmin)
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req = req.WithContext(withRole(req.Context(), domain.UserRoleDoctor))
		w := httptest.NewRecorder()
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
			w.WriteHeader(http.StatusOK)
		})).ServeHTTP(w, req)

		if !called {
			t.Error("el handler siguiente debió haberse ejecutado")
		}
		if w.Code != http.StatusOK {
			t.Errorf("se esperaba 200, se obtuvo %d", w.Code)
		}
	})

	t.Run("Permite múltiples roles en la lista", func(t *testing.T) {
		for _, role := range []domain.UserRole{domain.UserRoleSuperAdmin, domain.UserRoleDoctor, domain.UserRoleNurse, domain.UserRoleReceptionist} {
			mw := RequireRole(domain.UserRoleSuperAdmin, domain.UserRoleDoctor, domain.UserRoleNurse, domain.UserRoleReceptionist)
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req = req.WithContext(withRole(req.Context(), role))
			w := httptest.NewRecorder()
			called := false
			mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
			})).ServeHTTP(w, req)

			if !called {
				t.Errorf("rol %q debió pasar la verificación", role)
			}
		}
	})
}
