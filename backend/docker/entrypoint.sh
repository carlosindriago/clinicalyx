#!/usr/bin/env sh
set -eu

: "${MIGRATIONS_DATABASE_URL:?}"
: "${DATABASE_URL:?}"
: "${CLINICALYX_APP_USER_PASSWORD:?}"

until psql "$MIGRATIONS_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select 1" >/dev/null 2>&1; do
  sleep 1
done

for f in $(ls -1 /app/migrations/*.up.sql | sort); do
  psql "$MIGRATIONS_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

# Crear o actualizar el rol clinicalyx_app_user de forma segura
psql "$MIGRATIONS_DATABASE_URL" -v ON_ERROR_STOP=1 <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'clinicalyx_app_user') THEN
    CREATE ROLE clinicalyx_app_user LOGIN PASSWORD '${CLINICALYX_APP_USER_PASSWORD}';
  ELSE
    ALTER ROLE clinicalyx_app_user WITH PASSWORD '${CLINICALYX_APP_USER_PASSWORD}';
  END IF;
END
\$\$;
EOF

exec /app/clinicalyx-api
