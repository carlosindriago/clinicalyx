package domain

import (
	"time"
)

// MedicalFile representa los metadatos de un archivo médico almacenado en el sistema
type MedicalFile struct {
	ID          FileID
	TenantID    TenantID
	PatientID   PatientID
	FileName    string
	ContentType string
	Size        int64
	ObjectKey   string
	CreatedAt   time.Time
}

// NewMedicalFile crea una nueva instancia de MedicalFile con los valores proporcionados
func NewMedicalFile(
	tenantID TenantID,
	patientID PatientID,
	fileName string,
	contentType string,
	size int64,
	objectKey string,
) *MedicalFile {
	return &MedicalFile{
		ID:          NewFileID(),
		TenantID:    tenantID,
		PatientID:   patientID,
		FileName:    fileName,
		ContentType: contentType,
		Size:        size,
		ObjectKey:   objectKey,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate valida que los campos obligatorios del archivo médico sean correctos
func (f *MedicalFile) Validate() error {
	if f.TenantID.IsNil() {
		return ErrMissingTenantID
	}
	if f.PatientID.IsNil() {
		return ErrInvalidPatientID
	}
	if f.FileName == "" {
		return ErrInvalidFileName
	}
	if f.ContentType == "" {
		return ErrInvalidContentType
	}
	if f.Size <= 0 {
		return ErrInvalidFileSize
	}
	if f.ObjectKey == "" {
		return ErrInvalidObjectKey
	}
	return nil
}