package config

import (
	"testing"
)

func TestIsUnsafePlaceholder(t *testing.T) {
	t.Run("Detecta placeholders conocidos", func(t *testing.T) {
		unsafe := []string{
			"change_me_32_byte_encryption_key",
			"CHANGE_ME_PRODUCTION_VALUE",
			"some_placeholder_value",
			"<INSERTE_AQUI_CLAVE_32_BYTES>",
			"please_reemplazar_antes_de_desplegar",
			"my-set_me-key",
			"setme_inserte_aqui",
			"development_key_for_local_use",
			"dev_key_only_local",
		}
		for _, v := range unsafe {
			if !isUnsafePlaceholder(v) {
				t.Errorf("se esperaba que %q fuera detectado como placeholder inseguro", v)
			}
		}
	})

	t.Run("Acepta valores seguros", func(t *testing.T) {
		safe := []string{
			"xK9mP2vR8nQ4wL7jT6yH3bF5dG1aZ0cE",
			"3f8a2b1e9c4d7e0f6a5b8c2d1e9f4a7b",
			"random-strong-secret-value-no-markers-here-12345",
			"my-application-secret-key-with-sufficient-entropy",
		}
		for _, v := range safe {
			if isUnsafePlaceholder(v) {
				t.Errorf("se esperaba que %q NO fuera detectado como placeholder", v)
			}
		}
	})

	t.Run("Cadena vacía no es placeholder (se valida aparte)", func(t *testing.T) {
		if isUnsafePlaceholder("") {
			t.Error("cadena vacía no debe marcarse como placeholder inseguro")
		}
	})
}

func TestValidate_RejectsCryptoPlaceholders(t *testing.T) {
	// Configuración mínima válida excepto por los placeholders conocidos.
	buildCfg := func(encKey, blindSalt, jwtSecret string) *Config {
		return &Config{
			Port:                     "8080",
			Env:                      "production",
			DatabaseURL:              "postgres://u:p@h:5432/d",
			EncryptionKey:            encKey,
			BlindIndexSalt:           blindSalt,
			JWTSecret:                jwtSecret,
			JWTAccessDurationMinutes: 15,
			JWTRefreshDurationDays:   7,
		}
	}

	t.Run("Rechaza EncryptionKey con change_me", func(t *testing.T) {
		cfg := buildCfg("change_me_32_byte_encryption_key_xxxx", "valid_salt_32_plus_characters_random", "valid_jwt_secret_32_plus_chars_xxxxx")
		err := cfg.Validate()
		if err == nil {
			t.Error("se esperaba error por ENCRYPTION_KEY placeholder, se obtuvo nil")
		}
	})

	t.Run("Rechaza BlindIndexSalt con placeholder", func(t *testing.T) {
		cfg := buildCfg("valid_encryption_key_32_plus_chars_xxxxx", "change_me_32_plus_chars_blind_index_salt", "valid_jwt_secret_32_plus_chars_xxxxx")
		err := cfg.Validate()
		if err == nil {
			t.Error("se esperaba error por BLIND_INDEX_SALT placeholder, se obtuvo nil")
		}
	})

	t.Run("Rechaza JWTSecret con placeholder", func(t *testing.T) {
		cfg := buildCfg("valid_encryption_key_32_plus_chars_xxxxx", "valid_salt_32_plus_characters_random", "change_me_32_plus_chars_jwt_signing_secret")
		err := cfg.Validate()
		if err == nil {
			t.Error("se esperaba error por JWT_SECRET placeholder, se obtuvo nil")
		}
	})

	t.Run("Acepta secrets criptográficamente aleatorios", func(t *testing.T) {
		cfg := buildCfg(
			"xK9mP2vR8nQ4wL7jT6yH3bF5dG1aZ0cE",          // 32 chars
			"3f8a2b1e9c4d7e0f6a5b8c2d1e9f4a7b",          // 32 chars
			"9b1f4a7c2e8d5f0a6b3c9e1d4f7a2b5c8e1d4f7a", // 40 chars
		)
		if err := cfg.Validate(); err != nil {
			t.Errorf("configuración segura fue rechazada: %v", err)
		}
	})

	t.Run("Rechaza EncryptionKey < 32 chars", func(t *testing.T) {
		cfg := buildCfg("short_key", "valid_salt_32_plus_characters_random", "valid_jwt_secret_32_plus_chars_xxxxx")
		err := cfg.Validate()
		if err == nil {
			t.Error("se esperaba error por ENCRYPTION_KEY corta")
		}
	})

	t.Run("Rechaza JWTSecret < 32 chars", func(t *testing.T) {
		cfg := buildCfg("valid_encryption_key_32_plus_chars_xxxxx", "valid_salt_32_plus_characters_random", "short")
		err := cfg.Validate()
		if err == nil {
			t.Error("se esperaba error por JWT_SECRET corto")
		}
	})
}
