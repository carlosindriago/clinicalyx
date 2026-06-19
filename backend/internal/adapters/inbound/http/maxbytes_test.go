package http

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMaxBytesMiddleware(t *testing.T) {
	const limit int64 = 1024 // 1 KiB para que el test sea rápido

	handler := MaxBytesMiddleware(limit)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Intentar leer TODO el body.
		body, err := io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusRequestEntityTooLarge)
			_, _ = w.Write([]byte(err.Error()))
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(body)
	}))

	t.Run("Permite body dentro del límite", func(t *testing.T) {
		payload := strings.Repeat("a", 512) // 512 bytes < 1024
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(payload))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("se esperaba 200, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Rechaza body que excede el límite con MaxBytesError", func(t *testing.T) {
		payload := strings.Repeat("a", 4096) // 4 KiB > 1024
		var seenErr error
		var maxBytesErr *http.MaxBytesError
		h := MaxBytesMiddleware(limit)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, seenErr = io.ReadAll(r.Body)
		}))
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBufferString(payload))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, req)

		if seenErr == nil {
			t.Fatal("se esperaba error por body demasiado grande, se obtuvo nil")
		}
		if !errorsAs(seenErr, &maxBytesErr) {
			t.Errorf("se esperaba *http.MaxBytesError, se obtuvo %T: %v", seenErr, seenErr)
		}
		if maxBytesErr.Limit != limit {
			t.Errorf("se esperaba limit=%d, se obtuvo %d", limit, maxBytesErr.Limit)
		}
	})
}

func TestDecodeJSONBody(t *testing.T) {
	t.Run("Decodifica JSON válido", func(t *testing.T) {
		body := strings.NewReader(`{"name":"Carlos"}`)
		req := httptest.NewRequest(http.MethodPost, "/", body)
		var target map[string]string
		if err := decodeJSONBody(req, &target); err != nil {
			t.Fatalf("decode falló: %v", err)
		}
		if target["name"] != "Carlos" {
			t.Errorf("name=%q", target["name"])
		}
	})

	t.Run("Devuelve ErrRequestBodyTooLarge cuando se excede el límite", func(t *testing.T) {
		const limit int64 = 64
		handler := MaxBytesMiddleware(limit)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var target map[string]interface{}
			err := decodeJSONBody(r, &target)
			if err == ErrRequestBodyTooLarge {
				w.WriteHeader(http.StatusRequestEntityTooLarge)
				return
			}
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				_, _ = w.Write([]byte(err.Error()))
				return
			}
			w.WriteHeader(http.StatusOK)
		}))

		// Construir un body de > 64 bytes.
		big, _ := json.Marshal(map[string]string{"k": strings.Repeat("v", 200)})
		req := httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer(big))
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusRequestEntityTooLarge {
			t.Errorf("se esperaba 413, se obtuvo %d. Body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Rechaza JSON con campos desconocidos (DisallowUnknownFields)", func(t *testing.T) {
		// decodeJSONBody usa DisallowUnknownFields para ser estricto.
		// El target debe ser un struct (no map) para que la regla
		// tenga efecto.
		body := strings.NewReader(`{"name":"X","extra_field":"Y"}`)
		req := httptest.NewRequest(http.MethodPost, "/", body)
		type strict struct {
			Name string `json:"name"`
		}
		var target strict
		err := decodeJSONBody(req, &target)
		if err == nil {
			t.Error("se esperaba error por campo desconocido, se obtuvo nil")
		}
		if !strings.Contains(err.Error(), "extra_field") && !strings.Contains(err.Error(), "unknown field") {
			t.Errorf("se esperaba error mencionando 'extra_field' o 'unknown field', se obtuvo: %v", err)
		}
	})
}

// errorsAs es un wrapper minimalista para evitar importar errors en test.
func errorsAs(err error, target interface{}) bool {
	type wrapper interface{ Unwrap() error }
	for err != nil {
		if mbe, ok := err.(*http.MaxBytesError); ok {
			if t, ok := target.(**http.MaxBytesError); ok {
				*t = mbe
				return true
			}
		}
		w, ok := err.(wrapper)
		if !ok {
			return false
		}
		err = w.Unwrap()
	}
	return false
}
