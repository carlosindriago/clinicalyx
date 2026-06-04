-- Crear la tabla tenants si no existe
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reconciliación de registros huérfanos locales:
-- Insertar cualquier tenant_id existente en las tablas users, patients, appointments, sessions, consultations
INSERT INTO tenants (id, name, is_demo, expires_at)
SELECT DISTINCT tenant_id, 'Demo Hospital', false, NULL::TIMESTAMP WITH TIME ZONE
FROM (
    SELECT tenant_id FROM users
    UNION
    SELECT tenant_id FROM patients
    UNION
    SELECT tenant_id FROM appointments
    UNION
    SELECT tenant_id FROM sessions
    UNION
    SELECT tenant_id FROM consultations
) AS all_tenants
ON CONFLICT (id) DO NOTHING;

-- Agregar restricciones de Foreign Key con ON DELETE CASCADE
-- 1. users
ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS fk_users_tenant,
    ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE;

-- 2. patients
ALTER TABLE patients 
    DROP CONSTRAINT IF EXISTS fk_patients_tenant,
    ADD CONSTRAINT fk_patients_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE;

-- 3. appointments
ALTER TABLE appointments 
    DROP CONSTRAINT IF EXISTS fk_appointments_tenant,
    ADD CONSTRAINT fk_appointments_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE;

-- 4. sessions
ALTER TABLE sessions 
    DROP CONSTRAINT IF EXISTS fk_sessions_tenant,
    ADD CONSTRAINT fk_sessions_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE;

-- 5. consultations
ALTER TABLE consultations 
    DROP CONSTRAINT IF EXISTS fk_consultations_tenant,
    ADD CONSTRAINT fk_consultations_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) 
    ON DELETE CASCADE;

-- Otorgar permisos sobre la tabla tenants
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tenants TO clinicalyx_app_user;

