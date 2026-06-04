-- Eliminar constraints de Foreign Key
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_tenant;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS fk_patients_tenant;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_appointments_tenant;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_tenant;
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS fk_consultations_tenant;

-- Eliminar tabla tenants
DROP TABLE IF EXISTS tenants;
