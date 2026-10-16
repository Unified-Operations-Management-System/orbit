package httpx

import (
	"encoding/json"
	"net/http"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/oapi"
)

// WriteProblem writes an RFC 9457 problem details response using the Problem
// schema from the contract.
func WriteProblem(w http.ResponseWriter, status int, detail string, fieldErrors []oapi.FieldError) {
	p := oapi.Problem{Title: http.StatusText(status), Status: status}
	if detail != "" {
		p.Detail = &detail
	}
	if len(fieldErrors) > 0 {
		p.Errors = &fieldErrors
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(p)
}
