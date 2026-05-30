package usecases_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/google/uuid"
)

// MockUserRepository implementa ports.UserRepository en memoria para pruebas.
type MockUserRepository struct {
	users    map[string]*domain.User
	saveErr  error
	findErr  error
	hasUsers bool
}

func NewMockUserRepository() *MockUserRepository {
	return &MockUserRepository{
		users: make(map[string]*domain.User),
	}
}

func (m *MockUserRepository) Save(ctx context.Context, user *domain.User) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	m.users[user.TenantID().String()+":"+user.Email().Value()] = user
	m.users[user.TenantID().String()+":id:"+user.ID().String()] = user
	m.hasUsers = true
	return nil
}

func (m *MockUserRepository) FindByEmail(ctx context.Context, tenantID domain.TenantID, email string) (*domain.User, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	user, exists := m.users[tenantID.String()+":"+email]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *MockUserRepository) FindByID(ctx context.Context, tenantID domain.TenantID, id domain.UserID) (*domain.User, error) {
	if m.findErr != nil {
		return nil, m.findErr
	}
	user, exists := m.users[tenantID.String()+":id:"+id.String()]
	if !exists {
		return nil, nil
	}
	return user, nil
}

func (m *MockUserRepository) UpdateStatus(ctx context.Context, tenantID domain.TenantID, id domain.UserID, status domain.UserStatus) error {
	user, err := m.FindByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}
	// Reconstituimos el usuario modificado
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

func (m *MockUserRepository) HasUsers(ctx context.Context, tenantID domain.TenantID) (bool, error) {
	return m.hasUsers, nil
}

// MockSessionRepository implementa ports.SessionRepository en memoria para pruebas.
type MockSessionRepository struct {
	sessions map[string]bool // sessionID -> revoked
}

func NewMockSessionRepository() *MockSessionRepository {
	return &MockSessionRepository{
		sessions: make(map[string]bool),
	}
}

func (m *MockSessionRepository) CreateSession(ctx context.Context, sessionID string, userID domain.UserID, tenantID domain.TenantID, expiresAt time.Time) error {
	m.sessions[sessionID] = false
	return nil
}

func (m *MockSessionRepository) RevokeSession(ctx context.Context, sessionID string, tenantID domain.TenantID) error {
	m.sessions[sessionID] = true
	return nil
}

func (m *MockSessionRepository) IsRevoked(ctx context.Context, sessionID string, tenantID domain.TenantID) (bool, error) {
	revoked, exists := m.sessions[sessionID]
	if !exists {
		return true, nil
	}
	return revoked, nil
}

// MockPasswordHasher implementa ports.PasswordHasher en memoria para pruebas.
type MockPasswordHasher struct{}

func (m *MockPasswordHasher) Hash(password string) (string, error) {
	return "hashed_" + password, nil
}

func (m *MockPasswordHasher) Verify(password, hash string) (bool, error) {
	return hash == "hashed_"+password, nil
}

func TestSetupTenantUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()

	t.Run("Inicialización exitosa del primer SUPERADMIN", func(t *testing.T) {
		repo := NewMockUserRepository()
		hasher := &MockPasswordHasher{}
		uc := usecases.NewSetupTenantUseCase(repo, hasher)

		dto := usecases.SetupTenantDTO{
			TenantID:  tenantID.String(),
			FirstName: "Carlos",
			LastName:  "Indriago",
			Email:     "carlos@clinicalyx.com",
			Password:  "password123",
			Phone:     "+51999888777",
		}

		resp, err := uc.Execute(context.Background(), dto)
		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		if resp.UserID == "" {
			t.Fatal("se esperaba el UserID de retorno")
		}

		// Validar que el usuario fue guardado como SUPERADMIN
		user, _ := repo.FindByID(context.Background(), tenantID, domain.UserID(uuid.MustParse(resp.UserID)))
		if user == nil {
			t.Fatal("el usuario no fue persistido")
		}
		if user.Role() != domain.UserRoleSuperAdmin {
			t.Errorf("se esperaba el rol SUPERADMIN, se obtuvo: %v", user.Role())
		}
	})

	t.Run("Falla si el Tenant ya cuenta con usuarios registrados", func(t *testing.T) {
		repo := NewMockUserRepository()
		repo.hasUsers = true // Simulamos que ya existen usuarios
		hasher := &MockPasswordHasher{}
		uc := usecases.NewSetupTenantUseCase(repo, hasher)

		dto := usecases.SetupTenantDTO{
			TenantID:  tenantID.String(),
			FirstName: "Carlos",
			LastName:  "Indriago",
			Email:     "carlos@clinicalyx.com",
			Password:  "password123",
			Phone:     "+51999888777",
		}

		_, err := uc.Execute(context.Background(), dto)
		if !errors.Is(err, usecases.ErrTenantAlreadyInitialized) {
			t.Errorf("se esperaba error %v, se obtuvo: %v", usecases.ErrTenantAlreadyInitialized, err)
		}
	})
}

func TestLoginUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	hasher := &MockPasswordHasher{}
	password := "securePass123"
	hashedPassword, _ := hasher.Hash(password)

	t.Run("Login exitoso sin MFA", func(t *testing.T) {
		repo := NewMockUserRepository()
		sessionRepo := NewMockSessionRepository()
		
		// Registrar usuario activo
		name, _ := domain.NewFullName("Carlos")
		lastName, _ := domain.NewFullName("Indriago")
		email, _ := domain.NewEmail("carlos@clinicalyx.com")
		phone, _ := domain.NewPhone("+51999888777")
		user, _ := domain.NewUser(tenantID, name, lastName, email, hashedPassword, phone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), user)

		uc := usecases.NewLoginUseCase(repo, sessionRepo, hasher)
		resp, err := uc.Execute(context.Background(), usecases.LoginDTO{
			TenantID: tenantID.String(),
			Email:    "carlos@clinicalyx.com",
			Password: password,
		})

		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		if resp.RequiresMFA {
			t.Error("no se esperaba requerimiento de MFA")
		}

		if resp.SessionID == "" {
			t.Error("se esperaba una SessionID de retorno")
		}
	})

	t.Run("Login con requerimiento de MFA (estado intermedio)", func(t *testing.T) {
		repo := NewMockUserRepository()
		sessionRepo := NewMockSessionRepository()
		
		name, _ := domain.NewFullName("Carlos")
		lastName, _ := domain.NewFullName("Indriago")
		email, _ := domain.NewEmail("carlos@clinicalyx.com")
		phone, _ := domain.NewPhone("+51999888777")
		user, _ := domain.NewUser(tenantID, name, lastName, email, hashedPassword, phone, domain.UserRoleDoctor)
		user.EnableMFA("TOTPSECRETKEY")
		_ = repo.Save(context.Background(), user)

		uc := usecases.NewLoginUseCase(repo, sessionRepo, hasher)
		resp, err := uc.Execute(context.Background(), usecases.LoginDTO{
			TenantID: tenantID.String(),
			Email:    "carlos@clinicalyx.com",
			Password: password,
		})

		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		if !resp.RequiresMFA {
			t.Error("se esperaba requerimiento de MFA")
		}

		if resp.SessionID != "" {
			t.Error("no se debe generar sesión activa si falta verificar el código MFA")
		}
	})

	t.Run("Falla por contraseña incorrecta", func(t *testing.T) {
		repo := NewMockUserRepository()
		sessionRepo := NewMockSessionRepository()
		
		name, _ := domain.NewFullName("Carlos")
		lastName, _ := domain.NewFullName("Indriago")
		email, _ := domain.NewEmail("carlos@clinicalyx.com")
		phone, _ := domain.NewPhone("+51999888777")
		user, _ := domain.NewUser(tenantID, name, lastName, email, hashedPassword, phone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), user)

		uc := usecases.NewLoginUseCase(repo, sessionRepo, hasher)
		_, err := uc.Execute(context.Background(), usecases.LoginDTO{
			TenantID: tenantID.String(),
			Email:    "carlos@clinicalyx.com",
			Password: "wrong_password",
		})

		if !errors.Is(err, usecases.ErrInvalidCredentials) {
			t.Errorf("se esperaba error %v, se obtuvo %v", usecases.ErrInvalidCredentials, err)
		}
	})

	t.Run("Falla si el usuario está inactivo", func(t *testing.T) {
		repo := NewMockUserRepository()
		sessionRepo := NewMockSessionRepository()
		
		name, _ := domain.NewFullName("Carlos")
		lastName, _ := domain.NewFullName("Indriago")
		email, _ := domain.NewEmail("carlos@clinicalyx.com")
		phone, _ := domain.NewPhone("+51999888777")
		user, _ := domain.NewUser(tenantID, name, lastName, email, hashedPassword, phone, domain.UserRoleDoctor)
		_ = user.UpdateStatus(domain.UserStatusInactive)
		_ = repo.Save(context.Background(), user)

		uc := usecases.NewLoginUseCase(repo, sessionRepo, hasher)
		_, err := uc.Execute(context.Background(), usecases.LoginDTO{
			TenantID: tenantID.String(),
			Email:    "carlos@clinicalyx.com",
			Password: password,
		})

		if !errors.Is(err, usecases.ErrUserInactive) {
			t.Errorf("se esperaba error %v, se obtuvo %v", usecases.ErrUserInactive, err)
		}
	})
}

func TestLogoutUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	sessionID := "active_session_token_123"

	t.Run("Cierre de sesión exitoso", func(t *testing.T) {
		sessionRepo := NewMockSessionRepository()
		_ = sessionRepo.CreateSession(context.Background(), sessionID, domain.NewUserID(), tenantID, time.Now().Add(1*time.Hour))

		uc := usecases.NewLogoutUseCase(sessionRepo)
		err := uc.Execute(context.Background(), sessionID, tenantID.String())
		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		revoked, _ := sessionRepo.IsRevoked(context.Background(), sessionID, tenantID)
		if !revoked {
			t.Error("la sesión debería estar revocada")
		}
	})
}

func TestToggleUserStatusUseCase(t *testing.T) {
	tenantID := domain.NewTenantID()
	hasher := &MockPasswordHasher{}
	adminPassword := "adminSuperSecurePass123"
	adminHashed, _ := hasher.Hash(adminPassword)

	t.Run("Desactivación exitosa de usuario médico por SuperAdmin", func(t *testing.T) {
		repo := NewMockUserRepository()
		
		// Registrar SuperAdmin
		adminName, _ := domain.NewFullName("Super")
		adminLastName, _ := domain.NewFullName("Admin")
		adminEmail, _ := domain.NewEmail("admin@clinicalyx.com")
		adminPhone, _ := domain.NewPhone("+51999888777")
		admin, _ := domain.NewUser(tenantID, adminName, adminLastName, adminEmail, adminHashed, adminPhone, domain.UserRoleSuperAdmin)
		_ = repo.Save(context.Background(), admin)

		// Registrar Doctor a ser desactivado
		docName, _ := domain.NewFullName("Doctor")
		docLastName, _ := domain.NewFullName("Mora")
		docEmail, _ := domain.NewEmail("doctor@clinicalyx.com")
		docPhone, _ := domain.NewPhone("+51999888778")
		doctor, _ := domain.NewUser(tenantID, docName, docLastName, docEmail, "some_hash", docPhone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), doctor)

		uc := usecases.NewToggleUserStatusUseCase(repo, hasher)
		err := uc.Execute(context.Background(), usecases.ToggleUserStatusDTO{
			TenantID:      tenantID.String(),
			TargetUserID:  doctor.ID().String(),
			AdminEmail:    "admin@clinicalyx.com",
			AdminPassword: adminPassword,
			NewStatus:     string(domain.UserStatusInactive),
		})

		if err != nil {
			t.Fatalf("no se esperaba error, se obtuvo: %v", err)
		}

		// Verificar que el doctor esté inactivo
		updatedDoctor, _ := repo.FindByID(context.Background(), tenantID, doctor.ID())
		if updatedDoctor.Status() != domain.UserStatusInactive {
			t.Errorf("se esperaba estado INACTIVE, se obtuvo: %v", updatedDoctor.Status())
		}
	})

	t.Run("Falla si la contraseña del Administrador es inválida", func(t *testing.T) {
		repo := NewMockUserRepository()
		
		adminName, _ := domain.NewFullName("Super")
		adminLastName, _ := domain.NewFullName("Admin")
		adminEmail, _ := domain.NewEmail("admin@clinicalyx.com")
		adminPhone, _ := domain.NewPhone("+51999888777")
		admin, _ := domain.NewUser(tenantID, adminName, adminLastName, adminEmail, adminHashed, adminPhone, domain.UserRoleSuperAdmin)
		_ = repo.Save(context.Background(), admin)

		docName, _ := domain.NewFullName("Doctor")
		docLastName, _ := domain.NewFullName("Mora")
		docEmail, _ := domain.NewEmail("doctor@clinicalyx.com")
		docPhone, _ := domain.NewPhone("+51999888778")
		doctor, _ := domain.NewUser(tenantID, docName, docLastName, docEmail, "some_hash", docPhone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), doctor)

		uc := usecases.NewToggleUserStatusUseCase(repo, hasher)
		err := uc.Execute(context.Background(), usecases.ToggleUserStatusDTO{
			TenantID:      tenantID.String(),
			TargetUserID:  doctor.ID().String(),
			AdminEmail:    "admin@clinicalyx.com",
			AdminPassword: "incorrect_admin_password",
			NewStatus:     string(domain.UserStatusInactive),
		})

		if !errors.Is(err, usecases.ErrInvalidAdminCredentials) {
			t.Errorf("se esperaba error %v, se obtuvo %v", usecases.ErrInvalidAdminCredentials, err)
		}
	})

	t.Run("Falla si el ejecutor no posee el rol SUPERADMIN", func(t *testing.T) {
		repo := NewMockUserRepository()
		
		// Registrar un Doctor común como el supuesto "ejecutor"
		fakeAdminName, _ := domain.NewFullName("Fake")
		fakeAdminLastName, _ := domain.NewFullName("Admin")
		fakeAdminEmail, _ := domain.NewEmail("fake@clinicalyx.com")
		fakeAdminPhone, _ := domain.NewPhone("+51999888777")
		fakeAdmin, _ := domain.NewUser(tenantID, fakeAdminName, fakeAdminLastName, fakeAdminEmail, adminHashed, fakeAdminPhone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), fakeAdmin)

		docName, _ := domain.NewFullName("Doctor")
		docLastName, _ := domain.NewFullName("Mora")
		docEmail, _ := domain.NewEmail("doctor@clinicalyx.com")
		docPhone, _ := domain.NewPhone("+51999888778")
		doctor, _ := domain.NewUser(tenantID, docName, docLastName, docEmail, "some_hash", docPhone, domain.UserRoleDoctor)
		_ = repo.Save(context.Background(), doctor)

		uc := usecases.NewToggleUserStatusUseCase(repo, hasher)
		err := uc.Execute(context.Background(), usecases.ToggleUserStatusDTO{
			TenantID:      tenantID.String(),
			TargetUserID:  doctor.ID().String(),
			AdminEmail:    "fake@clinicalyx.com",
			AdminPassword: adminPassword,
			NewStatus:     string(domain.UserStatusInactive),
		})

		if !errors.Is(err, usecases.ErrUnauthorizedAction) {
			t.Errorf("se esperaba error %v, se obtuvo %v", usecases.ErrUnauthorizedAction, err)
		}
	})
}
