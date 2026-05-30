package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// CreatePatientRequest define la estructura del cuerpo JSON de la petición HTTP.
type CreatePatientRequest struct {
	Name          string `json:"name"`
	DocumentType  string `json:"document_type"`
	DocumentValue string `json:"document_value"`
	Email         string `json:"email"`
}

// PatientHandler expone los endpoints HTTP para la gestión de pacientes.
type PatientHandler struct {
	createPatientUC *usecases.CreatePatientUseCase
}

// NewPatientHandler inicializa el controlador con el caso de uso correspondiente.
func NewPatientHandler(createPatientUC *usecases.CreatePatientUseCase) *PatientHandler {
	return &PatientHandler{
		createPatientUC: createPatientUC,
	}
}

// RegisterRoutes registra las rutas de pacientes en el router de Chi.
func (h *PatientHandler) RegisterRoutes(r chi.Router) {
	r.With(TenantExtractor).Post("/api/v1/patients", h.CreatePatient)
}

// CreatePatient maneja la petición HTTP para registrar un nuevo paciente.
func (h *PatientHandler) CreatePatient(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Recuperar Tenant ID del contexto (inyectado por el middleware TenantExtractor)
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El identificador de tenant es inválido o no está presente en el contexto"}`))
		return
	}

	// 2. Parsear y validar el cuerpo JSON
	var req CreatePatientRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Cuerpo de petición inválido o malformado"}`))
		return
	}

	if req.Name == "" || req.DocumentType == "" || req.DocumentValue == "" || req.Email == "" {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"Todos los campos (name, document_type, document_value, email) son requeridos"}`))
		return
	}

	// 3. Mapear a DTO del Caso de Uso
	dto := usecases.CreatePatientDTO{
		TenantID:      tenantID.String(),
		Name:          req.Name,
		DocumentType:  req.DocumentType,
		DocumentValue: req.DocumentValue,
		Email:         req.Email,
	}

	// 4. Ejecutar el caso de uso
	resp, err := h.createPatientUC.Execute(r.Context(), dto)
	if err != nil {
		h.handleError(w, err)
		return
	}

	// 5. Retornar éxito
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"id": resp.ID,
	})
}

// handleError mapea los errores de negocio y dominio a códigos HTTP semánticos de forma limpia.
func (h *PatientHandler) handleError(w http.ResponseWriter, err error) {
	// Errores de duplicidad de datos (Conflict)
	if errors.Is(err, usecases.ErrPatientAlreadyExists) {
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Errores de validación de negocio/dominio (Bad Request)
	if errors.Is(err, domain.ErrInvalidEmail) ||
		errors.Is(err, domain.ErrInvalidDocumentID) ||
		errors.Is(err, domain.ErrInvalidPatientName) ||
		errors.Is(err, domain.ErrMissingTenantID) ||
		errors.Is(err, domain.ErrInvalidPatientID) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	// Error del sistema (Internal Server Error)
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error interno del servidor. Por favor, intente más tarde."})
}
