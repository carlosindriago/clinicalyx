# Plan de Implementación: Clinicalyx Opencore & SaaS Enterprise

Este documento establece la visión estratégica, el modelo de negocio, la arquitectura técnica, la seguridad de datos, el mapa de características, el flujo de Git profesional y la metodología TDD para el proyecto **Clinicalyx**.

---

## 1. Visión Estratégica y Negocio

### ¿Qué es Clinicalyx?
**Clinicalyx** es una plataforma modular de gestión clínica enterprise y de código abierto (**Opencore**). Nace para revolucionar la forma en que los centros de salud gestionan su agenda, pacientes, expedientes clínicos y finanzas, eliminando la rigidez y los altos costos del software privativo tradicional.

```mermaid
graph LR
    A[Clínicas / Negocios] -->|Falta de Control| B[Software Privativo Tradicional]
    A -->|Flexibilidad, Soberanía y Extensibilidad| C[Clinicalyx Opencore / SaaS]
```

### Propuesta de Valor (¿Por qué ayuda a las empresas?)
* **Soberanía y Seguridad de Datos:** A diferencia de las soluciones cerradas en la nube, las grandes clínicas y hospitales exigen control total sobre sus datos de pacientes debido a leyes de privacidad y normativas de salud (HIPAA, GDPR). Clinicalyx les permite hostear su propia infraestructura (on-premise o en su nube privada).
* **Modularidad a Medida:** La mayoría de los softwares del mercado son genéricos o hiper-específicos. Clinicalyx provee un núcleo unificado para la administración, y permite "conectar" módulos específicos por especialidad (ej. un odontograma interactivo para odontólogos, o fichas fotográficas de evolución para medicina estética).
* **Eficiencia Operativa:** El control financiero transaccional estricto (Double-Entry Ledger) evita pérdidas de dinero por abonos mal registrados o desorganización en el flujo de caja diario.

### Modelo de Negocio (Opencore & SaaS)
El proyecto se monetiza bajo un esquema de **Núcleo Abierto (Opencore)**:
1. **Community Edition (Open Source):** Gratuita y autogestionada. Permite a consultorios individuales digitalizar su negocio básico de forma soberana. Crea tracción en la comunidad de desarrolladores y médicos, posicionando a Clinicalyx como el estándar de facto.
2. **SaaS Cloud (Pago por Suscripción):** Clinicalyx administrado en la nube con cobro mensual por usuario o por clínica. Incluye backups automatizados, infraestructura escalable y actualizaciones sin fricción.
3. **Enterprise Edition (Módulos Cerrados):** Clínicas grandes y SaaS consumen módulos premium licenciados (facturación electrónica legal, recordatorios automáticos por WhatsApp API, dashboards de analítica de negocio).

### ¿Cómo estamos innovando?
* **Arquitectura de Ficha Clínica Inyectable (JSONB Mitigado):** Diseñamos un sistema híbrido. En lugar de reescribir tablas SQL para cada especialidad, las consultas analíticas e indexables (ej. diagnósticos CIE-10, alergias, signos vitales) se almacenan en tablas relacionales estrictas. Usamos columnas JSONB dinámicas únicamente en la capa de presentación para los detalles clínicos específicos de cada especialidad (ej. el estado visual de las piezas de un odontograma), garantizando rendimiento analítico y flexibilidad extrema sin comprometer el tipado fuerte en Go.
* **Ingeniería Enterprise desde el Día 1:** Usamos **Arquitectura Hexagonal en Go** y **TDD pragmático**. Esto no es el típico proyecto web "juguete" con Laravel acoplado o código espagueti. Es una infraestructura robusta de nivel bancario, diseñada para durar y escalar.

### Proyecciones a Futuro
* **Inteligencia Artificial Clínica (Fase 2):** Copiloto de dictado por voz que transcribe y resume las notas del médico directamente a la historia clínica en formato estructurado (S.O.A.P.).
* **Integración con IoT de Salud:** Recepción de datos de dispositivos médicos portátiles para el seguimiento remoto de pacientes.
* **Ecosistema de Módulos (Marketplace):** Permitir a desarrolladores externos crear y vender adaptadores de especialidades médicas sobre el Core de Clinicalyx.

---

## 2. Arquitectura de Seguridad (HIPAA, GDPR y Blindaje Bancario)

La seguridad de datos de salud y financieros no es una característica que se añade al final; se diseña desde los cimientos (**Security by Design**). En Clinicalyx aplicaremos los siguientes estándares de seguridad enterprise:

```mermaid
graph TD
    A[Datos Sensibles PHI/Financieros] --> B{Medidas de Seguridad}
    B --> C[Cifrado a Nivel de Columna AES-256-GCM]
    B --> D[Auditoría Inmutable WORM]
    B --> E[PostgreSQL Row-Level Security]
    B --> F[Argon2id + MFA]
```

### A. Cifrado de Datos en Reposo y en Tránsito
* **En Tránsito:** TLS 1.3 forzado con HSTS (HTTP Strict Transport Security) obligatorio. Ninguna petición viajará sin cifrar.
* **Cifrado Híbrido a Nivel de Aplicación:**
  * **Datos Sensibles sin Búsqueda (PHI Descriptivo):** Los campos de texto libre clínicos, evoluciones y recetas se cifrarán en Go usando **AES-256-GCM** (no determinista) antes de guardarse en la BD.
  * **Búsquedas Exactas (DNI/CI, Email, Teléfono):** Se cifran con AES-256-GCM para visualización. Adicionalmente, se genera un **Blind Index (Índice Ciego)** calculado en Go como `HMAC-SHA256(normalizar(dato), secret_salt)` con un índice B-Tree en la base de datos para búsquedas rápidas exactas en $O(1)$. La normalización previa limpia espacios, convierte a minúsculas y elimina caracteres especiales.
  * **Búsquedas Parciales (Nombres):** Se guardan en texto plano indexable en la base de datos para permitir búsquedas eficientes con `ILIKE`, pero protegidos por **Row-Level Security (RLS)** y cifrado de volumen a nivel de infraestructura (**Transparent Data Encryption - TDE**).
  * **Entornos de Desarrollo y Backups (Data Masking):** Se implementará un script obligatorio de enmascaramiento de datos que anonimiza o reemplaza nombres reales por datos ficticios (ej. usando la librería Faker de Go) antes de que un dump de producción viaje a entornos de desarrollo o staging.
* **Gestión de Claves Externa:** La clave maestra de descifrado (KEK) no se almacenará en la base de datos, sino que se gestionará mediante un servicio externo de KMS (AWS KMS, HashiCorp Vault o Azure Key Vault) con rotación automática de claves.

### B. Bitácora de Auditoría de Dos Niveles (Hot / Cold Tier)
* HIPAA exige que cada acceso (lectura o escritura) a datos de salud de un paciente quede registrado de manera auditable. Implementaremos un flujo híbrido:
  * **Hot Tier (Consulta Operativa):** Los logs se escriben en una tabla particionada de PostgreSQL para permitir consultas y dashboards instantáneos para los administradores clínicos en el frontend.
  * **Cold Tier (Cumplimiento Legal):** Un worker asíncrono en Go empaquetará los logs calientes diariamente y los subirá a un bucket S3 con bloqueo de objetos (**Object Lock WORM**) inalterable durante el periodo de retención obligatorio de la ley.

### C. Aislamiento Multi-Tenant con PostgreSQL RLS
* Para blindar el SaaS y evitar filtraciones de datos entre clínicas (ataques tipo IDOR), utilizaremos **Row-Level Security (RLS)** en PostgreSQL.
* **Flujo Transaccional Seguro (Wrapper SET LOCAL):**
  * Para evitar fugas de estado (*State Leak*) en el pool de conexiones de Go, el `tenant_id` se inyecta en la sesión mediante `SET LOCAL app.current_tenant = 'val'` dentro de una transacción.
  * Para mantener el código **DRY** y evitar repetir el boilerplate de transacciones en cada consulta, implementaremos un ejecutador seguro (`ExecuteInTenantTx`):
    ```go
    func ExecuteInTenantTx(ctx context.Context, db *sql.DB, fn func(tx *sql.Tx) error) error {
        tenantID, ok := contextutils.TenantFromContext(ctx)
        if !ok { return ErrMissingTenant }
        tx, err := db.BeginTx(ctx, nil)
        if err != nil { return err }
        defer tx.Rollback()
        if _, err := tx.ExecContext(ctx, "SET LOCAL app.current_tenant = $1", tenantID); err != nil {
            return err
        }
        if err := fn(tx); err != nil { return err }
        return tx.Commit()
    }
    ```
  * Los repositorios de la capa de adaptadores usarán obligatoriamente este wrapper para encapsular el SQL, garantizando que el aislamiento sea automático y a prueba de olvidos.
* Cada consulta a la base de datos se validará a nivel de motor de PostgreSQL inyectando el `tenant_id` de la sesión. Incluso si el desarrollador comete un error en el código de Go y olvida un filtro `WHERE`, el motor de base de datos denegará el acceso si el registro no pertenece a la clínica del usuario autenticado.

### D. Gestión de Identidades Bancaria
* **Hashing de Contraseñas:** Usaremos **Argon2id** (recomendado por OWASP y el estándar de oro actual) en lugar de herramientas obsoletas como MD5 o Bcrypt.
* **Autenticación Multifactor (MFA):** Requisito obligatorio para administradores y personal médico a través de TOTP (Google Authenticator, Authy).
* **Sesiones Seguras y JWT de Vida Corta (Mitigación Stateless):** 
  * Los Access Tokens tendrán una vida útil muy corta (máximo 15 minutos).
  * Los Refresh Tokens se almacenarán de forma segura en la base de datos o en Redis para permitir la renovación de sesiones sin requerir las credenciales del usuario de forma constante.
  * Implementaremos un **Middleware de Denylist** en la capa del router Chi que verificará activamente el estado de revocación del Token o la sesión en una memoria rápida (Redis o tabla pequeña de BD) para bloquear accesos de forma instantánea ante la desactivación o despido de personal, resolviendo la vulnerabilidad nativa de los JWT.
  * Los tokens JWT de sesión se almacenarán estrictamente en cookies HTTP-only, Secure y SameSite=Strict para mitigar ataques XSS y CSRF.

### E. Anonimización y Derecho al Olvido (GDPR)
* Cumpliendo con el **GDPR**, el sistema soportará la seudonimización de datos. Si un paciente solicita el "Derecho al Olvido", el sistema borrará sus datos identificatorios (nombres, teléfono, documento) pero conservará de forma anonimizada las historias clínicas para análisis estadístico e histórico de tratamientos de la clínica, sin posibilidad de re-identificación.

---

## 3. Estrategia de Repositorio: ¿Uno o Dos Proyectos?

Para comercializar un producto **Opencore** y a la vez ofrecer una versión **SaaS de pago**, la mejor decisión arquitectónica es usar **repositorios separados con inyección de dependencias**. 

```mermaid
graph TD
    A[clinicalyx-core - Público/OpenSource] -->|Define Ports / Interfaces| B(Reglas de Negocio base)
    C[clinicalyx-saas - Privado/Cerrado] -->|Importa Core como dependencias| D(Inyecta adaptadores Premium)
    D -->|Implementa| E[Stripe, WhatsApp API, Facturación Electrónica]
```

### Ejemplo Conceptual en Go (Cómo se inyecta la lógica Premium)

#### A. En el repositorio público (`clinicalyx-core`)
Definimos los contratos (Puertos) de salida para los servicios que pueden tener versiones comunitarias básicas o versiones premium complejas.

```go
// File: clinicalyx-core/internal/ports/outbound/payment.go
package outbound

// PaymentGateway define el puerto de salida para procesar cobros
type PaymentGateway interface {
    ProcessPayment(amount float64, currency string) (transactionID string, err error)
}
```

El Core consume este puerto en su lógica de negocio (Casos de Uso) sin saber cómo está implementado físicamente:

```go
// File: clinicalyx-core/internal/usecases/payment_usecase.go
package usecases

import "clinicalyx/internal/ports/outbound"

type ProcessPaymentUseCase struct {
    gateway outbound.PaymentGateway // Dependencia abstracta (Port)
}

func NewProcessPaymentUseCase(g outbound.PaymentGateway) *ProcessPaymentUseCase {
    return &ProcessPaymentUseCase{gateway: g}
}

func (uc *ProcessPaymentUseCase) Execute(amount float64) (string, error) {
    // Lógica del Core: validaciones de saldo, registrar en libro diario, etc.
    return uc.gateway.ProcessPayment(amount, "USD")
}
```

#### B. En el repositorio privado (`clinicalyx-saas` o extensiones premium)
Implementamos el adaptador real utilizando un servicio de pago premium como Stripe:

```go
// File: clinicalyx-premium/adapters/stripe_adapter.go
package adapters

import "github.com/stripe/stripe-go/v72"

type StripeAdapter struct {
    apiKey string
}

func NewStripeAdapter(key string) *StripeAdapter {
    return &StripeAdapter{apiKey: key}
}

// Implementación del método de la interfaz definida en el Core público
func (s *StripeAdapter) ProcessPayment(amount float64, currency string) (string, error) {
    // Lógica privada premium para llamar a las APIs de Stripe
    return "stripe_txn_ok_12345", nil
}
```

#### C. En el arranque de la aplicación SaaS
En el punto de entrada de la aplicación SaaS, importamos el Core público e inyectamos el adaptador privado:

```go
// File: clinicalyx-saas/cmd/api/main.go
package main

import (
    "github.com/carlos/clinicalyx-core/internal/usecases"
    "github.com/carlos/clinicalyx-saas/adapters"
)

func main() {
    // 1. Inicializar adaptador premium (privado)
    stripeGateway := adapters.NewStripeAdapter("sk_live_xxxx")
    
    // 2. Inyectar adaptador privado en el caso de uso del Core público
    processPaymentUC := usecases.NewProcessPaymentUseCase(stripeGateway)
    
    // 3. Arrancar servidor web y endpoints...
}

#### D. Estrategia de Migraciones y Esquemas Separados
Para mantener la separación limpia entre el Core Open Source y el SaaS propietario:
* **Esquemas Separados:** Usaremos esquemas lógicos separados en PostgreSQL: `core_data` (para tablas comunitarias) y `saas_data` (para tablas premium como suscripciones). Esto permite foreign keys transversales evitando cruzar contextos lógicos.
* **Control de Migraciones:** El Core encapsulará sus propias migraciones SQL. El repositorio SaaS importará y ejecutará estas migraciones del Core antes de correr las suyas propias sobre el esquema `saas_data`.
```

---

## 4. Mapa de Características (Features)

Para un producto enterprise, las características se dividen entre lo que es de código abierto (Community) y lo que se comercializa bajo suscripción (Enterprise/SaaS):

| Módulo / Feature | Core (Community Edition - Open Source) | Enterprise / SaaS (Premium Edition - Closed Source) |
| :--- | :--- | :--- |
| **Multi-Tenancy** | Aislamiento básico a nivel lógico de datos (PostgreSQL RLS). | Base de datos dedicada por tenant (aislamiento físico para clínicas grandes) + Portal de facturación del plan SaaS. |
| **Pacientes** | CRUD clásico, ficha de datos personales, historial de visitas y perfil. | Búsqueda por IA semántica de pacientes, campos dinámicos customizables según clínica. |
| **Agenda & Citas** | Calendario mensual/semanal, reserva de citas y estados básicos. | Recordatorios automáticos por WhatsApp/SMS, telemedicina integrada y sincronización con Google Calendar. |
| **Historias Clínicas** | Expediente clínico básico con editor de texto enriquecido (HTML/Markdown). | **Especialidades Médicas Inyectables:** Odontograma interactivo, dermatología con galería de evolución comparativa de fotos, ginecología. |
| **Finanzas** | Registro de cobros, abonos y saldos (tipo de dato decimal estricto). | Facturación electrónica legal, control de flujo de caja, pasarelas de pago integradas (Stripe/PayPal), cálculo de comisiones a médicos. |
| **Seguridad & Auditoría** | Autenticación clásica con JWT (vida corta) + Refresh tokens en base de datos. Encriptación Bcrypt/Argon2id. | Autenticación Single Sign-On (SSO), Middleware de Denylist para revocación inmediata y Logs de auditoría inmutables (Hot/Cold Tier). |
| **Analítica Longitudinal** | Historial básico de visitas y listado de signos vitales. | Motor de Tendencias Gráficas (curvas de presión, glucosa) y cálculo de deltas en backend (+X% respecto a la visita anterior). Alertas visuales de biomarcadores fuera de rango clínico. |
| **Portal B2B (Corporativo)** | N/A (Exclusivo SaaS) | Portal independiente para empresas cliente (empresa.clinicalyx.com). Roster de empleados (carga masiva), agendamiento ocupacional masivo y mapa de calor epidemiológico anonimizado. Descarga segura de descansos médicos con RLS. |
| **LIMS (Laboratorio Nativo)** | Módulo de Laboratorio propio: flujo de órdenes y resultados (PENDING -> IN_PROGRESS -> COMPLETED). Notificación asíncrona interna (`LabResultCompleted`). Validación en dos pasos Maker-Checker (Borrador -> Aprobación de Jefe de Laboratorio). Restricción de acceso para laboratorista (no ve historia clínica). | Extracción automática por OCR de PDF de laboratorios con validación obligatoria del médico (Human-in-the-loop) guardado como Borrador preliminar, firmado digital con hash/QR e integración HL7/FHIR (Fase 2). |
| **Facturación B2B** | N/A (Exclusivo SaaS) | Cuentas corrientes por empresa cliente. Centro de costos consolidado para facturar atenciones acumuladas mensualmente con emisión de factura electrónica automatizada. |

---

## 5. Proposed Changes

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

# Plan de Implementación: Infraestructura del Módulo de Citas (Agenda)

Este plan detalla el diseño y la implementación de los adaptadores de base de datos PostgreSQL (con exclusión GiST y RLS) y los controladores HTTP Chi para el Módulo de Citas de Clinicalyx.

## User Review Required

> [!IMPORTANT]
> **Extensión btree_gist y Restricción de Exclusión**: Para validar solapamientos temporales concurrentes de médicos, se utilizará una restricción de exclusión mediante `btree_gist` en PostgreSQL. Esto evita *race conditions* a nivel de motor de base de datos.
> **Aislamiento RLS**: Todas las operaciones se ejecutarán a través del helper `ExecuteInTenantTx` asegurando que el `tenant_id` de la sesión limite las operaciones.

## Proposed Changes

### [PostgreSQL Migrations]
#### [NEW] [000005_create_appointments_table.up.sql](file:///home/carlos/Proyectos/clinicalyx/backend/migrations/000005_create_appointments_table.up.sql)
Crea la tabla `appointments` utilizando rangos de tiempo nativos (`tsrange`) para evitar colisiones:
- Extensión: `CREATE EXTENSION IF NOT EXISTS btree_gist;`
- Restricción de exclusión: `prevent_doctor_double_booking EXCLUDE USING gist (tenant_id WITH =, doctor_id WITH =, time_range WITH &&);`
- Políticas de Row-Level Security (RLS) habilitadas y forzadas (`app.current_tenant`).
- Privilegios otorgados a `clinicalyx_app_user`.

### [Outbound Adapters]
#### [NEW] [appointment_repository.go](file:///home/carlos/Proyectos/clinicalyx/backend/internal/adapters/outbound/postgres/appointment_repository.go)
Implementa la persistencia de citas médicas:
- `Save`: Inserta los registros y convierte la fecha a `tsrange` usando `tsrange($5, $6, '[)')`. Si Postgres devuelve un error de violación de exclusión (`SQLSTATE 23P01`), retorna `domain.ErrDoctorNotAvailable`.
- `HasOverlap`: Consulta rápida `SELECT EXISTS` mediante el operador de solapamiento `&&` sobre el rango `tsrange`.
- `UpdateStatus`: Modifica el estado de una cita existente a `COMPLETED` o `CANCELED` bajo contexto de Tenant.

#### [MODIFY] [patient_repository_test.go](file:///home/carlos/Proyectos/clinicalyx/backend/internal/adapters/outbound/postgres/patient_repository_test.go)
Modifica `TestMain` para:
- Leer y ejecutar el script de migración SQL `000005_create_appointments_table.up.sql` durante la inicialización.
- Limpiar (DROP/TRUNCATE) la tabla `appointments` en los flujos de pruebas.

#### [NEW] [appointment_repository_test.go](file:///home/carlos/Proyectos/clinicalyx/backend/internal/adapters/outbound/postgres/appointment_repository_test.go)
Pruebas de integración de base de datos:
- Guardar citas de forma exitosa.
- Validar bloqueo automático ante colisiones simultáneas por la restricción de exclusión.
- Validar cumplimiento estricto de políticas RLS de inquilino (Tenant).

### [Inbound Adapters]
#### [NEW] [appointment_handler.go](file:///home/carlos/Proyectos/clinicalyx/backend/internal/adapters/inbound/http/appointment_handler.go)
Controlador HTTP Chi para citas médicas:
- `POST /api/v1/patients/{patient_id}/appointments` (Agendar cita). Extrae `tenant_id` y `doctor_id` del contexto.
- `PATCH /api/v1/appointments/{appointment_id}/cancel` (Cancelar cita).
- Mapeo de errores de dominio a respuestas semánticas JSON.

#### [NEW] [appointment_handler_test.go](file:///home/carlos/Proyectos/clinicalyx/backend/internal/adapters/inbound/http/appointment_handler_test.go)
Pruebas del controlador HTTP Chi para agendar y cancelar citas con mocks de los casos de uso.

### [Bootstrap]
#### [MODIFY] [main.go](file:///home/carlos/Proyectos/clinicalyx/backend/cmd/api/main.go)
Registra las dependencias:
- Instancia `PostgresAppointmentRepository`.
- Instancia `ScheduleAppointmentUseCase` y `CancelAppointmentUseCase` inyectando el nuevo repositorio de citas.
- Instancia y registra el `AppointmentHandler` con sus endpoints protegidos.

## Verification Plan

### Automated Tests
- Ejecutar la suite completa de pruebas unitarias y de integración:
  ```bash
  go test -v ./internal/adapters/...
  ```
- Validar RLS y restricciones de exclusión directamente contra el Postgres de pruebas.
