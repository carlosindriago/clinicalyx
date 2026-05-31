package postgres

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"clinicalyx/backend/internal/core/domain"
)

func TestPostgresConsultationRepository_Integration(t *testing.T) {
	tenantID1 := domain.NewTenantID()
	tenantID2 := domain.NewTenantID()
	doctorID := domain.NewUserID()

	// Crear pacientes en BD (usando repositorio de pacientes) para cumplir llaves foráneas
	patientRepo := NewPostgresPatientRepository(testDB, cryptoService)

	pName, _ := domain.NewFullName("Juan Perez")
	pDoc, _ := domain.NewDocument(domain.DocumentTypeDNI, "12345678")
	pEmail, _ := domain.NewEmail("juan@perez.com")
	patient1, _ := domain.NewPatient(tenantID1, pName, pDoc, pEmail)

	pName2, _ := domain.NewFullName("Ana Gomez")
	pDoc2, _ := domain.NewDocument(domain.DocumentTypeDNI, "87654321")
	pEmail2, _ := domain.NewEmail("ana@gomez.com")
	patient2, _ := domain.NewPatient(tenantID2, pName2, pDoc2, pEmail2)

	// Persistir pacientes usando contextos con tenant
	ctxP1 := context.WithValue(context.Background(), "tenant_id", tenantID1)
	ctxP2 := context.WithValue(context.Background(), "tenant_id", tenantID2)

	err := patientRepo.Save(ctxP1, patient1)
	if err != nil {
		t.Fatalf("no se pudo pre-guardar paciente 1: %v", err)
	}
	err = patientRepo.Save(ctxP2, patient2)
	if err != nil {
		t.Fatalf("no se pudo pre-guardar paciente 2: %v", err)
	}

	repo := NewPostgresConsultationRepository(testDB, cryptoService)

	t.Run("Guardar y recuperar historial de consulta exitosamente descifrando notas", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), "tenant_id", tenantID1)

		c1, _ := domain.NewConsultation(
			tenantID1,
			patient1.ID(),
			doctorID,
			time.Now().Add(-1 * time.Hour),
			"CIE-E10",
			"Notas clínicas del paciente 1. Estado estable.",
			json.RawMessage(`{"tags":["endocrinology"]}`),
		)

		err := repo.Save(ctx, c1)
		if err != nil {
			t.Fatalf("error guardando consulta: %v", err)
		}

		history, err := repo.ListByPatientID(ctx, patient1.ID(), 10, 0)
		if err != nil {
			t.Fatalf("error consultando historial: %v", err)
		}

		if len(history) != 1 {
			t.Fatalf("se esperaba 1 consulta, se obtuvieron %d", len(history))
		}

		retrieved := history[0]
		if retrieved.ID() != c1.ID() {
			t.Errorf("se esperaba ID %v, se obtuvo %v", c1.ID(), retrieved.ID())
		}
		if retrieved.Notes() != "Notas clínicas del paciente 1. Estado estable." {
			t.Errorf("se esperaba descifrado transparente, se obtuvo: %s", retrieved.Notes())
		}

		// Verificar que en base de datos esté efectivamente cifrado
		var notesEncrypted string
		err = adminDB.QueryRow("SELECT notes_encrypted FROM consultations WHERE id = $1", c1.ID().String()).Scan(&notesEncrypted)
		if err != nil {
			t.Fatalf("error consultando directamente a la BD: %v", err)
		}

		if notesEncrypted == "Notas clínicas del paciente 1. Estado estable." {
			t.Error("las notas están almacenadas en texto plano en la base de datos, no se cifraron")
		}
	})

	t.Run("🚨 PRUEBA DE FUEGO RLS: Aislamiento estricto de consultas médicas entre Tenants", func(t *testing.T) {
		// Contexto del Tenant 1 intentando listar consultas del paciente del Tenant 2
		ctxTenant1 := context.WithValue(context.Background(), "tenant_id", tenantID1)
		
		// Registrar consulta para paciente 2 bajo Tenant 2
		ctxTenant2 := context.WithValue(context.Background(), "tenant_id", tenantID2)
		c2, _ := domain.NewConsultation(
			tenantID2,
			patient2.ID(),
			doctorID,
			time.Now(),
			"CIE-J00",
			"Consulta secreta del paciente 2.",
			nil,
		)
		err := repo.Save(ctxTenant2, c2)
		if err != nil {
			t.Fatalf("error guardando consulta de tenant 2: %v", err)
		}

		// Tenant 1 intenta leer el historial del paciente 2
		history, err := repo.ListByPatientID(ctxTenant1, patient2.ID(), 10, 0)
		if err != nil {
			t.Fatalf("error en listado RLS (debería retornar vacío pero no explotar): %v", err)
		}

		// El motor RLS de Postgres debe filtrar el acceso de forma transparente, retornando 0 filas
		if len(history) != 0 {
			t.Error("🚨 VIOLACIÓN DE RLS: El Tenant 1 pudo acceder al historial clínico del paciente del Tenant 2")
		}
	})
}
