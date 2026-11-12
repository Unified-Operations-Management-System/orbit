// Package app assembles the HTTP stack: CORS → contract validation → generated
// router → handlers.
package app

import (
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/httpx"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/server"
)

// NewHandler returns the full API handler over an open, migrated database (see
// db.Setup). allowedOrigins is a comma-separated list of browser origins allowed
// to call the API cross-origin.
func NewHandler(allowedOrigins string, conn *sql.DB) (http.Handler, error) {
	// Organization and Access Management: members in SQLite, dev:<role> tokens. The
	// production authenticator plugs in behind the same interface next semester.
	clock := oam.SystemClock{}
	members := infra.NewSQLiteMemberRepository(conn)
	auth := infra.NewDevAuthenticator(members, infra.DemoOrg)
	memberService := oam.NewMemberService(oam.Deps{
		Members:     members,
		Permissions: infra.NewSQLitePermissionRepository(conn),
		Audit:       infra.NewSQLiteAuditLog(conn),
		Tx:          infra.SQLiteTx{DB: conn},
		Mailer:      infra.NewLogMailer(slog.Default()),
		Clock:       clock,
		NewID:       infra.NewIDGenerator(),
	})

	strict := oapi.NewStrictHandlerWithOptions(server.New(memberService), nil, oapi.StrictHTTPServerOptions{
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
	mux.Handle("/", httpx.RequestValidator(validationSpec)(server.Authenticate(auth)(api)))

	return httpx.CORS(allowedOrigins, mux), nil
}
