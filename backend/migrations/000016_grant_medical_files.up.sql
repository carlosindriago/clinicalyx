-- Otorgar permisos DML al rol de aplicación sobre medical_files.
--
-- La migración 000014_create_medical_files_table.up.sql crea la tabla,
-- los índices, RLS y la política de aislamiento por tenant, pero NUNCA
-- ejecuta el GRANT correspondiente. Como resultado, el rol
-- clinicalyx_app_user recibe "permission denied for table medical_files"
-- al intentar INSERT/SELECT/UPDATE/DELETE, y las rutas
-- /api/v1/patients/{id}/files/* fallan en runtime.
--
-- Las demás tablas (patients, users, sessions, consultations,
-- appointments, tenants) sí tienen su GRANT. Esta migración cierra el
-- gap de medical_files y unifica el patrón.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE medical_files TO clinicalyx_app_user;
