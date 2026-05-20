# Checklist de Tareas - Clinicalyx Modern

## Configuración Inicial
- [x] Crear el directorio `/home/carlos/Proyectos/clinicalyx`
- [x] Inicializar repositorio Git local con la rama `main`
- [x] Crear `.gitignore` y `README.md`
- [x] Guardar y sincronizar el plan de implementación en la raíz del nuevo directorio

## Estructura del Backend (Go)
- [ ] Crear la rama `feat/setup-backend`
- [ ] Inicializar el módulo de Go (`go mod init clinicalyx/backend`)
- [ ] Instalar dependencias de testing de Go (si aplican)
- [ ] Crear la estructura de carpetas de Arquitectura Hexagonal:
  - `backend/cmd/api/`
  - `backend/internal/domain/`
  - `backend/internal/ports/`
  - `backend/internal/usecases/`
  - `backend/internal/adapters/`

## Módulo Pacientes - Core (TDD)
- [ ] Crear la rama `feat/patient-core`
- [ ] Escribir el primer test unitario fallando (Rojo) para la creación de un paciente (`CreatePatient`)
- [ ] Implementar la entidad `Patient` y el caso de uso `CreatePatient` para hacer pasar el test (Verde)
- [ ] Refactorizar el código y separar adecuadamente en domain, usecases y ports (Refactor)
- [ ] Escribir test unitario de validación de datos del paciente (ej. validación de formato de documento de identidad / C.I.)
- [ ] Implementar validaciones correspondientes para pasar el test

## Infraestructura del Backend
- [ ] Crear la rama `feat/patient-db`
- [ ] Crear puerto y adaptador para PostgreSQL usando SQL
- [ ] Escribir tests de integración para el repositorio de base de datos de pacientes (con contenedor o DB local de test)
- [ ] Crear adaptador HTTP (Fiber o Gin) para exponer el endpoint de Pacientes
- [ ] Validar flujos de integración
