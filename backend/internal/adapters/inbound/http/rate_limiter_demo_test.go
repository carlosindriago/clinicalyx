package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewDemoRateLimiter_StrictLimit(t *testing.T) {
	// El limiter del demo debe permitir 3 ráfagas iniciales y luego
	// rechazar con 429. La ventana de relleno es 20 minutos pero en
	// el test verificamos que después de burst=3 la siguiente request
	// falla.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mw := NewDemoRateLimiter(ctx, nil)

	// Las primeras 3 requests pasan (burst=3).
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/demo/start", nil)
		req.RemoteAddr = "203.0.113.50:1234"
		w := httptest.NewRecorder()

		called := false
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			called = true
		})).ServeHTTP(w, req)

		if !called {
			t.Errorf("request #%d debió pasar el rate limiter, fue bloqueada", i+1)
		}
	}

	// La 4ª debe ser rechazada con 429.
	req := httptest.NewRequest(http.MethodPost, "/api/v1/demo/start", nil)
	req.RemoteAddr = "203.0.113.50:1234"
	w := httptest.NewRecorder()

	mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("el handler siguiente NO debió ejecutarse: rate limit excedido")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("se esperaba 429, se obtuvo %d", w.Code)
	}

	// Verificar que el header Retry-After está seteado.
	retryAfter := w.Header().Get("Retry-After")
	if retryAfter == "" {
		t.Error("se esperaba header Retry-After")
	}
}

func TestNewDemoRateLimiter_DifferentIPs(t *testing.T) {
	// IPs distintas deben tener contadores independientes.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mw := NewDemoRateLimiter(ctx, nil)

	// IP A consume sus 3 requests.
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.RemoteAddr = "198.51.100.1:1234"
		w := httptest.NewRecorder()
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(w, req)
	}

	// IP B debe pasar (no comparte bucket con A).
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "198.51.100.2:5678"
	w := httptest.NewRecorder()

	called := false
	mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})).ServeHTTP(w, req)

	if !called {
		t.Error("IP B debió pasar el rate limiter, fue bloqueada por IP A")
	}
}

func TestNewDemoRateLimiter_RejectionMessage(t *testing.T) {
	// El mensaje de 429 debe ser claro y mencionar el límite de 3 demos/hora.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mw := NewDemoRateLimiter(ctx, nil)

	// Saturar el bucket.
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodPost, "/", nil)
		req.RemoteAddr = "192.0.2.99:1234"
		w := httptest.NewRecorder()
		mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(w, req)
	}

	// Cuarta request: capturar el body.
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.RemoteAddr = "192.0.2.99:1234"
	w := httptest.NewRecorder()
	mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(w, req)

	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("se esperaba 429, se obtuvo %d", w.Code)
	}

	body := w.Body.String()
	if body == "" {
		t.Error("se esperaba body de error con mensaje")
	}
	// No verificamos substring exacto para no atar el test al copy,
	// pero sí que el body NO esté vacío.
}
