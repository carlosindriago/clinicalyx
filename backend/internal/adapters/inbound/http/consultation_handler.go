package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// RecordConsultationRequest mapea el cuerpo JSON de la petición para registrar una consulta.
type RecordConsultationRequest struct {
	DiagnosticCode string          `json:"diagnostic_code"`
	Notes          string          `json:"notes"`
	Metadata       json.RawMessage `json:"metadata"`
}

// ConsultationHandler expone los endpoints HTTP para la gestión de historias clínicas y consultas.
type ConsultationHandler struct {
	recordConsultationUC     *usecases.RecordConsultationUseCase
	getConsultationHistoryUC *usecases.GetConsultationHistoryUseCase
	authMiddleware           *AuthMiddleware

	// testAuthMW permite a los tests inyectar un middleware de auth arbitrario
	// (típicamente authenticatedMiddleware) sin necesidad de un JWTService real.
	// En producción siempre es nil; el código usa h.authMiddleware.Handler.
	testAuthMW func(http.Handler) http.Handler
}

// NewConsultationHandler construye una instancia de ConsultationHandler.
func NewConsultationHandler(
	recordConsultationUC *usecases.RecordConsultationUseCase,
	getConsultationHistoryUC *usecases.GetConsultationHistoryUseCase,
	authMiddleware *AuthMiddleware,
) *ConsultationHandler {
	return &ConsultationHandler{
		recordConsultationUC:     recordConsultationUC,
		getConsultationHistoryUC: getConsultationHistoryUC,
		authMiddleware:           authMiddleware,
	}
}

// RegisterRoutes registra los endpoints de consultas en Chi protegidos por el middleware de autenticación.
func (h *ConsultationHandler) RegisterRoutes(r chi.Router) {
	r.Route("/api/v1/patients/{patient_id}/consultations", func(r chi.Router) {
		r.Use(TenantExtractor)
		r.Use(h.authMiddleware.Handler)
		// Solo médicos pueden REGISTRAR consultas. La lectura del historial
		// es compartida entre personal clínico y recepción.
		recordHandler := RequireRole(domain.UserRoleDoctor, domain.UserRoleSuperAdmin)(http.HandlerFunc(h.RecordConsultation))
		historyHandler := RequireRole(domain.UserRoleDoctor, domain.UserRoleNurse, domain.UserRoleReceptionist, domain.UserRoleSuperAdmin)(http.HandlerFunc(h.GetConsultationHistory))
		r.Post("/", recordHandler.ServeHTTP)
		r.Get("/", historyHandler.ServeHTTP)
	})
}

// RecordConsultation maneja el registro de una nueva consulta clínica.
func (h *ConsultationHandler) RecordConsultation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Extraer TenantID del contexto (inyectado por TenantExtractor)
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	// 2. Extraer DoctorID (UserID) del contexto (inyectado por AuthMiddleware)
	doctorIDVal := r.Context().Value(UserIDKey)
	doctorID, ok := doctorIDVal.(domain.UserID)
	if !ok || doctorID.IsNil() {
		w.WriteHeader(http.StatusUnauthorized)
		_, _ = w.Write([]byte(`{"error":"No autorizado: ID de doctor ausente en el contexto de autenticación"}`))
		return
	}

	// 3. Extraer PatientID del path parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := domain.ParsePatientID(patientIDStr); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro patient_id debe ser un UUID de paciente válido"}`))
		return
	}

	// 4. Decodificar el cuerpo de la petición
	var req RecordConsultationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición de consulta inválido o malformado"}`))
		return
	}

	if req.DiagnosticCode == "" || req.Notes == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El código de diagnóstico y las notas clínicas son campos requeridos"}`))
		return
	}

	dto := usecases.RecordConsultationDTO{
		TenantID:       tenantID.String(),
		PatientID:      patientIDStr,
		DoctorID:       doctorID.String(),
		Date:           time.Now(), // La fecha de registro actual
		DiagnosticCode: req.DiagnosticCode,
		Notes:          req.Notes,
		Metadata:       req.Metadata,
	}

	// 5. Ejecutar el caso de uso
	resp, err := h.recordConsultationUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"id": resp.ID,
	})
}

// GetConsultationHistory recupera el historial de consultas de un paciente.
func (h *ConsultationHandler) GetConsultationHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Extraer TenantID del contexto (inyectado por TenantExtractor)
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	// 2. Extraer PatientID del path parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := domain.ParsePatientID(patientIDStr); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro patient_id debe ser un UUID de paciente válido"}`))
		return
	}

	// 3. Extraer limit y offset de los parámetros de consulta (query parameters)
	limit := 10
	offset := 0

	query := r.URL.Query()
	if limitStr := query.Get("limit"); limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}
	if offsetStr := query.Get("offset"); offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
			offset = val
		}
	}

	dto := usecases.GetConsultationHistoryDTO{
		TenantID:  tenantID.String(),
		PatientID: patientIDStr,
		Limit:     limit,
		Offset:    offset,
	}

	// 4. Ejecutar el caso de uso
	history, err := h.getConsultationHistoryUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(history)
}

// handleError mapea los errores clínicos a códigos de respuesta HTTP semánticos.
func (h *ConsultationHandler) handleError(w http.ResponseWriter, err error) {
	if errors.Is(err, domain.ErrPatientNotFound) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, domain.ErrFutureConsultationDate) ||
		errors.Is(err, domain.ErrEmptyDiagnosticCode) ||
		errors.Is(err, domain.ErrEmptyNotes) ||
		errors.Is(err, domain.ErrInvalidPatientID) ||
		errors.Is(err, domain.ErrMissingTenantID) ||
		errors.Is(err, domain.ErrInvalidUserID) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error interno del servidor. Por favor, intente más tarde."})
}
