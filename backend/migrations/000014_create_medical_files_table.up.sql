-- Crear tabla para metadatos de archivos médicos
CREATE TABLE medical_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size BIGINT NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de consultas comunes
CREATE INDEX idx_medical_files_tenant_id ON medical_files(tenant_id);
CREATE INDEX idx_medical_files_patient_id ON medical_files(patient_id);
CREATE INDEX idx_medical_files_created_at ON medical_files(created_at);

-- Activar Row Level Security (RLS)
ALTER TABLE medical_files ENABLE ROW LEVEL SECURITY;

-- Crear política de aislamiento por tenant
CREATE POLICY tenant_isolation_policy ON medical_files
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Comentarios para documentación
COMMENT ON TABLE medical_files IS 'Almacena metadatos de archivos médicos subidos al sistema';
COMMENT ON COLUMN medical_files.id IS 'Identificador único del archivo';
COMMENT ON COLUMN medical_files.tenant_id IS 'ID del tenant/clínica dueña del archivo';
COMMENT ON COLUMN medical_files.patient_id IS 'ID del paciente asociado al archivo';
COMMENT ON COLUMN medical_files.file_name IS 'Nombre original del archivo';
COMMENT ON COLUMN medical_files.content_type IS 'Tipo MIME del archivo (ej. application/pdf)';
COMMENT ON COLUMN medical_files.size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN medical_files.object_key IS 'Clave única del objeto en el almacenamiento S3/MinIO';
COMMENT ON COLUMN medical_files.created_at IS 'Fecha y hora de creación del registro';