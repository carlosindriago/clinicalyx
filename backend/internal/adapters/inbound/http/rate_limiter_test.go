package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestExtractIP_NoTrustedProxies_IgnoresForwardedHeaders(t *testing.T) {
	// Sin proxies confiables configurados, el comportamiento debe ser
	// siempre usar RemoteAddr, ignorando X-Forwarded-For / X-Real-IP
	// incluso si vienen con valores plausibles.
	tp := NewTrustedProxiesFromCIDRs(nil)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.50:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")
	req.Header.Set("X-Real-IP", "198.51.100.2")

	got := ExtractIP(req, tp)
	want := "203.0.113.50"
	if got != want {
		t.Errorf("se esperaba %q (RemoteAddr), se obtuvo %q", want, got)
	}
}

func TestExtractIP_EmptyTrustedList_IgnoresForwardedHeaders(t *testing.T) {
	// Lista explícitamente vacía = mismo comportamiento que nil.
	tp := NewTrustedProxiesFromCIDRs([]string{})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.50:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")

	got := ExtractIP(req, tp)
	if got != "203.0.113.50" {
		t.Errorf("con lista vacía se esperaba ignorar headers, se obtuvo %q", got)
	}
}

func TestExtractIP_RequestFromUntrustedSource_IgnoresForwardedHeaders(t *testing.T) {
	// Aunque haya un proxy confiable configurado, si la conexión NO
	// viene de él, los headers son spoofing y deben ignorarse.
	tp := NewTrustedProxiesFromCIDRs([]string{"10.0.0.0/8"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.50:12345" // IP pública, no en 10.0.0.0/8
	req.Header.Set("X-Forwarded-For", "198.51.100.1")

	got := ExtractIP(req, tp)
	if got != "203.0.113.50" {
		t.Errorf("desde IP no confiable se esperaba RemoteAddr, se obtuvo %q", got)
	}
}

func TestExtractIP_RequestFromTrustedSource_HonorsForwardedFor(t *testing.T) {
	// Si la conexión viene de un proxy confiable, se honra X-Forwarded-For
	// tomando la primera IP de la cadena.
	tp := NewTrustedProxiesFromCIDRs([]string{"10.0.0.0/8"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.5:12345" // IP del proxy confiable
	req.Header.Set("X-Forwarded-For", "198.51.100.1, 10.0.0.5")
	req.Header.Set("X-Real-IP", "198.51.100.99")

	got := ExtractIP(req, tp)
	if got != "198.51.100.1" {
		t.Errorf("se esperaba el primer X-Forwarded-For, se obtuvo %q", got)
	}
}

func TestExtractIP_RequestFromTrustedSource_FallsBackToXRealIP(t *testing.T) {
	// Si no hay X-Forwarded-For, se usa X-Real-IP.
	tp := NewTrustedProxiesFromCIDRs([]string{"10.0.0.0/8"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.5:12345"
	req.Header.Set("X-Real-IP", "198.51.100.99")

	got := ExtractIP(req, tp)
	if got != "198.51.100.99" {
		t.Errorf("se esperaba X-Real-IP, se obtuvo %q", got)
	}
}

func TestExtractIP_RequestFromTrustedSource_NoHeaders_UsesRemoteAddr(t *testing.T) {
	// Si la conexión viene de un proxy confiable pero no hay headers
	// de proxy, se usa RemoteAddr como fallback.
	tp := NewTrustedProxiesFromCIDRs([]string{"10.0.0.0/8"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.5:12345"

	got := ExtractIP(req, tp)
	if got != "10.0.0.5" {
		t.Errorf("se esperaba RemoteAddr, se obtuvo %q", got)
	}
}

func TestExtractIP_TrustedSingleIP(t *testing.T) {
	// También se acepta una IP suelta (sin CIDR).
	tp := NewTrustedProxiesFromCIDRs([]string{"192.168.1.50"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.1.50:8080"
	req.Header.Set("X-Forwarded-For", "203.0.113.99")

	got := ExtractIP(req, tp)
	if got != "203.0.113.99" {
		t.Errorf("se esperaba X-Forwarded-For desde proxy IP suelta, se obtuvo %q", got)
	}
}

func TestExtractIP_InvalidCIDRsIgnored(t *testing.T) {
	// Entradas inválidas se ignoran silenciosamente. El resultado debe
	// ser una lista vacía funcional = modo seguro (ignora headers).
	tp := NewTrustedProxiesFromCIDRs([]string{"not-an-ip", "999.999.999.999", ""})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.50:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.1")

	got := ExtractIP(req, tp)
	if got != "203.0.113.50" {
		t.Errorf("con CIDRs inválidos se esperaba ignorar headers, se obtuvo %q", got)
	}
}
