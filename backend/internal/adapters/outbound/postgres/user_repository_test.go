package postgres

import (
	"context"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
	_ "github.com/lib/pq"
)

func cleanAuthDatabase(t *testing.T) {
	_, err := adminDB.Exec("TRUNCATE TABLE tenants CASCADE;")
	if err != nil {
		t.Fatalf("error al truncar tabla tenants: %v", err)
	}
}

func TestPostgresUserRepository_Integration(t *testing.T) {
	cleanAuthDatabase(t)

	repo := NewPostgresUserRepository(testDB, cryptoService)
	sessionRepo := NewPostgresSessionRepository(testDB)
	ctx := context.Background()

	tenantA := domain.NewTenantID()
	tenantB := domain.NewTenantID()

	// Registrar tenants en la base de datos de pruebas
	_, err := adminDB.Exec("INSERT INTO tenants (id, name) VALUES ($1, 'Tenant A'), ($2, 'Tenant B')", tenantA.String(), tenantB.String())
	if err != nil {
		t.Fatalf("error pre-guardando tenants de prueba: %v", err)
	}

	// Crear usuario de prueba
	name, _ := domain.NewFullName("Carlos")
	lastName, _ := domain.NewFullName("Indriago")
	email, _ := domain.NewEmail("carlos@clinicalyx.com")
	phone, _ := domain.NewPhone("+51999888777")
	passwordHash := "$argon2id$v=19$..."

	userA, err := domain.NewUser(tenantA, name, lastName, email, passwordHash, phone, domain.UserRoleDoctor)
	if err != nil {
		t.Fatalf("error al instanciar usuario: %v", err)
	}

	t.Run("Guardar y buscar usuario por ID y Email exitosamente", func(t *testing.T) {
		err := repo.Save(ctx, userA)
		if err != nil {
			t.Fatalf("se esperaba guardar el usuario con éxito, se obtuvo: %v", err)
		}

		// Buscar por email
		retrievedEmail, err := repo.FindByEmail(ctx, tenantA, "carlos@clinicalyx.com")
		if err != nil {
			t.Fatalf("error al buscar por email: %v", err)
		}
		if retrievedEmail == nil {
			t.Fatal("se esperaba encontrar al usuario por email, se obtuvo nil")
		}
		if retrievedEmail.ID() != userA.ID() {
			t.Errorf("se esperaba ID %s, se obtuvo %s", userA.ID(), retrievedEmail.ID())
		}

		// Buscar por ID
		retrievedID, err := repo.FindByID(ctx, tenantA, userA.ID())
		if err != nil {
			t.Fatalf("error al buscar por ID: %v", err)
		}
		if retrievedID == nil {
			t.Fatal("se esperaba encontrar al usuario por ID, se obtuvo nil")
		}
	})

	t.Run("🚨 PRUEBA DE FUEGO RLS: Aislamiento de usuarios entre tenants", func(t *testing.T) {
		// Intentar recuperar el usuario del Tenant A usando la sesión del Tenant B
		retrievedAsB, err := repo.FindByID(ctx, tenantB, userA.ID())
		if err != nil {
			t.Fatalf("error al intentar buscar usuario como tenant B: %v", err)
		}
		if retrievedAsB != nil {
			t.Error("🚨 VIOLACIÓN DE SEGURIDAD RLS: El Tenant B pudo leer el usuario del Tenant A")
		}

		// Intentar buscar por email usando la sesión del Tenant B
		retrievedEmailAsB, err := repo.FindByEmail(ctx, tenantB, "carlos@clinicalyx.com")
		if err != nil {
			t.Fatalf("error al buscar por email como tenant B: %v", err)
		}
		if retrievedEmailAsB != nil {
			t.Error("🚨 VIOLACIÓN DE SEGURIDAD RLS: El Tenant B pudo buscar por email un usuario del Tenant A")
		}
	})

	t.Run("Actualizar estado de usuario y verificar cambios", func(t *testing.T) {
		err := repo.UpdateStatus(ctx, tenantA, userA.ID(), domain.UserStatusInactive)
		if err != nil {
			t.Fatalf("error al actualizar estado: %v", err)
		}

		retrieved, _ := repo.FindByID(ctx, tenantA, userA.ID())
		if retrieved.Status() != domain.UserStatusInactive {
			t.Errorf("se esperaba estado INACTIVE, se obtuvo %v", retrieved.Status())
		}
	})

	t.Run("Verificar HasUsers", func(t *testing.T) {
		hasUsers, err := repo.HasUsers(ctx, tenantA)
		if err != nil {
			t.Fatalf("error en HasUsers: %v", err)
		}
		if !hasUsers {
			t.Error("se esperaba HasUsers verdadero")
		}

		hasUsersB, err := repo.HasUsers(ctx, tenantB)
		if err != nil {
			t.Fatalf("error en HasUsers para tenant B: %v", err)
		}
		if hasUsersB {
			t.Error("se esperaba HasUsers falso para tenant B sin usuarios")
		}
	})

	t.Run("Gestión de sesión y verificación de revocación", func(t *testing.T) {
		sessionID := "session_token_xyz"
		expiresAt := time.Now().Add(1 * time.Hour)

		err := sessionRepo.CreateSession(ctx, sessionID, userA.ID(), tenantA, expiresAt)
		if err != nil {
			t.Fatalf("error al crear sesión: %v", err)
		}

		revoked, err := sessionRepo.IsRevoked(ctx, sessionID, tenantA)
		if err != nil {
			t.Fatalf("error al verificar revocación: %v", err)
		}
		if revoked {
			t.Error("se esperaba que la sesión no estuviera revocada")
		}

		// Revocar sesión
		err = sessionRepo.RevokeSession(ctx, sessionID, tenantA)
		if err != nil {
			t.Fatalf("error al revocar sesión: %v", err)
		}

		revokedPost, _ := sessionRepo.IsRevoked(ctx, sessionID, tenantA)
		if !revokedPost {
			t.Error("se esperaba que la sesión estuviera revocada")
		}
	})

	t.Run("🚨 PRUEBA DE FUEGO RLS: Aislamiento de sesiones entre tenants", func(t *testing.T) {
		sessionID := "session_token_abc"
		expiresAt := time.Now().Add(1 * time.Hour)

		_ = sessionRepo.CreateSession(ctx, sessionID, userA.ID(), tenantA, expiresAt)

		// Intentar verificar revocación como Tenant B (debería retornar que está revocada o no existe)
		revokedAsB, err := sessionRepo.IsRevoked(ctx, sessionID, tenantB)
		if err != nil {
			t.Fatalf("error al verificar revocación como tenant B: %v", err)
		}
		if !revokedAsB {
			t.Error("🚨 VIOLACIÓN DE SEGURIDAD RLS: El Tenant B pudo leer la sesión activa del Tenant A")
		}

		// Intentar revocar sesión como Tenant B (no debería poder revocarla ya que RLS no lo permite)
		err = sessionRepo.RevokeSession(ctx, sessionID, tenantB)
		if err != nil {
			t.Fatalf("error al intentar revocar sesión como tenant B: %v", err)
		}

		// Validar que la sesión sigue activa para el Tenant A
		revokedPost, _ := sessionRepo.IsRevoked(ctx, sessionID, tenantA)
		if revokedPost {
			t.Error("la sesión no debería haber sido revocada por el Tenant B")
		}
	})
}
