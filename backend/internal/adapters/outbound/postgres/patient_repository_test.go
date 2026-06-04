package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"testing"
	"time"

	"strings"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/core/domain"
	_ "github.com/lib/pq"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
)

var testDB *sql.DB  // Conexión restringida de aplicación
var adminDB *sql.DB // Conexión superusuario de administración para limpieza y migraciones
var cryptoService *crypto.CryptoService

func TestMain(m *testing.M) {
	ctx := context.Background()

	container, adminURL, err := startPostgresContainer(ctx)
	if err != nil {
		panic("No se pudo iniciar PostgreSQL con Testcontainers: " + err.Error())
	}

	adminDB, err = openDatabase(adminURL)
	if err != nil {
		panic("No se pudo conectar a la base de datos de administración del contenedor: " + err.Error())
	}

	// Inicializar CryptoService de pruebas
	key := "thisisaverysecretkey32byteslong!"
	salt := "my-blind-index-salt-secret-key"
	cryptoService, err = crypto.NewCryptoService(key, salt)
	if err != nil {
		panic("No se pudo inicializar CryptoService de pruebas: " + err.Error())
	}

	if err := applyMigrations(adminDB); err != nil {
		panic("No se pudieron aplicar migraciones en PostgreSQL efímero: " + err.Error())
	}

	appURL, err := applicationDatabaseURL(adminURL)
	if err != nil {
		panic("No se pudo construir DSN del rol de aplicación: " + err.Error())
	}

	// Ahora inicializamos testDB como el usuario de aplicación clinicalyx_app_user (no-superusuario)
	testDB, err = openDatabase(appURL)
	if err != nil {
		panic("No se pudo instanciar/verificar la conexión de aplicación: " + err.Error())
	}

	code := m.Run()

	if testDB != nil {
		testDB.Close()
	}
	if adminDB != nil {
		adminDB.Close()
	}
	if container != nil {
		if err := container.Terminate(ctx); err != nil {
			fmt.Fprintf(os.Stderr, "error terminando contenedor PostgreSQL: %v\n", err)
		}
	}

	os.Exit(code)
}

func startPostgresContainer(ctx context.Context) (*tcpostgres.PostgresContainer, string, error) {
	container, err := tcpostgres.Run(
		ctx,
		"postgres:16-alpine",
		tcpostgres.WithDatabase("clinicalyx"),
		tcpostgres.WithUsername("postgres"),
		tcpostgres.WithPassword("postgres"),
	)
	if err != nil {
		return nil, "", err
	}

	adminURL, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		_ = container.Terminate(ctx)
		return nil, "", err
	}

	adminURL = strings.Replace(adminURL, "localhost", "127.0.0.1", 1)

	return container, adminURL, nil
}

func openDatabase(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	for i := 0; i < 30; i++ {
		if err = db.Ping(); err == nil {
			return db, nil
		}
		time.Sleep(500 * time.Millisecond)
	}

	_ = db.Close()
	return nil, err
}

func applyMigrations(db *sql.DB) error {
	migrationsDir := filepath.Join("..", "..", "..", "..", "migrations")
	migrationPaths, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("buscar migraciones: %w", err)
	}
	if len(migrationPaths) == 0 {
		return fmt.Errorf("no se encontraron migraciones .up.sql en %s", migrationsDir)
	}

	sort.Strings(migrationPaths)

	for _, migrationPath := range migrationPaths {
		sqlBytes, err := os.ReadFile(migrationPath)
		if err != nil {
			return fmt.Errorf("leer migración %s: %w", migrationPath, err)
		}

		if _, err := db.Exec(string(sqlBytes)); err != nil {
			return fmt.Errorf("ejecutar migración %s: %w", filepath.Base(migrationPath), err)
		}
	}

	return nil
}

func applicationDatabaseURL(adminURL string) (string, error) {
	parsedURL, err := url.Parse(adminURL)
	if err != nil {
		return "", err
	}

	parsedURL.User = url.UserPassword("clinicalyx_app_user", "clinicalyx_app_dev_password")
	return parsedURL.String(), nil
}

func cleanDatabase(t *testing.T) {
	// Truncamos las tablas usando adminDB para evitar restricciones de propietario
	_, err := adminDB.Exec("TRUNCATE TABLE tenants CASCADE")
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

	// Registrar tenants en la base de datos de pruebas
	_, err := adminDB.Exec("INSERT INTO tenants (id, name) VALUES ($1, 'Tenant A'), ($2, 'Tenant B')", tenantA.String(), tenantB.String())
	if err != nil {
		t.Fatalf("error pre-guardando tenants de prueba: %v", err)
	}

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
