package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

// CryptoService provee utilidades seguras para el cifrado AES-GCM y Blind Indexing HMAC-SHA256.
type CryptoService struct {
	gcm  cipher.AEAD
	salt []byte
}

// NewCryptoService inicializa el servicio validando el tamaño de la clave maestra.
func NewCryptoService(key string, salt string) (*CryptoService, error) {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, fmt.Errorf("la clave de cifrado debe ser exactamente de 32 bytes (256 bits), se obtuvieron %d bytes", len(keyBytes))
	}

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("error inicializando cifrador de bloque AES: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("error inicializando modo GCM: %w", err)
	}

	if len(salt) == 0 {
		return nil, errors.New("el salt para Blind Index no puede estar vacío")
	}

	return &CryptoService{
		gcm:  gcm,
		salt: []byte(salt),
	}, nil
}

// Encrypt cifra un string de texto plano usando AES-256-GCM.
// Retorna un string codificado en hexadecimal que contiene el nonce y los datos cifrados.
func (c *CryptoService) Encrypt(plainText string) (string, error) {
	nonce := make([]byte, c.gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("error generando nonce seguro aleatorio: %w", err)
	}

	cipherText := c.gcm.Seal(nil, nonce, []byte(plainText), nil)

	// Concatenamos el nonce (primeros 12 bytes) + los datos cifrados reales
	result := append(nonce, cipherText...)

	return hex.EncodeToString(result), nil
}

// EncryptBytes cifra bytes usando AES-256-GCM.
func (c *CryptoService) EncryptBytes(plainText []byte) ([]byte, error) {
	nonceSize := c.gcm.NonceSize()
	result := make([]byte, nonceSize+len(plainText)+c.gcm.Overhead())
	nonce := result[:nonceSize]
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("error generando nonce seguro aleatorio: %w", err)
	}

	c.gcm.Seal(result[nonceSize:nonceSize], nonce, plainText, nil)
	return result, nil
}

// Decrypt descifra un string codificado en hexadecimal usando AES-256-GCM.
func (c *CryptoService) Decrypt(cipherTextHex string) (string, error) {
	data, err := hex.DecodeString(cipherTextHex)
	if err != nil {
		return "", fmt.Errorf("error decodificando hexadecimal del texto cifrado: %w", err)
	}

	nonceSize := c.gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("longitud del texto cifrado muy corta (faltan bytes del nonce)")
	}

	nonce := data[:nonceSize]
	cipherText := data[nonceSize:]

	plainTextBytes, err := c.gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return "", fmt.Errorf("error descifrando datos (clave inválida o datos manipulados): %w", err)
	}

	return string(plainTextBytes), nil
}

// DecryptBytes descifra bytes usando AES-256-GCM y escribe el resultado en el buffer dst reutilizable para mitigar la sobrecarga del Garbage Collector.
func (c *CryptoService) DecryptBytes(cipherText []byte, dst []byte) ([]byte, error) {
	nonceSize := c.gcm.NonceSize()
	if len(cipherText) < nonceSize {
		return nil, errors.New("longitud del texto cifrado muy corta (faltan bytes del nonce)")
	}

	nonce := cipherText[:nonceSize]
	cipherTextData := cipherText[nonceSize:]

	plainTextBytes, err := c.gcm.Open(dst[:0], nonce, cipherTextData, nil)
	if err != nil {
		return nil, fmt.Errorf("error descifrando bytes: %w", err)
	}

	return plainTextBytes, nil
}

// BlindIndex calcula un hash determinista HMAC-SHA256 sobre el dato de entrada.
// Se utiliza para búsquedas exactas eficientes en bases de datos sobre campos cifrados.
func (c *CryptoService) BlindIndex(value string) string {
	mac := hmac.New(sha256.New, c.salt)
	mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

