package crypto

import (
	"testing"

	"clinicalyx/backend/internal/core/domain"
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

	t.Run("Blind Index determinista y único dentro de un tenant", func(t *testing.T) {
		tenantA, _ := domain.ParseTenantID("11111111-1111-4111-8111-111111111111")
		val1 := "carlos@clinicalyx.com"
		val2 := "carlos@clinicalyx.com " // con espacio

		bi1 := service.BlindIndex(tenantA, val1)
		bi2 := service.BlindIndex(tenantA, val1)

		if bi1 != bi2 {
			t.Error("el Blind Index debe ser estrictamente determinista dentro de un tenant")
		}

		bi3 := service.BlindIndex(tenantA, val2)
		if bi1 == bi3 {
			t.Error("el Blind Index de valores distintos no debería colisionar")
		}
	})

	t.Run("Blind Index per-tenant: mismo email produce hash distinto en tenants distintos", func(t *testing.T) {
		tenantA, _ := domain.ParseTenantID("11111111-1111-4111-8111-111111111111")
		tenantB, _ := domain.ParseTenantID("22222222-2222-4222-8222-222222222222")
		email := "carlos@clinicalyx.com"

		biA := service.BlindIndex(tenantA, email)
		biB := service.BlindIndex(tenantB, email)

		if biA == biB {
			t.Error("el mismo email en tenants distintos DEBE producir hashes distintos (anti-correlación cross-tenant)")
		}
	})

	t.Run("Blind Index per-tenant: no hay colisiones con separador en valor", func(t *testing.T) {
		// Verificar que la concatenación con ':' no es ambigua. Es decir,
		// que tenantA:val("a-b") + sep("c") != tenantA:val("a") + sep("b-c")
		tenantA, _ := domain.ParseTenantID("11111111-1111-4111-8111-111111111111")

		biCombo1 := service.BlindIndex(tenantA, "a-b:c")  // una sola pieza
		// (no podemos construir el equivalente "a" + sep + "b-c" sin
		// cambiar la API, pero verificamos que el hash es estable
		// y que el separador no produce colisiones obvias).
		biCombo2 := service.BlindIndex(tenantA, "a:b-c")
		if biCombo1 == biCombo2 {
			t.Error("el separador ':' no debería producir colisiones para valores distintos")
		}
	})
}
