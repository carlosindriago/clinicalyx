.PHONY: dev clean seed

dev:
	@echo "1. Creando archivo .env si no existe..."
	@test -f .env || cp .env.example .env
	@test -f backend/.env || cp .env.example backend/.env
	@echo "2. Levantando base de datos PostgreSQL..."
	@docker compose up -d postgres
	@echo "3. Esperando a que PostgreSQL este listo..."
	@until docker exec clinicalyx_postgres pg_isready -U $(USER) >/dev/null 2>&1; do \
		echo "Esperando a la base de datos..."; \
		sleep 1; \
	done
	@echo "4. Ejecutando migraciones SQL..."
	@docker exec -i clinicalyx_postgres psql -U $(USER) -d clinicalyx < backend/migrations/000001_create_patients_table.up.sql
	@docker exec -i clinicalyx_postgres psql -U $(USER) -d clinicalyx < backend/migrations/000002_create_auth_tables.up.sql
	@docker exec -i clinicalyx_postgres psql -U $(USER) -d clinicalyx < backend/migrations/000004_create_consultations_table.up.sql
	@docker exec -i clinicalyx_postgres psql -U $(USER) -d clinicalyx < backend/migrations/000005_create_appointments_table.up.sql
	@docker exec -i clinicalyx_postgres psql -U $(USER) -d clinicalyx -c "ALTER ROLE clinicalyx_app_user WITH PASSWORD 'clinicalyx_app_dev_password';"
	@echo "5. Ejecutando Seed Script..."
	@cd backend && go run ./cmd/seed/main.go
	@echo ""
	@echo "=========================================================================="
	@echo " Clinicalyx esta listo para desarrollo!"
	@echo "=========================================================================="
	@echo " Para iniciar el Backend:"
	@echo "   cd backend && go run ./cmd/api"
	@echo ""
	@echo " Para iniciar el Frontend:"
	@echo "   cd frontend && npm run dev"
	@echo "=========================================================================="

seed:
	@echo "Ejecutando Seed Script..."
	@cd backend && go run ./cmd/seed/main.go

