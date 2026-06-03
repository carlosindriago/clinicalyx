-- Rollback appointments table and GiST helper extension.
ALTER TABLE IF EXISTS appointments DROP CONSTRAINT IF EXISTS prevent_doctor_double_booking;
DROP POLICY IF EXISTS appointments_tenant_isolation_policy ON appointments;
DROP TABLE IF EXISTS appointments;
DROP EXTENSION IF EXISTS btree_gist;
