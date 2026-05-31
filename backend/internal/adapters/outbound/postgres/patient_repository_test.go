package postgres

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	_ "github.com/lib/pq"
)

var testDB *sql.DB  // Conexión restringida de aplicación
var adminDB *sql.DB // Conexión superusuario de administración para limpieza y migraciones
var cryptoService *crypto.CryptoService

func TestMain(m *testing.M) {
	// DSN de conexión de superusuario (admin)
	adminURL := os.Getenv("DATABASE_URL")
	if adminURL == "" {
		adminURL = "postgres://carlos:clinicalyx_secure_pass_2026@localhost:5432/clinicalyx?sslmode=disable"
	}

	var err error
	// Conectar a la base de datos de administración
	for i := 0; i < 5; i++ {
		adminDB, err = sql.Open("postgres", adminURL)
		if err == nil {
			err = adminDB.Ping()
			if err == nil {
				break
			}
		}
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		panic("No se pudo conectar a la base de datos de administración: " + err.Error())
	}

	// Inicializar CryptoService de pruebas
	key := "thisisaverysecretkey32byteslong!"
	salt := "my-blind-index-salt-secret-key"
	cryptoService, err = crypto.NewCryptoService(key, salt)
	if err != nil {
		panic("No se pudo inicializar CryptoService de pruebas: " + err.Error())
	}

	// Ejecutar script de migración SQL usando adminDB
	migPath1 := filepath.Join("..", "..", "..", "..", "migrations", "000001_create_patients_table.up.sql")
	sqlBytes1, err := os.ReadFile(migPath1)
	if err != nil {
		panic("No se pudo leer el archivo de migración SQL en " + migPath1 + ": " + err.Error())
	}

	migPath2 := filepath.Join("..", "..", "..", "..", "migrations", "000002_create_auth_tables.up.sql")
	sqlBytes2, err := os.ReadFile(migPath2)
	if err != nil {
		panic("No se pudo leer el archivo de migración SQL en " + migPath2 + ": " + err.Error())
	}

	migPath4 := filepath.Join("..", "..", "..", "..", "migrations", "000004_create_consultations_table.up.sql")
	sqlBytes4, err := os.ReadFile(migPath4)
	if err != nil {
		panic("No se pudo leer el archivo de migración SQL en " + migPath4 + ": " + err.Error())
	}

	_, err = adminDB.Exec("DROP TABLE IF EXISTS consultations CASCADE; DROP TABLE IF EXISTS sessions CASCADE; DROP TABLE IF EXISTS users CASCADE; DROP TABLE IF EXISTS patients CASCADE;")
	if err != nil {
		panic("Error limpiando tablas existentes en BD de test: " + err.Error())
	}

	_, err = adminDB.Exec(string(sqlBytes1))
	if err != nil {
		panic("Error ejecutando migración de pacientes en base de datos de test: " + err.Error())
	}

	_, err = adminDB.Exec(string(sqlBytes2))
	if err != nil {
		panic("Error ejecutando migración de auth en base de datos de test: " + err.Error())
	}

	_, err = adminDB.Exec(string(sqlBytes4))
	if err != nil {
		panic("Error ejecutando migración de consultas en base de datos de test: " + err.Error())
	}

	// Ahora inicializamos testDB como el usuario de aplicación clinicalyx_app_user (no-superusuario)
	appURL := "postgres://clinicalyx_app_user:clinicalyx_app_secure_pass_2026@localhost:5432/clinicalyx?sslmode=disable"
	testDB, err = sql.Open("postgres", appURL)
	if err != nil {
		panic("No se pudo instanciar la conexión de aplicación: " + err.Error())
	}

	if err = testDB.Ping(); err != nil {
		panic("No se pudo verificar la conexión del rol de aplicación: " + err.Error())
	}

	code := m.Run()

	testDB.Close()
	adminDB.Close()
	os.Exit(code)
}

func cleanDatabase(t *testing.T) {
	// Truncamos la tabla usando adminDB para evitar restricciones de propietario
	_, err := adminDB.Exec("TRUNCATE TABLE patients CASCADE")
	if err != nil {
		t.Fatalf("error limpiando la base de datos con privilegios de administrador: %v", err)
	}
}

func TestPostgresPatientRepository_Integration(t *testing.T) {
	// Prohibido estrictamente t.Parallel() por políticas anti-flaky de persistencia
	cleanDatabase(t)

	repo := NewPostgresPatientRepository(testDB, cryptoService)
	ctx := context.Background()

	tenantA := domain.NewTenantID()
	tenantB := domain.NewTenantID()

	// Datos del paciente a registrar
	name, _ := domain.NewFullName("Carlos Pérez")
	doc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	email, _ := domain.NewEmail("carlos@clinicalyx.com")

	patientA, err := domain.NewPatient(tenantA, name, doc, email)
	if err != nil {
		t.Fatalf("no se pudo instanciar paciente para tenant A: %v", err)
	}

	t.Run("Guardar y recuperar paciente exitosamente bajo el Tenant correcto", func(t *testing.T) {
		err := repo.Save(ctx, patientA)
		if err != nil {
			t.Fatalf("se esperaba guardar el paciente con éxito, se obtuvo: %v", err)
		}

		// Buscar por ID
		retrieved, err := repo.FindByID(ctx, tenantA, patientA.ID())
		if err != nil {
			t.Fatalf("error buscando paciente por ID: %v", err)
		}

		if retrieved == nil {
			t.Fatal("se esperaba encontrar al paciente, se obtuvo nil")
		}

		if retrieved.ID() != patientA.ID() {
			t.Errorf("se esperaba ID %s, se obtuvo %s", patientA.ID(), retrieved.ID())
		}

		if retrieved.Name().Value() != "Carlos Pérez" {
			t.Errorf("se esperaba nombre %q, se obtuvo %q", "Carlos Pérez", retrieved.Name().Value())
		}

		if retrieved.Document().Value() != "12345678" {
			t.Errorf("se esperaba documento %q, se obtuvo %q", "12345678", retrieved.Document().Value())
		}

		if retrieved.Email().Value() != "carlos@clinicalyx.com" {
			t.Errorf("se esperaba email %q, se obtuvo %q", "carlos@clinicalyx.com", retrieved.Email().Value())
		}
	})

	t.Run("Buscar paciente usando Blind Index y desencriptar con éxito", func(t *testing.T) {
		retrieved, err := repo.FindByDocument(ctx, tenantA, domain.DocumentTypeDNI, "12345678")
		if err != nil {
			t.Fatalf("error buscando paciente por documento: %v", err)
		}

		if retrieved == nil {
			t.Fatal("se esperaba encontrar al paciente por su documento, se obtuvo nil")
		}

		if retrieved.ID() != patientA.ID() {
			t.Errorf("se esperaba ID %s, se obtuvo %s", patientA.ID(), retrieved.ID())
		}
	})

	t.Run("🚨 PRUEBA DE FUEGO RLS: Aislamiento estricto de datos entre Tenants", func(t *testing.T) {
		// Intentar buscar el paciente del Tenant A usando la sesión del Tenant B
		retrievedAsB, err := repo.FindByID(ctx, tenantB, patientA.ID())
		if err != nil {
			t.Fatalf("error buscando paciente: %v", err)
		}

		if retrievedAsB != nil {
			t.Error("🚨 VIOLACIÓN DE SEGURIDAD RLS: El Tenant B pudo leer un paciente del Tenant A")
		}

		// Intentar buscar por documento del Tenant A usando la sesión del Tenant B
		retrievedDocAsB, err := repo.FindByDocument(ctx, tenantB, domain.DocumentTypeDNI, "12345678")
		if err != nil {
			t.Fatalf("error buscando paciente: %v", err)
		}

		if retrievedDocAsB != nil {
			t.Error("🚨 VIOLACIÓN DE SEGURIDAD RLS: El Tenant B pudo buscar por documento a un paciente del Tenant A")
		}
	})
}
