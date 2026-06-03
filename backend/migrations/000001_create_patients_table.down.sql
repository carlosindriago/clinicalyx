-- Rollback patients schema and application database role.
DROP POLICY IF EXISTS patient_tenant_isolation_policy ON patients;
DROP TABLE IF EXISTS patients;

REVOKE ALL PRIVILEGES ON SCHEMA public FROM clinicalyx_app_user;
DROP ROLE IF EXISTS clinicalyx_app_user;
