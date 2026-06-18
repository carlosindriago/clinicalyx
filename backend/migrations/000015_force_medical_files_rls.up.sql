-- Forzar Row Level Security incluso para el owner de la tabla
-- Esto previene bypass de RLS si la aplicación se conecta accidentalmente
-- con un rol owner (ej. MIGRATIONS_DATABASE_URL) en lugar del rol de aplicación.
ALTER TABLE medical_files FORCE ROW LEVEL SECURITY;
