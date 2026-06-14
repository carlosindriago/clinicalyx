package ports

import "context"

// FileStorageService define el puerto para operaciones de almacenamiento de archivos
// compatible con AWS S3 y MinIO.
type FileStorageService interface {
	// GeneratePresignedUploadURL genera una URL pre-firmada para subir un archivo.
	// El objectKey se prefija automáticamente con el tenantID para aislamiento de datos.
	// La URL caduca en 15 minutos.
	GeneratePresignedUploadURL(ctx context.Context, tenantID, objectKey string) (string, error)

	// GeneratePresignedDownloadURL genera una URL pre-firmada para descargar un archivo.
	// El objectKey se prefija automáticamente con el tenantID para aislamiento de datos.
	// La URL caduca en 1 hora.
	GeneratePresignedDownloadURL(ctx context.Context, tenantID, objectKey string) (string, error)
}