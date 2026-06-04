# Checklist de Tareas - Clinicalyx Modern

## Configuración Inicial
- [x] Crear el directorio `/home/carlos/Proyectos/clinicalyx`
- [x] Inicializar repositorio Git local con la rama `main`
- [x] Crear `.gitignore` y `README.md`
- [x] Guardar y sincronizar el plan de implementación en la raíz del nuevo directorio

## Estructura del Backend (Go)
- [x] Crear la rama `feat/setup-backend`
- [x] Inicializar el módulo de Go (`go mod init clinicalyx/backend`)
- [x] Instalar dependencias iniciales de configuración (`godotenv`, `envconfig`)
- [x] Crear la estructura de carpetas de Arquitectura Hexagonal:
  - `backend/cmd/api/`
  - `backend/internal/core/domain/`
  - `backend/internal/core/ports/`
  - `backend/internal/core/usecases/`
  - `backend/internal/adapters/`
- [x] Crear cargador de configuración seguro en `internal/config/config.go` e `.env.example`

## Módulo Pacientes - Core (TDD)
- [x] Crear la rama `feat/patient-core`
- [x] Escribir el primer test unitario fallando (Rojo) para la creación de un paciente (`CreatePatient`)
- [x] Implementar la entidad `Patient` y el caso de uso `CreatePatient` para hacer pasar el test (Verde)
- [x] Refactorizar el código y separar adecuadamente en domain, usecases y ports (Refactor)
- [x] Escribir test unitario de validación de datos del paciente (ej. validación de formato de documento de identidad / C.I.)
- [x] Implementar validaciones correspondientes para pasar el test

## Infraestructura del Backend
- [x] Crear la rama `feat/patient-db`
- [x] Crear puerto y adaptador para PostgreSQL usando SQL
- [x] Escribir tests de integración para el repositorio de base de datos de pacientes (con contenedor o DB local de test)
- [x] Crear adaptador HTTP (Fiber o Gin) para exponer el endpoint de Pacientes
- [x] Validar flujos de integración

## Módulo de Citas - Infraestructura (Persistencia y HTTP)
- [x] Crear la migración SQL `migrations/000005_create_appointments_table.up.sql` con btree_gist y RLS
- [x] Adaptar `TestMain` en `patient_repository_test.go` para cargar la migración 000005
- [x] Implementar el adaptador de persistencia `internal/adapters/outbound/postgres/appointment_repository.go`
- [x] Crear pruebas de integración en `internal/adapters/outbound/postgres/appointment_repository_test.go`
- [x] Implementar el adaptador HTTP handler `internal/adapters/inbound/http/appointment_handler.go`
- [x] Registrar las rutas de citas en `main.go`
- [x] Escribir pruebas unitarias del controlador HTTP en `internal/adapters/inbound/http/appointment_handler_test.go`
- [x] Verificar que toda la suite de pruebas unitarias y de integración pase correctamente (Rojo-Verde-Refactor)

## Módulo de Pacientes y Perfil Médico (Historia Clínica)
- [x] Crear el caso de uso `GetPatientUseCase` en `backend/internal/core/usecases/get_patient.go`
- [x] Implementar la búsqueda por Blind Index y consulta por ID en `backend/internal/adapters/inbound/http/patient_handler.go`
- [x] Registrar y cablear el nuevo caso de uso en `backend/cmd/api/main.go`
- [x] Instalar componentes shadcn/ui en el frontend (`tabs`, `textarea`, `switch`, `select`)
- [ ] Implementar la vista del Perfil del Paciente en `frontend/app/dashboard/patients/[id]/page.tsx`
- [ ] Verificar que todo compile y que las pruebas pasen correctamente (Rojo-Verde-Refactor)

## Sprint 1: RBAC (Doctor Privacy Wall) & Login UX Refactor
- [ ] Crear la migración SQL `000014_create_global_user_lookup.up.sql` para la función `SECURITY DEFINER` de búsqueda de usuario global
- [ ] Añadir `FindByEmailGlobal` al puerto `UserRepository` e implementar en `PostgresUserRepository`
- [ ] Refactorizar `LoginUseCase` y el DTO de login para eliminar `TenantID`
- [ ] Modificar `AuthHandler` en Go para quitar el middleware `TenantExtractor` de la ruta de login y no requerir `X-Tenant-ID`
- [ ] Modificar la firma y consulta de `FindByDocument` en `PatientRepository` para filtrar por `doctor_id` si se proporciona
- [ ] Modificar `PatientHandler` para extraer el rol del usuario autenticado y pasar el `doctor_id` al buscar pacientes si el rol es `DOCTOR`
- [ ] Actualizar el frontend (`app/login/page.tsx`) quitando el campo `ID DE ORGANIZACIÓN` y removiendo `X-Tenant-ID` de las cabeceras
- [ ] Actualizar el handler proxy del frontend (`app/api/auth/login/route.ts`) para no requerir `X-Tenant-ID`
- [ ] Ejecutar y adaptar todos los tests automáticos en el backend y frontend (npx tsc --noEmit)



