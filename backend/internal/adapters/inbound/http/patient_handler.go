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
	getPatientUC    *usecases.GetPatientUseCase
}

// NewPatientHandler inicializa el controlador con los casos de uso correspondientes.
func NewPatientHandler(
	createPatientUC *usecases.CreatePatientUseCase,
	getPatientUC *usecases.GetPatientUseCase,
) *PatientHandler {
	return &PatientHandler{
		createPatientUC: createPatientUC,
		getPatientUC:    getPatientUC,
	}
}

// RegisterRoutes registra las rutas de pacientes en el router de Chi.
// NOTA: Este handler debe ser instanciado por un componente superior que tenga
// acceso al AuthMiddleware para aplicar protección a estas rutas.
func (h *PatientHandler) RegisterRoutes(r chi.Router, authMiddleware func(http.Handler) http.Handler) {
	r.Route("/api/v1/patients", func(r chi.Router) {
		r.Use(TenantExtractor)
		if authMiddleware != nil {
			r.Use(authMiddleware) // Protección de autenticación CRÍTICA
		}
		r.Post("/", h.CreatePatient)
		r.Get("/", h.GetPatients)
		r.Get("/{patient_id}", h.GetPatientByID)
	})
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

// GetPatients maneja el listado y la búsqueda exacta de pacientes por Blind Index de documento.
func (h *PatientHandler) GetPatients(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Recuperar Tenant ID
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El identificador de tenant es inválido o no está presente en el contexto"}`))
		return
	}

	// 2. Obtener query param de documento
	docValue := r.URL.Query().Get("document_id")
	if docValue == "" {
		// Retornar lista vacía por ahora ya que no hay listado masivo implementado
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`[]`))
		return
	}

	// 3. Invocar al caso de uso para buscar por Blind Index
	patient, err := h.getPatientUC.GetByDocument(r.Context(), tenantID.String(), docValue)
	if err != nil {
		if errors.Is(err, usecases.ErrPatientNotFound) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(`[]`))
			return
		}
		h.handleError(w, err)
		return
	}

	// 4. Devolver colección/array con el único paciente encontrado
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode([]usecases.PatientResponse{patient})
}

// GetPatientByID maneja la obtención de un paciente específico por su ID.
func (h *PatientHandler) GetPatientByID(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// 1. Recuperar Tenant ID
	tenantIDVal := r.Context().Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El identificador de tenant es inválido o no está presente en el contexto"}`))
		return
	}

	// 2. Extraer ID del path parameter
	patientIDStr := chi.URLParam(r, "patient_id")
	if _, err := domain.ParsePatientID(patientIDStr); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"error":"El parámetro patient_id debe ser un UUID de paciente válido"}`))
		return
	}

	// 3. Ejecutar el caso de uso
	patient, err := h.getPatientUC.GetByID(r.Context(), tenantID.String(), patientIDStr)
	if err != nil {
		if errors.Is(err, usecases.ErrPatientNotFound) {
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}
		h.handleError(w, err)
		return
	}

	// 4. Retornar éxito
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(patient)
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
