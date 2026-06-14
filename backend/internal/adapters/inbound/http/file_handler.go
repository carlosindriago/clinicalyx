package http

import (
	"encoding/json"
	"net/http"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/usecases"
	"github.com/go-chi/chi/v5"
)

// FileHandler expone los endpoints HTTP para la gestión de archivos médicos
type FileHandler struct {
	fileUseCases *usecases.FileUseCases
}

// NewFileHandler inicializa el controlador con los casos de uso correspondientes
func NewFileHandler(fileUseCases *usecases.FileUseCases) *FileHandler {
	return &FileHandler{
		fileUseCases: fileUseCases,
	}
}

// GenerateUploadURLRequest define la estructura para generar URL de subida
type GenerateUploadURLRequest struct {
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
}

// GenerateUploadURLResponse define la respuesta con URL pre-firmada
type GenerateUploadURLResponse struct {
	UploadURL string `json:"upload_url"`
	ObjectKey string `json:"object_key"`
}

// GenerateUploadURL genera una URL pre-firmada para subir un archivo médico
func (h *FileHandler) GenerateUploadURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	// Extraer tenantID del contexto
	tenantIDVal := ctx.Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "tenant_id requerido en el contexto"})
		return
	}

	// Extraer patientID de los parámetros de la ruta
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "patient_id inválido"})
		return
	}

	// Decodificar el cuerpo de la petición
	var req GenerateUploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "cuerpo de petición inválido"})
		return
	}

	// Validar campos requeridos
	if req.FileName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "file_name es requerido"})
		return
	}
	if req.ContentType == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "content_type es requerido"})
		return
	}

	// Llamar al caso de uso
	uploadURL, objectKey, err := h.fileUseCases.GenerateUploadURL(
		ctx,
		tenantID,
		patientID,
		req.FileName,
		req.ContentType,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "error generando URL de subida: " + err.Error()})
		return
	}

	// Responder con la URL pre-firmada
	response := GenerateUploadURLResponse{
		UploadURL: uploadURL,
		ObjectKey: objectKey,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// ConfirmUploadRequest define la estructura para confirmar una subida
type ConfirmUploadRequest struct {
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	ObjectKey   string `json:"object_key"`
}

// ConfirmUpload confirma la subida de un archivo y guarda los metadatos en la base de datos
func (h *FileHandler) ConfirmUpload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	// Extraer tenantID del contexto
	tenantIDVal := ctx.Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "tenant_id requerido en el contexto"})
		return
	}

	// Extraer patientID de los parámetros de la ruta
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "patient_id inválido"})
		return
	}

	// Decodificar el cuerpo de la petición
	var req ConfirmUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "cuerpo de petición inválido"})
		return
	}

	// Validar campos requeridos
	if req.FileName == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "file_name es requerido"})
		return
	}
	if req.ContentType == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "content_type es requerido"})
		return
	}
	if req.Size <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "size debe ser mayor a 0"})
		return
	}
	if req.ObjectKey == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "object_key es requerido"})
		return
	}

	// Llamar al caso de uso
	err = h.fileUseCases.ConfirmUpload(
		ctx,
		tenantID,
		patientID,
		req.FileName,
		req.ContentType,
		req.Size,
		req.ObjectKey,
	)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "error confirmando subida: " + err.Error()})
		return
	}

	// Responder con éxito
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Archivo confirmado y metadatos guardados exitosamente",
	})
}

// ListFilesResponse define la respuesta con lista de archivos
type ListFilesResponse struct {
	Files []MedicalFileResponse `json:"files"`
}

// MedicalFileResponse define la estructura de un archivo médico en la respuesta
type MedicalFileResponse struct {
	ID          string `json:"id"`
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
	CreatedAt   string `json:"created_at"`
}

// ListFiles obtiene todos los archivos médicos asociados a un paciente
func (h *FileHandler) ListFiles(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	// Extraer tenantID del contexto
	tenantIDVal := ctx.Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "tenant_id requerido en el contexto"})
		return
	}

	// Extraer patientID de los parámetros de la ruta
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "patient_id inválido"})
		return
	}

	// Llamar al caso de uso
	files, err := h.fileUseCases.ListPatientFiles(ctx, tenantID, patientID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "error obteniendo archivos: " + err.Error()})
		return
	}

	// Convertir archivos de dominio a respuesta
	responseFiles := make([]MedicalFileResponse, 0, len(files))
	for _, file := range files {
		responseFiles = append(responseFiles, MedicalFileResponse{
			ID:          file.ID.String(),
			FileName:    file.FileName,
			ContentType: file.ContentType,
			Size:        file.Size,
			CreatedAt:   file.CreatedAt.Format(time.RFC3339),
		})
	}

	// Responder con la lista de archivos
	response := ListFilesResponse{
		Files: responseFiles,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// GetDownloadURLResponse define la respuesta con URL de descarga
type GetDownloadURLResponse struct {
	DownloadURL string `json:"download_url"`
}

// GetDownloadURL genera una URL pre-firmada para descargar un archivo médico
func (h *FileHandler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx := r.Context()

	// Extraer tenantID del contexto
	tenantIDVal := ctx.Value(TenantIDKey)
	tenantID, ok := tenantIDVal.(domain.TenantID)
	if !ok || tenantID.IsNil() {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "tenant_id requerido en el contexto"})
		return
	}

	// Extraer patientID de los parámetros de la ruta
	patientIDStr := chi.URLParam(r, "patient_id")
	patientID, err := domain.ParsePatientID(patientIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "patient_id inválido"})
		return
	}

	// Extraer fileID de los parámetros de la ruta
	fileIDStr := chi.URLParam(r, "file_id")
	fileID, err := domain.ParseFileID(fileIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "file_id inválido"})
		return
	}

	// Llamar al caso de uso
	downloadURL, err := h.fileUseCases.GetDownloadURL(ctx, tenantID, patientID, fileID)
	if err != nil {
		// Manejar errores específicos
		if err.Error() == "archivo no encontrado para el paciente" {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "archivo no encontrado"})
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "error generando URL de descarga: " + err.Error()})
		return
	}

	// Responder con la URL de descarga
	response := GetDownloadURLResponse{
		DownloadURL: downloadURL,
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}