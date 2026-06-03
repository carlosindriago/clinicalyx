-- Rollback authentication tables.
DROP POLICY IF EXISTS session_tenant_isolation_policy ON sessions;
DROP TABLE IF EXISTS sessions;

DROP POLICY IF EXISTS user_tenant_isolation_policy ON users;
DROP TABLE IF EXISTS users;
