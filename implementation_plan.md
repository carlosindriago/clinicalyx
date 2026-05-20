# Plan de Implementación: Clinicalyx Opencore & SaaS Enterprise

Este documento establece la estrategia de arquitectura para el modelo de negocio **Opencore**, el mapa de características (Core vs. Enterprise/SaaS), el flujo de Git profesional y la metodología TDD para el proyecto **Clinicalyx**.

## Estrategia de Repositorio: ¿Uno o Dos Proyectos?

Para comercializar un producto **Opencore** y a la vez ofrecer una versión **SaaS de pago**, la mejor decisión arquitectónica es usar **repositorios separados con inyección de dependencias**. 

```mermaid
graph TD
    A[clinicalyx-core - Público/OpenSource] -->|Define Ports / Interfaces| B(Reglas de Negocio base)
    C[clinicalyx-saas - Privado/Cerrado] -->|Importa Core como dependencias| D(Inyecta adaptadores Premium)
    D -->|Implementa| E[Stripe, WhatsApp API, Facturación Electrónica]
```

### ¿Por qué este enfoque?
1. **Seguridad Física del Código:** No hay riesgo de que tu código propietario de facturación o pasarelas de pago se filtre por error al repositorio público de GitHub.
2. **Poder de la Arquitectura Hexagonal:** El repositorio público `clinicalyx-core` define los **Ports (interfaces)** para los módulos de especialidad y servicios externos. La versión premium `clinicalyx-saas` simplemente importa este Core y le inyecta sus propios **Adapters (adaptadores)** de pago en el arranque (`main.go`).
3. **Portafolio Senior:** Demuestra un dominio absoluto de los principios **SOLID**, la inversión de dependencias y el desacoplamiento de capas.

---

## Mapa de Características (Features)

Para un producto enterprise, las características se dividen entre lo que es de código abierto (Community) y lo que se comercializa bajo suscripción (Enterprise/SaaS):

| Módulo / Feature | Core (Community Edition - Open Source) | Enterprise / SaaS (Premium Edition - Closed Source) |
| :--- | :--- | :--- |
| **Multi-Tenancy** | Aislamiento básico a nivel lógico de datos (PostgreSQL RLS). | Base de datos dedicada por tenant (aislamiento físico para clínicas grandes) + Portal de facturación del plan SaaS. |
| **Pacientes** | CRUD clásico, ficha de datos personales, historial de visitas y perfil. | Búsqueda por IA semántica de pacientes, campos dinámicos customizables según clínica. |
| **Agenda & Citas** | Calendario mensual/semanal, reserva de citas y estados básicos. | Recordatorios automáticos por WhatsApp/SMS, telemedicina integrada y sincronización con Google Calendar. |
| **Historias Clínicas** | Expediente clínico básico con editor de texto enriquecido (HTML/Markdown). | **Especialidades Médicas Inyectables:** Odontograma interactivo, dermatología con galería de evolución comparativa de fotos, ginecología. |
| **Finanzas** | Registro de cobros, abonos y saldos (tipo de dato decimal estricto). | Facturación electrónica legal, control de flujo de caja, pasarelas de pago integradas (Stripe/PayPal), cálculo de comisiones a médicos. |
| **Seguridad & Auditoría** | Autenticación clásica con JWT, encriptación Bcrypt y roles básicos (Admin/Médico). | Autenticación Single Sign-On (SSO), Logs de auditoría inmutables (cumplimiento regulatorio HIPAA/GDPR para datos médicos). |

---

## Proposed Changes

La estructura del nuevo directorio oficial [clinicalyx](file:///home/carlos/Proyectos/clinicalyx) contendrá la versión **Core (Community)** como base del desarrollo local.

### [clinicalyx] (Core Open Source Repository)

#### [NEW] [backend/](file:///home/carlos/Proyectos/clinicalyx/backend)
Backend desarrollado en Go aplicando Arquitectura Hexagonal.
- `backend/cmd/api/`: Orquestador de inicio e inyección de dependencias.
- `backend/internal/domain/`: Modelos del negocio puros (ej. `Patient`, `Appointment`, `Payment`).
- `backend/internal/ports/`: Interfaces de comunicación (inbound y outbound).
- `backend/internal/usecases/`: Casos de uso de la aplicación (lógica de paciente, citas).
- `backend/internal/adapters/`: Controladores HTTP, repositorios de PostgreSQL y encriptación.

#### [NEW] [frontend/](file:///home/carlos/Proyectos/clinicalyx/frontend)
Frontend desarrollado en Next.js (React/TypeScript).

---

## Estrategia TDD (Test-Driven Development)

Toda la lógica del Core se programará bajo el ciclo **Rojo-Verde-Refactor**:
1. **Red:** Escribir pruebas unitarias en Go para los casos de uso (ej. `CreatePatient` con reglas de validación de documento de identidad) que fallen debido a que no hay implementación.
2. **Green:** Desarrollar el código mínimo necesario en el dominio y caso de uso para que las pruebas pasen.
3. **Refactor:** Optimizar el código aplicando SOLID y patrones de diseño (como Factory o Builder) garantizando que los tests se mantengan en verde.

---

## Verification Plan

### Automated Tests
- Ejecutar pruebas unitarias de Go:
  ```bash
  go test -v ./...
  ```
- Ejecución de linters para clean code:
  ```bash
  golangci-lint run
  ```

### Manual Verification
- Pruebas del ciclo de CI/CD simulado a través del flujo de ramas de Git:
  ```bash
  git log --oneline
  ```
