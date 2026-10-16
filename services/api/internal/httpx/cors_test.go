package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	h := CORS("http://localhost:8081, http://example.com", ok)

	// Preflight from an allowed origin.
	req := httptest.NewRequest(http.MethodOptions, "/todos", nil)
	req.Header.Set("Origin", "http://localhost:8081")
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "content-type")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:8081" {
		t.Fatalf("preflight: code=%d headers=%v", rec.Code, rec.Header())
	}

	// Disallowed origin gets no CORS headers.
	req = httptest.NewRequest(http.MethodGet, "/todos", nil)
	req.Header.Set("Origin", "http://evil.test")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("disallowed origin received CORS headers")
	}

	// No Origin (native apps, server-to-server) passes straight through.
	req = httptest.NewRequest(http.MethodGet, "/todos", nil)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("no origin: code=%d", rec.Code)
	}
}
