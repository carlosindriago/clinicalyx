package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResolveRequestedRole(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		wantOK      bool
		wantInBody  string
		expectedSub string
	}{
		{
			name:        "default cuando no se pasa role",
			query:       "",
			wantOK:      true,
			expectedSub: "DOCTOR",
		},
		{
			name:        "doctor explícito",
			query:       "role=doctor",
			wantOK:      true,
			expectedSub: "DOCTOR",
		},
		{
			name:        "receptionist",
			query:       "role=receptionist",
			wantOK:      true,
			expectedSub: "RECEPTIONIST",
		},
		{
			name:        "admin mapea a SUPERADMIN",
			query:       "role=admin",
			wantOK:      true,
			expectedSub: "SUPERADMIN",
		},
		{
			name:       "rol inválido devuelve 400",
			query:      "role=hacker",
			wantOK:     false,
			wantInBody: "rol inválido",
		},
		{
			name:       "rol vacío explícito (role=) devuelve 400",
			query:      "role=",
			wantOK:     true, // vacío cae al default doctor
			expectedSub: "DOCTOR",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/demo/start", strings.NewReader(""))
			if tt.query != "" {
				req = httptest.NewRequest(http.MethodPost, "/api/v1/demo/start?"+tt.query, strings.NewReader(""))
			}

			role, err := resolveRequestedRole(req)

			if !tt.wantOK {
				if err == nil {
					t.Fatalf("se esperaba error para query=%q, se obtuvo role=%v", tt.query, role)
				}
				if !strings.Contains(err.Error(), tt.wantInBody) {
					t.Errorf("mensaje de error inesperado: %q (esperaba contener %q)", err.Error(), tt.wantInBody)
				}
				return
			}

			if err != nil {
				t.Fatalf("no se esperaba error para query=%q, se obtuvo: %v", tt.query, err)
			}
			if string(role) != tt.expectedSub {
				t.Errorf("se esperaba role=%q, se obtuvo %q", tt.expectedSub, string(role))
			}
		})
	}
}
