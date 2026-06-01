-- Habilitar extensión btree_gist si no existe
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Crear tabla appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    time_range TSRANGE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Restricción de exclusión para evitar colisión de citas (doble reserva) de un mismo médico en el mismo tenant
-- && representa el solapamiento de rangos temporales
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS prevent_doctor_double_booking;
ALTER TABLE appointments ADD CONSTRAINT prevent_doctor_double_booking EXCLUDE USING gist (
    tenant_id WITH =,
    doctor_id WITH =,
    time_range WITH &&
);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

-- Política de aislamiento de inquilinos (Tenant Isolation)
DROP POLICY IF EXISTS appointments_tenant_isolation_policy ON appointments;
CREATE POLICY appointments_tenant_isolation_policy ON appointments
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Otorgar privilegios al rol de aplicación
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE appointments TO clinicalyx_app_user;
