package app

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/oapi"
)

// contractClient sends requests through the real HTTP stack and checks every
// response against the OpenAPI contract (status code, content type, body schema).
// If a handler drifts from packages/api-spec, these tests fail.
type contractClient struct {
	t       *testing.T
	handler http.Handler
	router  routers.Router
}

func newContractClient(t *testing.T) *contractClient {
	t.Helper()
	h, err := NewHandler("http://localhost:8081")
	if err != nil {
		t.Fatal(err)
	}
	spec, err := oapi.GetSwagger()
	if err != nil {
		t.Fatal(err)
	}
	spec.Servers = nil
	router, err := gorillamux.NewRouter(spec)
	if err != nil {
		t.Fatal(err)
	}
	return &contractClient{t: t, handler: h, router: router}
}

func (c *contractClient) do(method, path string, body any) (int, []byte) {
	c.t.Helper()
	var buf []byte
	if body != nil {
		buf, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, path, bytes.NewReader(buf))
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	c.handler.ServeHTTP(rec, req)
	resBody, _ := io.ReadAll(rec.Body)

	// Validate the response against the contract.
	route, pathParams, err := c.router.FindRoute(req)
	if err != nil {
		c.t.Fatalf("%s %s: route not in spec: %v", method, path, err)
	}
	err = openapi3filter.ValidateResponse(context.Background(), &openapi3filter.ResponseValidationInput{
		RequestValidationInput: &openapi3filter.RequestValidationInput{
			Request:    req,
			PathParams: pathParams,
			Route:      route,
			Options:    &openapi3filter.Options{AuthenticationFunc: openapi3filter.NoopAuthenticationFunc},
		},
		Status: rec.Code,
		Header: rec.Header(),
		Body:   io.NopCloser(bytes.NewReader(resBody)),
		Options: &openapi3filter.Options{
			IncludeResponseStatus: true,
			MultiError:            true,
		},
	})
	if err != nil {
		c.t.Errorf("%s %s → %d violates the contract: %v\nbody: %s", method, path, rec.Code, err, resBody)
	}
	return rec.Code, resBody
}

func TestTodosFollowContract(t *testing.T) {
	c := newContractClient(t)

	if code, _ := c.do(http.MethodGet, "/health", nil); code != http.StatusOK {
		t.Fatalf("health: %d", code)
	}

	code, body := c.do(http.MethodPost, "/todos", map[string]any{"title": "write tests"})
	if code != http.StatusCreated {
		t.Fatalf("create: %d %s", code, body)
	}
	var created oapi.Todo
	_ = json.Unmarshal(body, &created)

	if code, _ := c.do(http.MethodGet, "/todos", nil); code != http.StatusOK {
		t.Fatalf("list: %d", code)
	}
	if code, body := c.do(http.MethodPatch, "/todos/"+itoa(created.Id), map[string]any{"done": true}); code != http.StatusOK {
		t.Fatalf("update: %d %s", code, body)
	}
	if code, _ := c.do(http.MethodPatch, "/todos/999", map[string]any{"done": true}); code != http.StatusNotFound {
		t.Fatalf("update missing: %d", code)
	}
	if code, _ := c.do(http.MethodDelete, "/todos/"+itoa(created.Id), nil); code != http.StatusNoContent {
		t.Fatalf("delete: %d", code)
	}
	if code, _ := c.do(http.MethodDelete, "/todos/"+itoa(created.Id), nil); code != http.StatusNotFound {
		t.Fatalf("delete twice: %d", code)
	}
}

func TestValidationErrorsFollowContract(t *testing.T) {
	c := newContractClient(t)

	cases := []struct {
		name, method, path string
		body               any
		wantLocation       string
	}{
		{"empty title", http.MethodPost, "/todos", map[string]any{"title": ""}, "body.title"},
		{"missing title", http.MethodPost, "/todos", map[string]any{}, "body.title"},
		{"unknown field", http.MethodPost, "/todos", map[string]any{"title": "ok", "x": 1}, "body.x"},
		{"wrong type", http.MethodPatch, "/todos/1", map[string]any{"done": "yes"}, "body.done"},
		{"id below minimum", http.MethodPatch, "/todos/0", map[string]any{"done": true}, "path.id"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			code, body := c.do(tc.method, tc.path, tc.body)
			if code != http.StatusUnprocessableEntity {
				t.Fatalf("got %d: %s", code, body)
			}
			var p oapi.Problem
			_ = json.Unmarshal(body, &p)
			if p.Errors == nil || len(*p.Errors) == 0 || (*p.Errors)[0].Location != tc.wantLocation {
				t.Fatalf("want first error at %q, got %s", tc.wantLocation, body)
			}
		})
	}
}

func TestUnknownRoute(t *testing.T) {
	h, err := NewHandler("")
	if err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/nope", nil))
	if rec.Code != http.StatusNotFound || rec.Header().Get("Content-Type") != "application/problem+json" {
		t.Fatalf("got %d %q", rec.Code, rec.Header().Get("Content-Type"))
	}
}

func itoa(n int64) string { return strconv.FormatInt(n, 10) }
