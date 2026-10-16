// Package app assembles the HTTP stack: CORS → contract validation → generated
// router → handlers.
package app

import (
	"fmt"
	"log/slog"
	"net/http"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/httpx"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/server"
)

// NewHandler returns the full API handler. allowedOrigins is a comma-separated
// list of browser origins allowed to call the API cross-origin.
func NewHandler(allowedOrigins string) (http.Handler, error) {
	strict := oapi.NewStrictHandlerWithOptions(server.New(), nil, oapi.StrictHTTPServerOptions{
		RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			httpx.WriteProblem(w, http.StatusUnprocessableEntity, err.Error(), nil)
		},
		ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			slog.ErrorContext(r.Context(), "handler error", "err", err, "path", r.URL.Path)
			httpx.WriteProblem(w, http.StatusInternalServerError, "internal error", nil)
		},
	})

	api := oapi.HandlerWithOptions(strict, oapi.StdHTTPServerOptions{
		BaseRouter: http.NewServeMux(),
		ErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
			httpx.WriteProblem(w, http.StatusUnprocessableEntity, err.Error(), nil)
		},
	})

	// Two copies of the embedded spec: the validator mutates its copy.
	validationSpec, err := oapi.GetSwagger()
	if err != nil {
		return nil, fmt.Errorf("load embedded spec: %w", err)
	}
	docsSpec, err := oapi.GetSwagger()
	if err != nil {
		return nil, fmt.Errorf("load embedded spec: %w", err)
	}

	mux := http.NewServeMux()
	mux.Handle("GET /openapi.json", httpx.SpecHandler(docsSpec))
	mux.Handle("GET /docs", httpx.DocsHandler())
	mux.Handle("/", httpx.RequestValidator(validationSpec)(api))

	return httpx.CORS(allowedOrigins, mux), nil
}
