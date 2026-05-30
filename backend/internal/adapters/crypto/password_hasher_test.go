package crypto_test

import (
	"testing"

	"clinicalyx/backend/internal/adapters/crypto"
)

func TestArgon2idPasswordHasher(t *testing.T) {
	hasher := crypto.NewArgon2idPasswordHasher()
	password := "supersecurepassword123!"

	t.Run("Hasheo y verificación exitosa", func(t *testing.T) {
		hash, err := hasher.Hash(password)
		if err != nil {
			t.Fatalf("no se esperaba error al hashear: %v", err)
		}

		match, err := hasher.Verify(password, hash)
		if err != nil {
			t.Fatalf("no se esperaba error al verificar: %v", err)
		}

		if !match {
			t.Error("la contraseña debería coincidir con el hash")
		}
	})

	t.Run("Verificación incorrecta para contraseña errónea", func(t *testing.T) {
		hash, err := hasher.Hash(password)
		if err != nil {
			t.Fatalf("no se esperaba error al hashear: %v", err)
		}

		match, err := hasher.Verify("wrongpassword", hash)
		if err != nil {
			t.Fatalf("no se esperaba error al verificar: %v", err)
		}

		if match {
			t.Error("la contraseña incorrecta no debería coincidir con el hash")
		}
	})
}
