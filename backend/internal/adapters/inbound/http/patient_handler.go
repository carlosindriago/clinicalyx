package http

import (
	"errors"
	"net/http"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreatePatientRequest define la estructura del cuerpo JSON de la petición HTTP.
type CreatePatientRequest struct {
	Name          string `json:"name" binding:"required"`
	DocumentType  string `json:"document_type" binding:"required"`
	DocumentValue string `json:"document_value" binding:"required"`
	Email         string `json:"email" binding:"required,email"`
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

// RegisterRoutes registra las rutas de pacientes en el router de Gin.
func (h *PatientHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/v1/patients", h.CreatePatient)
}

// CreatePatient maneja la petición HTTP para registrar un nuevo paciente.
func (h *PatientHandler) CreatePatient(c *gin.Context) {
	// 1. Extraer y validar el Tenant ID de los Headers
	tenantIDStr := c.GetHeader("X-Tenant-ID")
	if tenantIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El header X-Tenant-ID es obligatorio"})
		return
	}

	if _, err := uuid.Parse(tenantIDStr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El header X-Tenant-ID debe ser un UUID válido"})
		return
	}

	// 2. Parsear y validar el cuerpo JSON
	var req CreatePatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cuerpo de petición inválido o campos faltantes: " + err.Error()})
		return
	}

	// 3. Mapear a DTO del Caso de Uso
	dto := usecases.CreatePatientDTO{
		TenantID:      tenantIDStr,
		Name:          req.Name,
		DocumentType:  req.DocumentType,
		DocumentValue: req.DocumentValue,
		Email:         req.Email,
	}

	// 4. Ejecutar el caso de uso
	resp, err := h.createPatientUC.Execute(c.Request.Context(), dto)
	if err != nil {
		h.handleError(c, err)
		return
	}

	// 5. Retornar éxito
	c.JSON(http.StatusCreated, gin.H{
		"id": resp.ID,
	})
}

// handleError mapea los errores de negocio y dominio a códigos HTTP semánticos de forma limpia.
func (h *PatientHandler) handleError(c *gin.Context, err error) {
	// Errores de duplicidad de datos (Conflict)
	if errors.Is(err, usecases.ErrPatientAlreadyExists) {
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		return
	}

	// Errores de validación de negocio/dominio (Bad Request)
	if errors.Is(err, domain.ErrInvalidEmail) ||
		errors.Is(err, domain.ErrInvalidDocumentID) ||
		errors.Is(err, domain.ErrInvalidPatientName) ||
		errors.Is(err, domain.ErrMissingTenantID) ||
		errors.Is(err, domain.ErrInvalidPatientID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Error del sistema (Internal Server Error)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Error interno del servidor. Por favor, intente más tarde."})
}
