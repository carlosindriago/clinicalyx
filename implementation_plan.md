# Plan de Implementación: Modernización de Clinicaly (Opencore)

Este documento detalla el plan técnico, la estructura de directorios, la metodología TDD y el flujo de Git profesional para el nuevo proyecto `clinicaly-modern`.

## User Review Required

> [!IMPORTANT]
> **Ubicación del Proyecto:** Para cumplir con los permisos del entorno, el nuevo directorio `clinicaly-modern` se creará dentro del workspace actual: [clinicaly-modern](file:///home/carlos/Proyectos/clinicaly/clinicaly-modern). Si preferís otra ubicación externa, requerirá una solicitud de permisos adicional.
> 
> **Metodología TDD Estricta:** Seguiremos el ciclo Rojo-Verde-Refactor para toda la lógica de negocio del Backend en Go antes de escribir cualquier código de infraestructura (controladores, adaptadores de DB, etc.). ¿Estás de acuerdo con este enfoque?

## Proposed Changes

### [clinicaly-modern]

Creación del nuevo directorio base e inicialización del repositorio Git y la estructura de carpetas inicial.

#### [NEW] [clinicaly-modern](file:///home/carlos/Proyectos/clinicaly/clinicaly-modern)
Directorio raíz del nuevo proyecto.

#### [NEW] [.gitignore](file:///home/carlos/Proyectos/clinicaly/clinicaly-modern/.gitignore)
Configuración global de Git para ignorar dependencias de Go, Node.js y variables de entorno locales.

#### [NEW] [README.md](file:///home/carlos/Proyectos/clinicaly/clinicaly-modern/README.md)
Documentación inicial de arquitectura y guías del proyecto.

### Arquitectura Propuesta (Hexagonal en Go)
El backend en Go se estructurará de la siguiente manera:
```
clinicaly-modern/backend/
├── cmd/
│   └── api/                # Entrada de la App (Inicialización de dependencias y servidor web)
└── internal/
    ├── domain/             # Entidades puras y reglas de negocio (ej. Paciente, Cita, Pago)
    ├── ports/              # Interfaces de entrada (Driving) y salida (Driven)
    │   ├── inbound/        # Interfaces que llaman a la lógica (ej. UseCases)
    │   └── outbound/       # Interfaces que la lógica llama (ej. Repositorios de DB)
    ├── usecases/           # Implementación de los casos de uso (Orquestadores)
    └── adapters/           # Código de infraestructura (PostgreSQL, Router Fiber/Gin, etc.)
```

### Flujo de Git Profesional (Conventional Commits)
Se inicializará el repositorio Git y se trabajará bajo un flujo Trunk-Based con ramas de feature de ciclo corto:
1. `main`: Rama de producción (protegida).
2. Ramas de feature: `feat/setup-project`, `feat/patient-domain`, etc.
3. Convención de Commits:
   - `feat(domain): agregar entidad paciente`
   - `test(usecases): agregar pruebas para creación de paciente`
   - `fix(adapters): corregir deserialización de jsonb`

### Estrategia TDD (Test-Driven Development)
1. **Rojo (Red):** Escribir una prueba unitaria para un caso de uso (ej. `CreatePatient`) en `backend/internal/usecases/patient_test.go` que falle porque el código aún no existe o no implementa la lógica.
2. **Verde (Green):** Escribir el código mínimo necesario en `backend/internal/domain` y `backend/internal/usecases` para que el test pase de forma exitosa.
3. **Refactor (Refactor):** Limpiar el código, eliminar duplicados, aplicar principios SOLID y patrones de diseño sin alterar el comportamiento (asegurando que el test siga pasando).

---

## Verification Plan

### Automated Tests
- Ejecución de los tests unitarios en el backend de Go con:
  ```bash
  go test -v ./...
  ```
- Ejecución de linters para mantener clean code:
  ```bash
  golangci-lint run
  ```

### Manual Verification
- Verificación del estado del repositorio Git y flujo de ramas:
  ```bash
  git status
  git log --oneline
  ```
