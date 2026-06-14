package usecases

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"clinicalyx/backend/internal/core/domain"
	"clinicalyx/backend/internal/core/ports"
)

// FileUseCases encapsula la lógica de negocio para operaciones con archivos médicos
type FileUseCases struct {
	fileRepo ports.FileRepository
	storage  ports.FileStorageService
}

// NewFileUseCases inicializa los casos de uso para archivos médicos
func NewFileUseCases(fileRepo ports.FileRepository, storage ports.FileStorageService) *FileUseCases {
	return &FileUseCases{
		fileRepo: fileRepo,
		storage:  storage,
	}
}

// GenerateUploadURL genera una URL pre-firmada para subir un archivo médico
func (uc *FileUseCases) GenerateUploadURL(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
	fileName string,
	contentType string,
) (url string, objectKey string, err error) {
	// Validar parámetros de entrada
	if tenantID.IsNil() {
		return "", "", domain.ErrMissingTenantID
	}
	if patientID.IsNil() {
		return "", "", domain.ErrInvalidPatientID
	}
	if fileName == "" {
		return "", "", domain.ErrInvalidFileName
	}
	if contentType == "" {
		return "", "", domain.ErrInvalidContentType
	}

	// Sanitizar el nombre del archivo
	sanitizedFileName := sanitizeFileName(fileName)

	// Generar objectKey único con estructura organizada
	objectKey = fmt.Sprintf(
		"patients/%s/%d_%s",
		patientID.String(),
		time.Now().Unix(),
		sanitizedFileName,
	)

	// Generar URL pre-firmada para subida
	url, err = uc.storage.GeneratePresignedUploadURL(ctx, tenantID.String(), objectKey)
	if err != nil {
		return "", "", fmt.Errorf("error generando URL pre-firmada: %w", err)
	}

	return url, objectKey, nil
}

// ConfirmUpload confirma la subida de un archivo y guarda los metadatos en la base de datos
func (uc *FileUseCases) ConfirmUpload(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
	fileName string,
	contentType string,
	size int64,
	objectKey string,
) error {
	// Validar parámetros de entrada
	if tenantID.IsNil() {
		return domain.ErrMissingTenantID
	}
	if patientID.IsNil() {
		return domain.ErrInvalidPatientID
	}
	if fileName == "" {
		return domain.ErrInvalidFileName
	}
	if contentType == "" {
		return domain.ErrInvalidContentType
	}
	if size <= 0 {
		return domain.ErrInvalidFileSize
	}
	if objectKey == "" {
		return domain.ErrInvalidObjectKey
	}

	// Crear el archivo médico usando el constructor del dominio
	medicalFile := domain.NewMedicalFile(
		tenantID,
		patientID,
		fileName,
		contentType,
		size,
		objectKey,
	)

	// Guardar en el repositorio
	if err := uc.fileRepo.Save(ctx, tenantID, medicalFile); err != nil {
		return fmt.Errorf("error guardando metadatos del archivo: %w", err)
	}

	return nil
}

// ListPatientFiles obtiene todos los archivos médicos asociados a un paciente
func (uc *FileUseCases) ListPatientFiles(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
) ([]*domain.MedicalFile, error) {
	// Validar parámetros de entrada
	if tenantID.IsNil() {
		return nil, domain.ErrMissingTenantID
	}
	if patientID.IsNil() {
		return nil, domain.ErrInvalidPatientID
	}

	// Obtener archivos del repositorio
	files, err := uc.fileRepo.FindByPatientID(ctx, tenantID, patientID)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo archivos del paciente: %w", err)
	}

	return files, nil
}

// GetDownloadURL genera una URL pre-firmada para descargar un archivo médico
func (uc *FileUseCases) GetDownloadURL(
	ctx context.Context,
	tenantID domain.TenantID,
	patientID domain.PatientID,
	fileID domain.FileID,
) (url string, err error) {
	// Validar parámetros de entrada
	if tenantID.IsNil() {
		return "", domain.ErrMissingTenantID
	}
	if patientID.IsNil() {
		return "", domain.ErrInvalidPatientID
	}
	if fileID.IsNil() {
		return "", domain.ErrInvalidFileID
	}

	// Primero obtener todos los archivos del paciente
	files, err := uc.fileRepo.FindByPatientID(ctx, tenantID, patientID)
	if err != nil {
		return "", fmt.Errorf("error obteniendo archivos del paciente: %w", err)
	}

	// Buscar el archivo específico por ID
	var targetFile *domain.MedicalFile
	for _, file := range files {
		if file.ID == fileID {
			targetFile = file
			break
		}
	}

	if targetFile == nil {
		return "", fmt.Errorf("archivo no encontrado para el paciente")
	}

	// Generar URL pre-firmada para descarga
	url, err = uc.storage.GeneratePresignedDownloadURL(ctx, tenantID.String(), targetFile.ObjectKey)
	if err != nil {
		return "", fmt.Errorf("error generando URL de descarga: %w", err)
	}

	return url, nil
}

// sanitizeFileName limpia y sanitiza el nombre del archivo
func sanitizeFileName(fileName string) string {
	// Obtener la extensión del archivo
	ext := filepath.Ext(fileName)
	// Obtener el nombre base sin extensión
	baseName := strings.TrimSuffix(filepath.Base(fileName), ext)

	// Reemplazar caracteres no seguros
	baseName = strings.ReplaceAll(baseName, " ", "_")
	baseName = strings.ReplaceAll(baseName, "/", "_")
	baseName = strings.ReplaceAll(baseName, "\\", "_")
	baseName = strings.ReplaceAll(baseName, ":", "_")
	baseName = strings.ReplaceAll(baseName, "*", "_")
	baseName = strings.ReplaceAll(baseName, "?", "_")
	baseName = strings.ReplaceAll(baseName, "\"", "_")
	baseName = strings.ReplaceAll(baseName, "<", "_")
	baseName = strings.ReplaceAll(baseName, ">", "_")
	baseName = strings.ReplaceAll(baseName, "|", "_")

	// Limitar longitud del nombre
	if len(baseName) > 100 {
		baseName = baseName[:100]
	}

	// Combinar nombre sanitizado con extensión
	if ext != "" {
		return baseName + ext
	}
	return baseName
}