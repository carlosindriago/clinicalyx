package postgres

import (
	"context"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

func TestPostgresAppointmentRepository_Integration(t *testing.T) {
	cleanDatabase(t)

	// Repositorios auxiliares para cumplir claves foráneas
	patientRepo := NewPostgresPatientRepository(testDB, cryptoService)
	userRepo := NewPostgresUserRepository(testDB, cryptoService)
	repo := NewPostgresAppointmentRepository(testDB)

	tenantA := domain.NewTenantID()
	tenantB := domain.NewTenantID()

	// Registrar tenants en la base de datos de pruebas
	_, err := adminDB.Exec("INSERT INTO tenants (id, name) VALUES ($1, 'Tenant A'), ($2, 'Tenant B')", tenantA.String(), tenantB.String())
	if err != nil {
		t.Fatalf("error pre-guardando tenants de prueba: %v", err)
	}

	// 1. Crear pacientes en base de datos
	pNameA, _ := domain.NewFullName("Juan Perez")
	pDocA, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	pEmailA, _ := domain.NewEmail("juan@perez.com")
	patientA, err := domain.NewPatient(tenantA, pNameA, pDocA, pEmailA)
	if err != nil {
		t.Fatalf("error instanciando paciente A: %v", err)
	}

	pNameB, _ := domain.NewFullName("Ana Gomez")
	pDocB, _ := domain.NewDocument(domain.DocumentTypeDNI, "87654321")
	pEmailB, _ := domain.NewEmail("ana@gomez.com")
	patientB, err := domain.NewPatient(tenantB, pNameB, pDocB, pEmailB)
	if err != nil {
		t.Fatalf("error instanciando paciente B: %v", err)
	}

	// Persistir pacientes usando contextos con tenant
	ctxA := context.WithValue(context.Background(), "tenant_id", tenantA)
	ctxB := context.WithValue(context.Background(), "tenant_id", tenantB)

	if err := patientRepo.Save(ctxA, patientA); err != nil {
		t.Fatalf("error guardando paciente A: %v", err)
	}
	if err := patientRepo.Save(ctxB, patientB); err != nil {
		t.Fatalf("error guardando paciente B: %v", err)
	}

	// 2. Crear doctores en base de datos
	dName, _ := domain.NewFullName("Gregory")
	dLastName, _ := domain.NewFullName("House")
	dEmailA, _ := domain.NewEmail("house.a@clinicalyx.com")
	dEmailB, _ := domain.NewEmail("house.b@clinicalyx.com")
	dPhone, _ := domain.NewPhone("+51999999999")
	passwordHash := "$argon2id$v=19$m=65536,t=3,p=4$..."

	doctorA, err := domain.NewUser(tenantA, dName, dLastName, dEmailA, passwordHash, dPhone, domain.UserRoleDoctor)
	if err != nil {
		t.Fatalf("error instanciando doctor A: %v", err)
	}
	doctorB, err := domain.NewUser(tenantB, dName, dLastName, dEmailB, passwordHash, dPhone, domain.UserRoleDoctor)
	if err != nil {
		t.Fatalf("error instanciando doctor B: %v", err)
	}

	if err := userRepo.Save(ctxA, doctorA); err != nil {
		t.Fatalf("error guardando doctor A: %v", err)
	}
	if err := userRepo.Save(ctxB, doctorB); err != nil {
		t.Fatalf("error guardando doctor B: %v", err)
	}

	t.Run("Guardar y recuperar cita médica exitosamente", func(t *testing.T) {
		startTime := time.Now().Add(1 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		appt, err := domain.NewAppointment(tenantA, patientA.ID(), doctorA.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error instanciando cita: %v", err)
		}

		err = repo.Save(ctxA, appt)
		if err != nil {
			t.Fatalf("se esperaba guardar la cita con éxito, se obtuvo: %v", err)
		}

		// Validar que no hay solapamientos en un rango libre
		overlap, err := repo.HasOverlap(ctxA, tenantA, doctorA.ID(), endTime, endTime.Add(30*time.Minute))
		if err != nil {
			t.Fatalf("error al verificar solapamiento: %v", err)
		}
		if overlap {
			t.Error("se esperaba que no hubiera solapamiento en el rango seleccionado")
		}

		// Validar que SÍ hay solapamientos en el mismo rango
		overlap, err = repo.HasOverlap(ctxA, tenantA, doctorA.ID(), startTime.Add(10*time.Minute), endTime.Add(-10*time.Minute))
		if err != nil {
			t.Fatalf("error al verificar solapamiento: %v", err)
		}
		if !overlap {
			t.Error("se esperaba encontrar solapamiento en el rango ocupado")
		}
	})

	t.Run("Evitar colisiones a nivel de motor de base de datos (Restricción de Exclusión)", func(t *testing.T) {
		startTime := time.Now().Add(5 * time.Hour).Round(time.Second)
		endTime := startTime.Add(1 * time.Hour)

		// Crear la primera cita
		appt1, err := domain.NewAppointment(tenantA, patientA.ID(), doctorA.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error instanciando cita 1: %v", err)
		}

		err = repo.Save(ctxA, appt1)
		if err != nil {
			t.Fatalf("error guardando cita 1: %v", err)
		}

		// Intentar crear una segunda cita que se solapa (mismo doctor, mismo rango)
		appt2, err := domain.NewAppointment(tenantA, patientA.ID(), doctorA.ID(), startTime.Add(15*time.Minute), endTime.Add(15*time.Minute))
		if err != nil {
			t.Fatalf("error instanciando cita 2: %v", err)
		}

		err = repo.Save(ctxA, appt2)
		if err == nil {
			t.Fatal("se esperaba un error debido al solapamiento, pero se guardó con éxito")
		}

		if err != domain.ErrDoctorNotAvailable {
			t.Errorf("se esperaba el error domain.ErrDoctorNotAvailable, se obtuvo: %v", err)
		}
	})

	t.Run("Actualizar estado de cita médica y liberar agenda ante cancelación", func(t *testing.T) {
		startTime := time.Now().Add(10 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		appt, err := domain.NewAppointment(tenantA, patientA.ID(), doctorA.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error instanciando cita: %v", err)
		}

		err = repo.Save(ctxA, appt)
		if err != nil {
			t.Fatalf("error guardando cita: %v", err)
		}

		// Verificar que sí hay solapamiento
		overlap, _ := repo.HasOverlap(ctxA, tenantA, doctorA.ID(), startTime, endTime)
		if !overlap {
			t.Fatal("se esperaba solapamiento activo")
		}

		// Cancelar la cita
		err = repo.UpdateStatus(ctxA, tenantA, appt.ID(), domain.AppointmentStatusCanceled)
		if err != nil {
			t.Fatalf("error cancelando cita: %v", err)
		}

		// Verificar que ahora NO hay solapamiento porque la cita está cancelada
		overlapPost, err := repo.HasOverlap(ctxA, tenantA, doctorA.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error verificando solapamiento: %v", err)
		}
		if overlapPost {
			t.Error("el solapamiento debería haberse liberado al cancelar la cita")
		}
	})

	t.Run("🚨 PRUEBA DE FUEGO RLS: Aislamiento estricto de citas entre Tenants", func(t *testing.T) {
		startTime := time.Now().Add(15 * time.Hour).Round(time.Second)
		endTime := startTime.Add(30 * time.Minute)

		// Registrar una cita en el Tenant B para el Doctor B
		apptB, err := domain.NewAppointment(tenantB, patientB.ID(), doctorB.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error instanciando cita para Tenant B: %v", err)
		}

		err = repo.Save(ctxB, apptB)
		if err != nil {
			t.Fatalf("error guardando cita de Tenant B: %v", err)
		}

		// El Tenant A intenta verificar si hay solapamiento para el Doctor B usando su propio contexto
		// Nota: El RLS debería filtrar y hacer que el Tenant A no vea nada del Tenant B,
		// por ende reportará que NO hay solapamiento incluso si sí lo hay en Tenant B.
		overlapAsA, err := repo.HasOverlap(ctxA, tenantA, doctorB.ID(), startTime, endTime)
		if err != nil {
			t.Fatalf("error en HasOverlap RLS: %v", err)
		}
		if overlapAsA {
			t.Error("🚨 VIOLACIÓN DE RLS: El Tenant A pudo detectar la existencia de una cita del Tenant B")
		}

		// Intentar cancelar la cita del Tenant B usando el contexto de Tenant A
		err = repo.UpdateStatus(ctxA, tenantA, apptB.ID(), domain.AppointmentStatusCanceled)
		if err == nil {
			t.Error("🚨 VIOLACIÓN DE RLS: El Tenant A pudo cancelar una cita perteneciente al Tenant B sin error")
		}
	})
}
