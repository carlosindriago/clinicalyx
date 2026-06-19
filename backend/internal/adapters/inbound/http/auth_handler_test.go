package http

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// MockUserRepositoryAuth implementa ports.UserRepository en memoria para pruebas del handler.
type MockUserRepositoryAuth struct {
	users    map[string]*domain.User
	hasUsers bool
}

func (m *MockUserRepositoryAuth) Save(ctx context.Context, user *domain.User) error {
	m.users[user.TenantID().String()+":"+user.Email().Value()] = user
	m.users[user.TenantID().String()+":id:"+user.ID().String()] = user
	m.hasUsers = true
	return nil
}

func (m *MockUserRepositoryAuth) FindByEmail(ctx context.Context, tenantID domain.TenantID, email string) (*domain.User, error) {
	user, exists := m.users[tenantID.String()+":"+email]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *MockUserRepositoryAuth) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.UserID) (*domain.User, error) {
	user, exists := m.users[tenantID.String()+":id:"+id.String()]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *MockUserRepositoryAuth) UpdateStatus(ctx context.Context, tenantID domain.TenantID, id domain.UserID, status domain.UserStatus) error {
	user, _ := m.FindByID(ctx, tenantID, id)
	if user == nil {
		return errors.New("user not found")
	}
	updatedUser := domain.UnmarshalUser(
		user.ID(),
		user.TenantID(),
		user.Name(),
		user.LastName(),
		user.Email(),
		user.PasswordHash(),
		user.Phone(),
		user.Role(),
		status,
		user.MFAEnabled(),
		user.MFASecret(),
		user.CreatedAt(),
		time.Now(),
	)
	m.users[tenantID.String()+":"+user.Email().Value()] = updatedUser
	m.users[tenantID.String()+":id:"+user.ID().String()] = updatedUser
	return nil
}

func (m *MockUserRepositoryAuth) HasUsers(ctx context.Context, tenantID domain.TenantID) (bool, error) {
	return m.hasUsers, nil
}

// MockSessionRepositoryAuth implementa ports.SessionRepository para pruebas del handler.
type MockSessionRepositoryAuth struct {
	sessions map[string]bool
}

func (m *MockSessionRepositoryAuth) CreateSession(ctx context.Context, sessionID string, userID domain.UserID, tenantID domain.TenantID, expiresAt time.Time) error {
	m.sessions[sessionID] = false
	return nil
}

func (m *MockSessionRepositoryAuth) RevokeSession(ctx context.Context, sessionID string, tenantID domain.TenantID) error {
	m.sessions[sessionID] = true
	return nil
}

func (m *MockSessionRepositoryAuth) IsRevoked(ctx context.Context, sessionID string, tenantID domain.TenantID) (bool, error) {
	revoked, exists := m.sessions[sessionID]
	if !exists {
		return true, nil
	}
	return revoked, nil
}

// MockPasswordHasherAuth implementa ports.PasswordHasher para pruebas.
type MockPasswordHasherAuth struct{}

func (m *MockPasswordHasherAuth) Hash(password string) (string, error) {
	return "hashed_" + password, nil
}

func (m *MockPasswordHasherAuth) Verify(password, hash string) (bool, error) {
	return hash == "hashed_"+password, nil
}

func TestAuthHandler_Integration(t *testing.T) {
	tenantID := uuid.New().String()
	userRepo := &MockUserRepositoryAuth{users: make(map[string]*domain.User)}
	sessionRepo := &MockSessionRepositoryAuth{sessions: make(map[string]bool)}
	hasher := &MockPasswordHasherAuth{}

	// Configurar JWT
	jwtSecret := "thisisaverysecretkey32byteslong!"
	jwtService := crypto.NewJWTService(jwtSecret, 15*time.Minute, 24*time.Hour)
	authMiddleware := NewAuthMiddleware(jwtService, sessionRepo)

	// Instanciar Casos de Uso
	setupTenantUC := usecases.NewSetupTenantUseCase(userRepo, hasher)
	loginUC := usecases.NewLoginUseCase(userRepo, sessionRepo, hasher)
	logoutUC := usecases.NewLogoutUseCase(sessionRepo)
	refreshSessionUC := usecases.NewRefreshSessionUseCase(sessionRepo, userRepo)
	toggleUserStatusUC := usecases.NewToggleUserStatusUseCase(userRepo, hasher)

	handler := NewAuthHandler(context.Background(), setupTenantUC, loginUC, logoutUC, refreshSessionUC, toggleUserStatusUC, userRepo, jwtService, authMiddleware, nil)
	// Configurar el setup-token de bootstrap para habilitar el endpoint
	// en el test (en producción se inyecta desde SETUP_TOKEN en .env).
	const testSetupToken = "thisisaverysecrettoken32bytes_long!"
	handler.SetSetupTokenMiddleware(testSetupToken)
	r := chi.NewRouter()
	handler.RegisterRoutes(r)

	t.Run("0. Setup Tenant sin token retorna 401", func(t *testing.T) {
		body := map[string]string{
			"first_name": "Carlos",
			"last_name":  "Indriago",
			"email":      "should-not-be-created@clinicalyx.com",
			"password":   "supersecure123",
			"phone":      "+51999888777",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/setup", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("sin token se esperaba 401, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("1. Setup Tenant Exitoso con token válido (Crea primer SUPERADMIN)", func(t *testing.T) {
		body := map[string]string{
			"first_name": "Carlos",
			"last_name":  "Indriago",
			"email":      "admin@clinicalyx.com",
			"password":   "supersecure123",
			"phone":      "+51999888777",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/setup", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Setup-Token", testSetupToken)

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusCreated {
			t.Errorf("se esperaba status 201, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("2. Login Exitoso con Cookies HTTP-Only", func(t *testing.T) {
		body := map[string]string{
			"email":    "admin@clinicalyx.com",
			"password": "supersecure123",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("se esperaba status 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}

		// Validar que se inyectaron las cookies access_token y refresh_token
		resp := w.Result()
		cookies := resp.Cookies()

		var hasAccessToken, hasRefreshToken bool
		for _, cookie := range cookies {
			if cookie.Name == "access_token" {
				hasAccessToken = true
				if !cookie.HttpOnly || !cookie.Secure || cookie.SameSite != http.SameSiteStrictMode {
					t.Error("cookie access_token carece de atributos de seguridad nivel bancario")
				}
			}
			if cookie.Name == "refresh_token" {
				hasRefreshToken = true
			}
		}

		if !hasAccessToken || !hasRefreshToken {
			t.Error("faltan cookies de sesión en la respuesta del login")
		}
	})

	t.Run("3. Login fallido por credenciales inválidas", func(t *testing.T) {
		body := map[string]string{
			"email":    "admin@clinicalyx.com",
			"password": "wrong_password",
		}
		jsonBody, _ := json.Marshal(body)

		req, _ := http.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(jsonBody))
		req.Header.Set("X-Tenant-ID", tenantID)
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("se esperaba status 401, se obtuvo %d", w.Code)
		}
	})
}
