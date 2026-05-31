-- Crear la tabla consultations para el historial médico del paciente
CREATE TABLE IF NOT EXISTS consultations (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    diagnostic_code VARCHAR(50) NOT NULL,
    notes_encrypted TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice compuesto para búsqueda paginada rápida por paciente ordenada por fecha descendente
CREATE INDEX IF NOT EXISTS idx_consultations_tenant_patient_date ON consultations(tenant_id, patient_id, date DESC);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations FORCE ROW LEVEL SECURITY;

-- Política de RLS para consultations
DROP POLICY IF EXISTS consultations_tenant_isolation_policy ON consultations;
CREATE POLICY consultations_tenant_isolation_policy ON consultations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Otorgar privilegios sobre la tabla consultations
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE consultations TO clinicalyx_app_user;
