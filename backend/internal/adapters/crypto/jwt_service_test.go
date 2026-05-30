package crypto_test

import (
	"testing"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
)

func TestJWTService(t *testing.T) {
	secret := "secretKeyForTestTokenFailsWithLength!"
	svc := crypto.NewJWTService(secret, 5*time.Minute, 1*time.Hour)

	userID := domain.NewUserID()
	tenantID := domain.NewTenantID()
	role := domain.UserRoleDoctor
	sessionID := "sess_12345"

	t.Run("Generación y validación de Access Token exitosa", func(t *testing.T) {
		token, err := svc.GenerateAccessToken(userID, tenantID, role, sessionID)
		if err != nil {
			t.Fatalf("no se esperaba error al generar access token: %v", err)
		}

		claims, err := svc.ValidateToken(token)
		if err != nil {
			t.Fatalf("no se esperaba error al validar token: %v", err)
		}

		if claims.UserID != userID.String() {
			t.Errorf("se esperaba UserID %q, se obtuvo %q", userID.String(), claims.UserID)
		}

		if claims.TenantID != tenantID.String() {
			t.Errorf("se esperaba TenantID %q, se obtuvo %q", tenantID.String(), claims.TenantID)
		}

		if claims.Role != string(role) {
			t.Errorf("se esperaba Role %q, se obtuvo %q", string(role), claims.Role)
		}

		if claims.SessionID != sessionID {
			t.Errorf("se esperaba SessionID %q, se obtuvo %q", sessionID, claims.SessionID)
		}
	})

	t.Run("Generación y validación de Refresh Token exitosa", func(t *testing.T) {
		token, err := svc.GenerateRefreshToken(userID, tenantID, sessionID)
		if err != nil {
			t.Fatalf("no se esperaba error al generar refresh token: %v", err)
		}

		claims, err := svc.ValidateToken(token)
		if err != nil {
			t.Fatalf("no se esperaba error al validar token: %v", err)
		}

		if claims.UserID != userID.String() {
			t.Errorf("se esperaba UserID %q, se obtuvo %q", userID.String(), claims.UserID)
		}

		if claims.SessionID != sessionID {
			t.Errorf("se esperaba SessionID %q, se obtuvo %q", sessionID, claims.SessionID)
		}
	})
}
