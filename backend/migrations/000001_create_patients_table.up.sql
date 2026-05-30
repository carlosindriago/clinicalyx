-- Crear la tabla patients para clinicalyx
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_blind_index VARCHAR(64) NOT NULL,
    document_encrypted TEXT NOT NULL,
    email_blind_index VARCHAR(64) NOT NULL,
    email_encrypted TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de base de datos compuestos con tenant_id para asegurar RLS óptimo
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_document_blind ON patients(tenant_id, document_type, document_blind_index);
CREATE INDEX IF NOT EXISTS idx_patients_email_blind ON patients(tenant_id, email_blind_index);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(tenant_id, name);

-- Habilitar Row-Level Security (RLS) en la tabla patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

-- Crear política de aislamiento de inquilinos (Tenants)
-- Compara el tenant_id de cada fila con la variable de sesión 'app.current_tenant'
DROP POLICY IF EXISTS patient_tenant_isolation_policy ON patients;
CREATE POLICY patient_tenant_isolation_policy ON patients
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Crear rol de aplicación (no-superusuario) para evitar bypass de RLS
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clinicalyx_app_user') THEN
        CREATE ROLE clinicalyx_app_user WITH LOGIN PASSWORD 'clinicalyx_app_secure_pass_2026';
    END IF;
END
$$;

-- Otorgar permisos sobre la tabla patients
GRANT ALL PRIVILEGES ON SCHEMA public TO clinicalyx_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE patients TO clinicalyx_app_user;
