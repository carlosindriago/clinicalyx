# Clinicalyx (Opencore Clinical Management Platform)

Clinicalyx es una plataforma modular de gestión clínica multi-tenant de alta seguridad y rendimiento. Este documento actúa como el mapa de ruta y la guía de diseño principal tanto para desarrolladores humanos como para agentes de IA que colaboren en el proyecto.

---

## 📖 Arquitectura del Proyecto

El backend está desarrollado en Go (Golang) bajo una **Arquitectura Hexagonal (Puertos y Adaptadores)** estricta y siguiendo la metodología **TDD (Test-Driven Development)** para toda lógica crítica.

### Estructura de Directorios

```
clinicalyx/
├── backend/                        # Código del Servidor Go
│   ├── cmd/
│   │   └── api/                    # Punto de entrada (main.go - Bootstrap)
│   ├── migrations/                 # Migraciones SQL nativas de PostgreSQL
│   └── internal/
│       ├── config/                 # Configuración por variables de entorno (envconfig)
│       ├── core/                   # Núcleo de la Arquitectura Hexagonal
│       │   ├── domain/             # Entidades puras de negocio y Value Objects
│       │   ├── ports/              # Interfaces de entrada (Driving) y salida (Driven)
│       │   └── usecases/           # Casos de uso de la aplicación (Orquestadores)
│       └── adapters/               # Infraestructura y acoplamiento externo
│           ├── inbound/            # Adaptadores de entrada (ej. HTTP Router con Gin)
│           ├── outbound/           # Adaptadores de salida (ej. PostgreSQL)
│           └── crypto/             # Utilidades de encriptación y hashing de datos
└── frontend/                       # Aplicación Web Next.js (React/TypeScript)
```

---

## 🔒 Arquitectura de Seguridad y Privacidad (PHI, HIPAA, GDPR)

Para proteger la Información de Salud Protegida (PHI), el sistema implementa una estrategia de **Seguridad por Diseño** en tres capas principales:

### 1. PostgreSQL Row-Level Security (RLS) para Multi-Tenancy
* El aislamiento entre clínicas se garantiza a nivel del motor de base de datos.
* **Flujo Transaccional:** Cada petición inyecta de forma segura el Tenant ID en el contexto HTTP, el cual se propaga al repositorio.
* El adaptador de base de datos ejecuta las consultas dentro de una transacción que establece la variable de sesión mediante:
  ```sql
  SELECT set_config('app.current_tenant', $1, true);
  ```
* **Rol Restringido:** La aplicación se conecta como `clinicalyx_app_user` (no superusuario) para forzar que el motor de PostgreSQL evalúe las políticas RLS.

### 2. Cifrado Híbrido a Nivel de Aplicación (AES-256-GCM)
* Datos como el email y el número de documento de identidad de los pacientes se encriptan en Go antes de persistirse en base de datos.
* Se utiliza **AES-256-GCM** que produce salidas no deterministas mediante nonces aleatorios únicos por cada escritura.

### 3. Blind Indexing (Índice Ciego) para Búsquedas Exactas
* Dado que los datos cifrados no son deterministas, no se pueden realizar búsquedas eficientes en base de datos (`WHERE email_encrypted = $1`).
* Se genera un **Blind Index** determinista calculado como:
  ```go
  BlindIndex = HMAC-SHA256(normalizar(dato), BLIND_INDEX_SALT)
  ```
* Las búsquedas exactas en base de datos se ejecutan comparando el Blind Index en tiempo constante ($O(1)$) mediante índices B-Tree estructurados en base de datos.

---

## 🛠️ Guía de Desarrollo Local

### Prerrequisitos
* Go 1.25 o superior.
* Docker y Docker Compose.

### Configurar el Entorno
1. Levanta la base de datos PostgreSQL:
   ```bash
   docker compose up -d
   ```
2. Crea tu archivo de variables de entorno `.env` en la raíz del backend basándote en [.env.example](file:///home/carlos/Proyectos/clinicalyx/.env.example).

### Ejecutar Pruebas Automatizadas
Para verificar el correcto funcionamiento del dominio, la inyección del tenant en las transacciones HTTP y la robustez del RLS en la base de datos, ejecuta:
```bash
go test -v ./...
```

> [!IMPORTANT]
> Los tests de persistencia se ejecutan de forma **secuencial** (sin `t.Parallel()`) sobre una base de datos PostgreSQL real levantada localmente. Esto garantiza la fidelidad de las políticas RLS y la validez de los queries de base de datos sin generar race conditions por truncado de tablas de prueba.

---

## 🤖 Directivas de Onboarding para Agentes de IA
Si eres un agente de IA que colabora en este repositorio, lee el archivo de reglas principal:
* Consúltalo en [rules.md](file:///home/carlos/Proyectos/clinicalyx/rules.md) para alinearte con las convenciones de nomenclatura, inversión de dependencias y estándares criptográficos establecidos en el proyecto.
