-- Revertir el GRANT sobre medical_files.
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE medical_files FROM clinicalyx_app_user;
