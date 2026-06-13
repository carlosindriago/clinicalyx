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

psql "$MIGRATIONS_DATABASE_URL" -v ON_ERROR_STOP=1 -v pw="$CLINICALYX_APP_USER_PASSWORD" -c "ALTER ROLE clinicalyx_app_user WITH PASSWORD :'pw';"

exec /app/clinicalyx-api
