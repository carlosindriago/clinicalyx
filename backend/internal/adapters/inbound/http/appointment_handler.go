package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// ScheduleAppointmentRequest representa el payload para agendar una cita.
type ScheduleAppointmentRequest struct {
	DoctorID  string    `json:"doctor_id"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
}

// AppointmentHandler expone los endpoints HTTP para la gestión de la agenda de citas.
type AppointmentHandler struct {
	scheduleUC     *usecases.ScheduleAppointmentUseCase
	cancelUC       *usecases.CancelAppointmentUseCase
	authMiddleware *AuthMiddleware
}

// NewAppointmentHandler construye un nuevo adaptador AppointmentHandler.
func NewAppointmentHandler(
	scheduleUC *usecases.ScheduleAppointmentUseCase,
	cancelUC *usecases.CancelAppointmentUseCase,
	authMiddleware *AuthMiddleware,
) *AppointmentHandler {
	return &AppointmentHandler{
		scheduleUC:     scheduleUC,
		cancelUC:       cancelUC,
		authMiddleware: authMiddleware,
	}
}

// RegisterRoutes registra los endpoints en el enrutador Chi.
func (h *AppointmentHandler) RegisterRoutes(r chi.Router) {
	r.Route("/api/v1/patients/{patient_id}/appointments", func(r chi.Router) {
		r.Use(TenantExtractor)
		r.Use(h.authMiddleware.Handler)
		r.Post("/", h.ScheduleAppointment)
	})

	r.Route("/api/v1/appointments/{appointment_id}/cancel", func(r chi.Router) {
		r.Use(TenantExtractor)
		r.Use(h.authMiddleware.Handler)
		r.Patch("/", h.CancelAppointment)
	})
}

// ScheduleAppointment procesa el agendamiento de una cita médica.
func (h *AppointmentHandler) ScheduleAppointment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Extraer TenantID de RLS (tipo domain.TenantID)
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	// 2. Extraer PatientID del path
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := domain.ParsePatientID(patientIDStr); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro patient_id debe ser un UUID de paciente válido"}`))
		return
	}

	// 3. Decodificar cuerpo de petición
	var req ScheduleAppointmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición de cita inválido o malformado"}`))
		return
	}

	if req.DoctorID == "" || req.StartTime.IsZero() || req.EndTime.IsZero() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Los campos doctor_id, start_time y end_time son obligatorios"}`))
		return
	}

	dto := usecases.ScheduleAppointmentDTO{
		TenantID:  tenantID.String(),
		PatientID: patientIDStr,
		DoctorID:  req.DoctorID,
		StartTime: req.StartTime,
		EndTime:   req.EndTime,
	}

	// Inyectar el tenant_id en formato de string en el contexto para el repositorio
	repoCtx := context.WithValue(r.Context(), "tenant_id", tenantID)

	// 4. Ejecutar caso de uso
	resp, err := h.scheduleUC.Execute(repoCtx, dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"id": resp.ID,
	})
}

// CancelAppointment cancela una cita médica transicionándola a CANCELED.
func (h *AppointmentHandler) CancelAppointment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Extraer TenantID
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Tenant ID inválido o ausente en el contexto"}`))
		return
	}

	// 2. Extraer AppointmentID
	appointmentIDStr := chi.URLParam(r, "appointment_id")
	if _, err := domain.ParseAppointmentID(appointmentIDStr); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro appointment_id debe ser un UUID de cita válido"}`))
		return
	}

	dto := usecases.CancelAppointmentDTO{
		TenantID:      tenantID.String(),
		AppointmentID: appointmentIDStr,
	}

	// Inyectar el tenant_id en formato de string en el contexto para el repositorio
	repoCtx := context.WithValue(r.Context(), "tenant_id", tenantID)

	// 3. Ejecutar caso de uso
	err := h.cancelUC.Execute(repoCtx, dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"message":"Cita cancelada con éxito"}`))
}

// handleError mapea los errores de negocio a respuestas HTTP semánticas.
func (h *AppointmentHandler) handleError(w http.ResponseWriter, err error) {
	if errors.Is(err, domain.ErrDoctorNotAvailable) {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, domain.ErrPatientNotFound) || errors.Is(err, domain.ErrAppointmentNotFound) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	if errors.Is(err, domain.ErrInvalidTimeRange) ||
		errors.Is(err, domain.ErrPastAppointment) ||
		errors.Is(err, domain.ErrInvalidAppointmentID) ||
		errors.Is(err, domain.ErrInvalidPatientID) ||
		errors.Is(err, domain.ErrInvalidUserID) ||
		errors.Is(err, domain.ErrMissingTenantID) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error interno del servidor. Por favor, intente más tarde."})
}
