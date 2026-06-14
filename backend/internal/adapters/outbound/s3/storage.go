package s3

import (
	"context"
	"fmt"
	"path"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"clinicalyx/backend/internal/core/ports"
)

// S3StorageService implementa el puerto FileStorageService para AWS S3 y MinIO.
type S3StorageService struct {
	client *s3.Client
	bucket string
}

// NewS3StorageService crea una nueva instancia del adaptador S3.
func NewS3StorageService(endpoint, region, accessKey, secretKey, bucket string) (*S3StorageService, error) {
	// Configurar credenciales estáticas
	creds := credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")

	// Configurar el endpoint personalizado para MinIO
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if service == s3.ServiceID && endpoint != "" {
			return aws.Endpoint{
				URL:               endpoint,
				SigningRegion:     region,
				HostnameImmutable: true,
			}, nil
		}
		// Fallback al endpoint por defecto de AWS
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	// Cargar configuración
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithCredentialsProvider(creds),
		config.WithRegion(region),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Crear cliente S3
	client := s3.NewFromConfig(cfg)

	return &S3StorageService{
		client: client,
		bucket: bucket,
	}, nil
}

// buildTenantKey construye la clave del objeto con prefijo del tenant para aislamiento de datos.
func (s *S3StorageService) buildTenantKey(tenantID, objectKey string) string {
	// Asegurar que el objectKey no comience con slash
	cleanObjectKey := objectKey
	if len(cleanObjectKey) > 0 && cleanObjectKey[0] == '/' {
		cleanObjectKey = cleanObjectKey[1:]
	}

	// Construir la clave con el tenant como "directorio" virtual
	return path.Join(tenantID, cleanObjectKey)
}

// GeneratePresignedUploadURL genera una URL pre-firmada para subir un archivo.
func (s *S3StorageService) GeneratePresignedUploadURL(ctx context.Context, tenantID, objectKey string) (string, error) {
	// Construir la clave con aislamiento de tenant
	fullKey := s.buildTenantKey(tenantID, objectKey)

	// Crear el comando de subida
	input := &s3.PutObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(fullKey),
	}

	// Crear el presigner
	presignClient := s3.NewPresignClient(s.client)

	// Generar la URL pre-firmada con expiración de 15 minutos
	presignResult, err := presignClient.PresignPutObject(ctx, input,
		s3.WithPresignExpires(15*time.Minute),
	)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned upload URL: %w", err)
	}

	return presignResult.URL, nil
}

// GeneratePresignedDownloadURL genera una URL pre-firmada para descargar un archivo.
func (s *S3StorageService) GeneratePresignedDownloadURL(ctx context.Context, tenantID, objectKey string) (string, error) {
	// Construir la clave con aislamiento de tenant
	fullKey := s.buildTenantKey(tenantID, objectKey)

	// Crear el comando de descarga
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(fullKey),
	}

	// Crear el presigner
	presignClient := s3.NewPresignClient(s.client)

	// Generar la URL pre-firmada con expiración de 1 hora
	presignResult, err := presignClient.PresignGetObject(ctx, input,
		s3.WithPresignExpires(1*time.Hour),
	)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}

	return presignResult.URL, nil
}

// Verificar que S3StorageService implementa la interfaz FileStorageService
var _ ports.FileStorageService = (*S3StorageService)(nil)