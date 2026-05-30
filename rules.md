# Reglas de Desarrollo y Estructura - Clinicalyx

Este documento establece las reglas y directrices técnicas obligatorias para el desarrollo del backend y frontend de **Clinicalyx**. Cualquier desarrollador (humano o agente de IA) debe seguir estrictamente estas especificaciones para garantizar la seguridad, robustez y mantenibilidad de la plataforma.

---

## 1. Arquitectura Hexagonal (Puertos y Adaptadores)

El backend de Clinicalyx está diseñado bajo una arquitectura hexagonal pura. Debemos mantener una separación estricta de responsabilidades y la inversión de dependencias:

```
+--------------------------------------------------------+
|                      ADAPTERS                          |
|   (inbound/http, outbound/postgres, crypto)            |
|                                                        |
|      +------------------------------------------+      |
|      |                 PORTS                    |      |
|      |       (interfaces de entrada/salida)     |      |
|      |                                          |      |
|      |      +----------------------------+      |      |
|      |      |          USECASES          |      |      |
|      |      |    (lógica de aplicación)  |      |      |
|      |      |                            |      |      |
|      |      |      +--------------+      |      |      |
|      |      |      |    DOMAIN    |      |      |      |
|      |      |      |   (entidades |      |      |      |
|      |      |      |    y V.O.s)  |      |      |      |
|      |      |      +--------------+      |      |      |
|      |      +----------------------------+      |      |
|      +------------------------------------------+      |
+--------------------------------------------------------+
```

### Reglas del Hexágono:
1. **Dominio Puro (`internal/core/domain`):**
   * Contiene entidades de negocio y **Value Objects** (ej. `Email`, `Document`, `FullName`).
   * No debe importar NADA fuera del dominio. Está estrictamente prohibido importar frameworks, drivers de base de datos, routers HTTP o librerías que realicen I/O directo.
   * Se permiten librerías de utilidad pura determinista de memoria (ej. `google/uuid`).
   * Toda creación de entidades o Value Objects debe ser auto-validada en su constructor (ej. `NewEmail` retorna un error si el formato es inválido). **No permitas estados inválidos en memoria.**
2. **Casos de Uso (`internal/core/usecases`):**
   * Orquestan la lógica de negocio.
   * Solo interactúan con el dominio y con las interfaces definidas en **Ports**.
   * No deben conocer detalles de base de datos ni protocolos HTTP.
3. **Puertos (`internal/core/ports`):**
   * Son las interfaces de Go que definen el contrato entre la lógica interna y el mundo exterior (ej. `PatientRepository` de salida, o casos de uso de entrada).
4. **Adaptadores (`internal/adapters`):**
   * Implementan las interfaces de los puertos.
   * Contienen la infraestructura real: PostgreSQL, Gin HTTP router, llamadas a APIs externas.
   * **Inbound HTTP:** Los handlers reciben JSON, validan headers básicos (como `X-Tenant-ID`), mapean a DTOs de casos de uso y capturan errores para retornar respuestas HTTP semánticas.
   * **Outbound Postgres:** Ejecuta SQL y interactúa con RLS.

---

## 2. Aislamiento Multi-Tenant con Row-Level Security (RLS)

Clinicalyx es una plataforma SaaS multi-tenant donde la seguridad de los datos de los pacientes es crítica. Implementamos RLS nativo a nivel de base de datos.

### Reglas de Persistencia Multi-Tenant:
1. **Rol de Aplicación Restringido:**
   * La aplicación se conecta utilizando un rol ordinario (`clinicalyx_app_user`), nunca como superusuario (`postgres` o `carlos` en prod). Los superusuarios omiten las políticas de RLS.
2. **Uso Obligatorio de Transacciones con `set_config`:**
   * Toda consulta o inserción a tablas protegidas por RLS debe ejecutarse dentro de una transacción.
   * Al iniciar la transacción, es **mandatorio** inyectar el tenant_id de sesión usando:
     ```sql
     SELECT set_config('app.current_tenant', $1, true)
     ```
   * En Go, esto se encapsula de forma segura en el helper del repositorio:
     ```go
     func (r *PostgresPatientRepository) executeInTransaction(ctx context.Context, tenantID domain.TenantID, fn func(tx *sql.Tx) error) error
     ```
   * **JAMÁS** concatenes strings para inyectar el `tenant_id`. Usa siempre marcadores de parámetros (`$1`).

---

## 3. Cifrado de Datos Sensibles y Blind Indexing

Para cumplir con normativas de salud como HIPAA y GDPR, la información que identifica al paciente debe estar protegida.

### Reglas Criptográficas:
1. **Datos Sensibles (Cifrado Híbrido):**
   * Campos identificativos como número de documento (`document`) e `email` se cifran usando **AES-256-GCM** antes de enviarse a la base de datos.
   * El resultado almacenado en base de datos es un string codificado en hexadecimal que contiene el `nonce` + `ciphertext`.
2. **Búsquedas Exactas con Blind Index (Índice Ciego):**
   * Dado que AES-GCM produce textos cifrados no deterministas (diferente salida para el mismo texto plano debido al nonce aleatorio), no se puede hacer un simple `WHERE email_encrypted = $1`.
   * Para resolver esto, calculamos un **Blind Index** determinista en Go usando:
     ```go
     BlindIndex = HMAC-SHA256(normalizar(dato), BLIND_INDEX_SALT)
     ```
   * **Normalización Previa:** El valor se limpia (minúsculas, sin espacios, sin guiones ni caracteres especiales) antes de calcular el Blind Index.
   * El Blind Index se almacena en base de datos en una columna indexada (B-Tree). Las búsquedas exactas se hacen comparando el Blind Index del dato a buscar en $O(1)$.
3. **Contraseñas:**
   * Se hashean obligatoriamente utilizando el algoritmo **Argon2id**.

---

## 4. Políticas de Testing y TDD Estricto

En Clinicalyx, el código no se da por bueno si no está respaldado por pruebas automatizadas sólidas.

### Reglas de Pruebas:
1. **Tests Unitarios en Memoria (Dominio y Casos de Uso):**
   * Deben ejecutarse en milisegundos.
   * Mocks manuales o generados se inyectan para aislar los adaptadores de base de datos o red.
2. **Tests de Integración Reales (Persistencia):**
   * **Prohibición de Mocks de Base de Datos:** No uses `go-sqlmock` para simular el motor. Debemos probar contra un PostgreSQL real con RLS activo para verificar que las políticas de seguridad funcionan en el motor de base de datos.
   * En desarrollo local, los tests se conectan al contenedor Docker. En CI/CD se usará Testcontainers.
   * **Prohibición de `t.Parallel()`:** Para evitar race conditions y comportamientos erráticos (*flaky tests*) debidos a truncado y limpieza de tablas concurrentes, los tests de persistencia se ejecutan de forma estrictamente secuencial.
   * **Prueba de Fuego de RLS:** Toda prueba de repositorio debe validar explícitamente que un `TenantB` no puede buscar, leer ni actualizar registros creados por `TenantA`.

---

## 5. Convenciones de Código y Commits

1. **Idiomática en Go:**
   * Sigue los principios establecidos en "Effective Go".
   * Manejo explícito de errores: no ignores errores. Propágalos con contexto útil usando `%w` en `fmt.Errorf`.
2. **Conventional Commits:**
   * Todos los mensajes de commit deben seguir la especificación. Ejemplo:
     * `feat(patient): implement core domain and usecases for patient module`
     * `test(postgres): add integration tests for RLS isolation`
     * `docs(readme): update project architecture guidelines`
   * **Sin atribución de IA:** Está estrictamente prohibido incluir "Co-Authored-By" u otras marcas de generación automática de IA en los commits.
3. **Control de Configuración:**
   * Usa `github.com/kelseyhightower/envconfig` para mapear las variables de entorno a estructuras tipadas.
   * Los valores por defecto no deben comprometer la seguridad en entornos de producción.
