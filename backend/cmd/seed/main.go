package main

import (
	"context"
	"database/sql"
	"log"
	"time"

	"clinicalyx/backend/internal/adapters/crypto"
	"clinicalyx/backend/internal/adapters/outbound/postgres"
	"clinicalyx/backend/internal/config"
	"clinicalyx/backend/internal/core/domain"

	_ "github.com/lib/pq"
)

func main() {
	log.Println("=== Iniciando Poblado de Base de Datos (Seed Script) ===")

	// 1. Cargar Configuración
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Error al cargar la configuración: %v", err)
	}

	// 2. Conectar a PostgreSQL
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Error al abrir la base de datos: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Error de conexión (Ping) a Postgres: %v", err)
	}
	log.Println("Conectado exitosamente a PostgreSQL.")

	ctx := context.Background()

	// 3. Inicializar Servicios
	cryptoService, err := crypto.NewCryptoService(cfg.EncryptionKey, cfg.BlindIndexSalt)
	if err != nil {
		log.Fatalf("Error inicializando el servicio de criptografía: %v", err)
	}
	passwordHasher := crypto.NewArgon2idPasswordHasher()

	userRepo := postgres.NewPostgresUserRepository(db, cryptoService)
	patientRepo := postgres.NewPostgresPatientRepository(db, cryptoService)
	appointmentRepo := postgres.NewPostgresAppointmentRepository(db)

	// 4. Definir ID de Tenant para "Clinicalyx Demo Hospital"
	tenantIDStr := "f4b1e5d7-b892-4e5a-9c7b-99f57d6b38c2"
	tenantID, err := domain.ParseTenantID(tenantIDStr)
	if err != nil {
		log.Fatalf("Tenant ID inválido: %v", err)
	}

	// Limpiar citas anteriores del tenant para evitar colisiones y solapamiento temporal al re-ejecutar el script
	log.Println("Limpiando citas previas para el tenant...")
	err = postgres.ExecuteInTenantTx(ctx, db, tenantID, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(ctx, "DELETE FROM appointments WHERE tenant_id = $1", tenantID.String())
		return err
	})
	if err != nil {
		log.Fatalf("Error limpiando citas previas: %v", err)
	}

	// 5. Inyectar Usuarios (SUPERADMIN, DOCTOR, RECEPTIONIST)
	usersToCreate := []struct {
		firstName string
		lastName  string
		email     string
		phone     string
		role      domain.UserRole
	}{
		{
			firstName: "Admin",
			lastName:  "Clinicalyx",
			email:     "admin@clinicalyx.com",
			phone:     "+56900000001",
			role:      domain.UserRoleSuperAdmin,
		},
		{
			firstName: "John",
			lastName:  "Smith",
			email:     "dr.smith@clinicalyx.com",
			phone:     "+56900000002",
			role:      domain.UserRoleDoctor,
		},
		{
			firstName: "Front",
			lastName:  "Desk",
			email:     "frontdesk@clinicalyx.com",
			phone:     "+56900000003",
			role:      domain.UserRoleReceptionist,
		},
	}

	createdUsers := make(map[string]domain.UserID)

	for _, uData := range usersToCreate {
		existingUser, err := userRepo.FindByEmail(ctx, tenantID, uData.email)
		if err != nil {
			log.Fatalf("Error buscando usuario existente (%s): %v", uData.email, err)
		}

		if existingUser != nil {
			log.Printf("El usuario %s ya existe en el inquilino (ID: %s). Actualizando datos.", uData.email, existingUser.ID())
			createdUsers[uData.email] = existingUser.ID()

			// Hashear password y actualizar rol por si cambiaron
			passwordHash, err := passwordHasher.Hash("password123")
			if err != nil {
				log.Fatalf("Error hasheando contraseña: %v", err)
			}

			// Creamos el VO del nombre y teléfono
			fNameVO, _ := domain.NewFullName(uData.firstName)
			lNameVO, _ := domain.NewFullName(uData.lastName)
			emailVO, _ := domain.NewEmail(uData.email)
			phoneVO, _ := domain.NewPhone(uData.phone)

			// Re-instanciar con el ID existente
			user := domain.UnmarshalUser(
				existingUser.ID(),
				tenantID,
				fNameVO,
				lNameVO,
				emailVO,
				passwordHash,
				phoneVO,
				uData.role,
				domain.UserStatusActive,
				existingUser.MFAEnabled(),
				existingUser.MFASecret(),
				existingUser.CreatedAt(),
				time.Now(),
			)

			err = userRepo.Save(ctx, user)
			if err != nil {
				log.Fatalf("Error al actualizar usuario (%s): %v", uData.email, err)
			}
		} else {
			fNameVO, _ := domain.NewFullName(uData.firstName)
			lNameVO, _ := domain.NewFullName(uData.lastName)
			emailVO, _ := domain.NewEmail(uData.email)
			phoneVO, _ := domain.NewPhone(uData.phone)
			passwordHash, err := passwordHasher.Hash("password123")
			if err != nil {
				log.Fatalf("Error hasheando contraseña: %v", err)
			}

			user, err := domain.NewUser(
				tenantID,
				fNameVO,
				lNameVO,
				emailVO,
				passwordHash,
				phoneVO,
				uData.role,
			)
			if err != nil {
				log.Fatalf("Error creando instancia de usuario (%s): %v", uData.email, err)
			}

			err = userRepo.Save(ctx, user)
			if err != nil {
				log.Fatalf("Error guardando usuario (%s): %v", uData.email, err)
			}
			log.Printf("Usuario %s (%s) creado exitosamente con ID: %s", uData.firstName, uData.email, user.ID())
			createdUsers[uData.email] = user.ID()
		}
	}

	// 6. Inyectar 3 Pacientes asociados al Tenant
	patientsToCreate := []struct {
		name     string
		docType  domain.DocumentType
		docValue string
		email    string
	}{
		{
			name:     "Carlos Perez",
			docType:  domain.DocumentTypeDNI,
			docValue: "12345678",
			email:    "carlos.perez@gmail.com",
		},
		{
			name:     "Laura Gomez",
			docType:  domain.DocumentTypeDNI,
			docValue: "87654321",
			email:    "laura.gomez@gmail.com",
		},
		{
			name:     "Richard Hendricks",
			docType:  domain.DocumentTypePassport,
			docValue: "RH987654",
			email:    "richard@piedpiper.com",
		},
	}

	var patientIDs []domain.PatientID

	for _, pData := range patientsToCreate {
		existingPatient, err := patientRepo.FindByDocument(ctx, tenantID, pData.docType, pData.docValue)
		if err != nil {
			log.Fatalf("Error buscando paciente (%s): %v", pData.name, err)
		}

		if existingPatient != nil {
			log.Printf("El paciente %s ya existe (ID: %s). Actualizando datos.", pData.name, existingPatient.ID())
			patientIDs = append(patientIDs, existingPatient.ID())

			nameVO, _ := domain.NewFullName(pData.name)
			docVO, _ := domain.NewDocument(pData.docType, pData.docValue)
			emailVO, _ := domain.NewEmail(pData.email)

			patient := domain.UnmarshalPatient(
				existingPatient.ID(),
				tenantID,
				nameVO,
				docVO,
				emailVO,
			)

			err = patientRepo.Save(ctx, patient)
			if err != nil {
				log.Fatalf("Error actualizando paciente (%s): %v", pData.name, err)
			}
		} else {
			nameVO, _ := domain.NewFullName(pData.name)
			docVO, _ := domain.NewDocument(pData.docType, pData.docValue)
			emailVO, _ := domain.NewEmail(pData.email)

			patient, err := domain.NewPatient(tenantID, nameVO, docVO, emailVO)
			if err != nil {
				log.Fatalf("Error creando instancia de paciente (%s): %v", pData.name, err)
			}

			err = patientRepo.Save(ctx, patient)
			if err != nil {
				log.Fatalf("Error guardando paciente (%s): %v", pData.name, err)
			}
			log.Printf("Paciente %s creado exitosamente con ID: %s", pData.name, patient.ID())
			patientIDs = append(patientIDs, patient.ID())
		}
	}

	// 7. Inyectar 2 Citas Médicas asignadas al DOCTOR y asociadas a 2 pacientes
	doctorID := createdUsers["dr.smith@clinicalyx.com"]
	now := time.Now()

	// Cita 1: En 1 hora, duración 30 minutos
	start1 := now.Add(1 * time.Hour).Truncate(time.Minute)
	end1 := start1.Add(30 * time.Minute)

	// Cita 2: En 2 horas, duración 30 minutos
	start2 := now.Add(2 * time.Hour).Truncate(time.Minute)
	end2 := start2.Add(30 * time.Minute)

	appointmentsToCreate := []struct {
		patientID domain.PatientID
		start     time.Time
		end       time.Time
	}{
		{
			patientID: patientIDs[0], // Carlos Perez
			start:     start1,
			end:       end1,
		},
		{
			patientID: patientIDs[1], // Laura Gomez
			start:     start2,
			end:       end2,
		},
	}

	for i, apptData := range appointmentsToCreate {
		appt, err := domain.NewAppointment(
			tenantID,
			apptData.patientID,
			doctorID,
			apptData.start,
			apptData.end,
		)
		if err != nil {
			log.Fatalf("Error creando instancia de cita %d: %v", i+1, err)
		}

		err = appointmentRepo.Save(ctx, appt)
		if err != nil {
			log.Fatalf("Error al guardar la cita %d: %v", i+1, err)
		}

		log.Printf("Cita %d creada exitosamente: Doctor (%s) -> Paciente (%s) de %s a %s",
			i+1, doctorID, apptData.patientID, apptData.start.Format("15:04"), apptData.end.Format("15:04"))
	}

	log.Println("\n=== DB SEED COMPLETADO EXITOSAMENTE ===")
	log.Printf("Nombre Tenant:               Clinicalyx Demo Hospital\n")
	log.Printf("Tenant ID (X-Tenant-ID):     %s\n", tenantIDStr)
	log.Println("-------------------------------------------------------------")
	log.Println("Usuarios creados (Contraseña para todos: 'password123'):")
	log.Println("1. SUPERADMIN:   admin@clinicalyx.com")
	log.Println("2. DOCTOR:       dr.smith@clinicalyx.com")
	log.Println("3. RECEPTIONIST: frontdesk@clinicalyx.com")
	log.Println("-------------------------------------------------------------")
}
