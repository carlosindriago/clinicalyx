-- Rollback consultations table.
DROP POLICY IF EXISTS consultations_tenant_isolation_policy ON consultations;
DROP TABLE IF EXISTS consultations;
