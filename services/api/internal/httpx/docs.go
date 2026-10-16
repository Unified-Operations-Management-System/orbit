package httpx

import (
	"encoding/json"
	"net/http"

	"github.com/getkin/kin-openapi/openapi3"
)

// SpecHandler serves the embedded contract at /openapi.json.
func SpecHandler(spec *openapi3.T) http.Handler {
	body, err := json.MarshalIndent(spec, "", "  ")
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if err != nil {
			WriteProblem(w, http.StatusInternalServerError, "could not render spec", nil)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(body)
	})
}

// DocsHandler serves interactive API docs (Scalar) for /openapi.json at /docs.
func DocsHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte(docsHTML))
	})
}

const docsHTML = `<!doctype html>
<html>
  <head>
    <title>Orbit API</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.74.0"></script>
  </body>
</html>`
