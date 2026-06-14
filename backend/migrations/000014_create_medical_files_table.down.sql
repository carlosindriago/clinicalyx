-- Eliminar política de RLS
DROP POLICY IF EXISTS tenant_isolation_policy ON medical_files;

-- Desactivar RLS
ALTER TABLE medical_files DISABLE ROW LEVEL SECURITY;

-- Eliminar índices
DROP INDEX IF EXISTS idx_medical_files_created_at;
DROP INDEX IF EXISTS idx_medical_files_patient_id;
DROP INDEX IF EXISTS idx_medical_files_tenant_id;

-- Eliminar tabla
DROP TABLE IF EXISTS medical_files;