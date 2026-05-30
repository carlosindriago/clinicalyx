-- Crear tablas de usuarios y sesiones para clinicalyx
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email_blind_index VARCHAR(64) NOT NULL,
    email_encrypted TEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_blind_index VARCHAR(64) NOT NULL,
    phone_encrypted TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices compuestos con tenant_id para RLS óptimo
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_blind ON users(tenant_id, email_blind_index);
CREATE INDEX IF NOT EXISTS idx_users_phone_blind ON users(tenant_id, phone_blind_index);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Política de RLS para users
DROP POLICY IF EXISTS user_tenant_isolation_policy ON users;
CREATE POLICY user_tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Otorgar permisos sobre la tabla users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO clinicalyx_app_user;


-- Crear la tabla sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;

-- Política de RLS para sessions
DROP POLICY IF EXISTS session_tenant_isolation_policy ON sessions;
CREATE POLICY session_tenant_isolation_policy ON sessions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Otorgar permisos sobre la tabla sessions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sessions TO clinicalyx_app_user;
