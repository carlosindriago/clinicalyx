package crypto

import (
	"testing"
)

func TestCryptoService(t *testing.T) {
	key := "thisisaverysecretkey32byteslong!" // 32 bytes
	salt := "my-blind-index-salt-secret-key"

	service, err := NewCryptoService(key, salt)
	if err != nil {
		t.Fatalf("no se esperaba error al inicializar el servicio de criptografía: %v", err)
	}

	t.Run("Cifrado y descifrado exitoso", func(t *testing.T) {
		plainText := "carlos@clinicalyx.com"

		cipherText, err := service.Encrypt(plainText)
		if err != nil {
			t.Fatalf("error cifrando: %v", err)
		}

		if cipherText == plainText {
			t.Error("el texto cifrado no debería ser igual al texto plano")
		}

		decrypted, err := service.Decrypt(cipherText)
		if err != nil {
			t.Fatalf("error descifrando: %v", err)
		}

		if decrypted != plainText {
			t.Errorf("se esperaba descifrar a %q, se obtuvo %q", plainText, decrypted)
		}
	})

	t.Run("Cifrados no deterministas", func(t *testing.T) {
		plainText := "12345678"

		cipher1, err := service.Encrypt(plainText)
		if err != nil {
			t.Fatalf("error 1: %v", err)
		}

		cipher2, err := service.Encrypt(plainText)
		if err != nil {
			t.Fatalf("error 2: %v", err)
		}

		if cipher1 == cipher2 {
			t.Error("AES-GCM debería generar cifrados distintos para la misma entrada debido al nonce aleatorio")
		}
	})

	t.Run("Descifrado de datos corruptos falla", func(t *testing.T) {
		_, err := service.Decrypt("textonovalidohex")
		if err == nil {
			t.Error("se esperaba un error al descifrar texto no hexadecimal o corrupto")
		}
	})

	t.Run("Blind Index determinista y único", func(t *testing.T) {
		val1 := "carlos@clinicalyx.com"
		val2 := "carlos@clinicalyx.com " // con espacio

		bi1 := service.BlindIndex(val1)
		bi2 := service.BlindIndex(val1)

		if bi1 != bi2 {
			t.Error("el Blind Index debe ser estrictamente determinista")
		}

		bi3 := service.BlindIndex(val2)
		if bi1 == bi3 {
			t.Error("el Blind Index de valores distintos no debería colisionar")
		}
	})
}
