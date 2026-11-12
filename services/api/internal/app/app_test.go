package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// contractClient sends requests through the real HTTP stack and checks every
// response against the OpenAPI contract (status code, content type, body schema).
// If a handler drifts from packages/api-spec, these tests fail.
type contractClient struct {
	t       *testing.T
	handler http.Handler
	router  routers.Router
	token   string // sent as a bearer token when set
}

// newTestDB returns an in-memory database with every area migrated and the dev seed.
func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	conn, err := db.Open(context.Background(), ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Setup(context.Background(), conn, db.Dev, Areas...); err != nil {
		t.Fatal(err)
	}
	return conn
}

func newContractClient(t *testing.T) *contractClient {
	t.Helper()
	h, err := NewHandler("http://localhost:8081", newTestDB(t))
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
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
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

func TestMembersFollowContract(t *testing.T) {
	c := newContractClient(t)
	as := func(token string) *contractClient { c.token = token; return c }

	// Sign in (UC-OAM-08).
	if code, _ := as("").do(http.MethodGet, "/auth/session", nil); code != http.StatusUnauthorized {
		t.Fatalf("session without token: %d", code)
	}
	if code, _ := as("dev:nobody").do(http.MethodGet, "/auth/session", nil); code != http.StatusUnauthorized {
		t.Fatalf("session with bad token: %d", code)
	}
	code, body := as("dev:owner").do(http.MethodGet, "/auth/session", nil)
	var me oapi.Member
	_ = json.Unmarshal(body, &me)
	if code != http.StatusOK || me.Role != oapi.Owner {
		t.Fatalf("owner session: %d %s", code, body)
	}

	// List, scoped by role (BR-OAM-R09).
	listAs := func(token string) []string {
		t.Helper()
		code, body := as(token).do(http.MethodGet, "/members", nil)
		var list []oapi.Member
		_ = json.Unmarshal(body, &list)
		if code != http.StatusOK {
			t.Fatalf("list as %s: %d %s", token, code, body)
		}
		ids := make([]string, len(list))
		for i, m := range list {
			ids[i] = m.Id
		}
		return ids
	}
	if ids := listAs("dev:owner"); len(ids) != 6 {
		t.Fatalf("owner sees %v, want all 6", ids)
	}
	if ids := listAs("dev:supervisor"); strings.Join(ids, ",") != "m-2,m-3,m-5" {
		t.Fatalf("supervisor sees %v, want own team m-2,m-3,m-5", ids)
	}
	if ids := listAs("dev:employee"); strings.Join(ids, ",") != "m-3" {
		t.Fatalf("employee sees %v, want only m-3", ids)
	}

	// Invite (UC-OAM-01).
	invite := map[string]any{"name": "Dana Fox", "email": "dana@example.com", "role": "Employee"}
	if code, _ := as("dev:supervisor").do(http.MethodPost, "/members", invite); code != http.StatusForbidden {
		t.Fatalf("supervisor invite: %d", code)
	}
	code, body = as("dev:hr-admin").do(http.MethodPost, "/members", invite)
	var invited oapi.Member
	_ = json.Unmarshal(body, &invited)
	if code != http.StatusCreated || invited.Status != oapi.Pending {
		t.Fatalf("invite: %d %s", code, body)
	}
	if code, _ := as("dev:owner").do(http.MethodPost, "/members", invite); code != http.StatusConflict {
		t.Fatalf("duplicate invite: %d", code)
	}
	ownerInvite := map[string]any{"name": "Two Owners", "email": "two@example.com", "role": "Owner"}
	if code, body := as("dev:owner").do(http.MethodPost, "/members", ownerInvite); code != http.StatusUnprocessableEntity {
		t.Fatalf("invite as owner: %d %s", code, body)
	}

	// Approve (UC-OAM-02).
	if code, _ := as("dev:employee").do(http.MethodPost, "/members/"+invited.Id+"/approve", nil); code != http.StatusForbidden {
		t.Fatalf("employee approve: %d", code)
	}
	code, body = as("dev:owner").do(http.MethodPost, "/members/"+invited.Id+"/approve", nil)
	var approved oapi.Member
	_ = json.Unmarshal(body, &approved)
	if code != http.StatusOK || approved.Status != oapi.Active {
		t.Fatalf("approve: %d %s", code, body)
	}
	if code, _ := as("dev:owner").do(http.MethodPost, "/members/"+invited.Id+"/approve", nil); code != http.StatusConflict {
		t.Fatalf("approve twice: %d", code)
	}
	if code, _ := as("dev:owner").do(http.MethodPost, "/members/m-nope/approve", nil); code != http.StatusNotFound {
		t.Fatalf("approve missing: %d", code)
	}

	// Deactivate (UC-OAM-03).
	if code, _ := as("dev:owner").do(http.MethodPost, "/members/"+me.Id+"/deactivate", nil); code != http.StatusConflict {
		t.Fatalf("deactivate owner: %d", code)
	}
	code, body = as("dev:owner").do(http.MethodPost, "/members/"+invited.Id+"/deactivate", nil)
	var gone oapi.Member
	_ = json.Unmarshal(body, &gone)
	if code != http.StatusOK || gone.Status != oapi.Deactivated {
		t.Fatalf("deactivate: %d %s", code, body)
	}
}

func TestRolesPermissionsAuditFollowContract(t *testing.T) {
	c := newContractClient(t)
	as := func(token string) *contractClient { c.token = token; return c }

	// Change role (UC-OAM-06).
	code, body := as("dev:owner").do(http.MethodPatch, "/members/m-3/role", map[string]any{"role": "Supervisor"})
	var sam oapi.Member
	_ = json.Unmarshal(body, &sam)
	if code != http.StatusOK || sam.Role != oapi.Supervisor {
		t.Fatalf("change role: %d %s", code, body)
	}
	if code, _ := as("dev:hr-admin").do(http.MethodPatch, "/members/m-3/role", map[string]any{"role": "Employee"}); code != http.StatusForbidden {
		t.Fatalf("hr admin without roles.assign: %d", code)
	}
	if code, _ := as("dev:owner").do(http.MethodPatch, "/members/m-1/role", map[string]any{"role": "Employee"}); code != http.StatusConflict {
		t.Fatalf("owner's own role: %d", code)
	}
	if code, _ := as("dev:owner").do(http.MethodPatch, "/members/m-3/role", map[string]any{"role": "Owner"}); code != http.StatusUnprocessableEntity {
		t.Fatalf("second owner: %d", code)
	}

	// Permissions.
	// Sam (the only active employee) is a supervisor now, so read as a supervisor.
	code, body = as("dev:supervisor").do(http.MethodGet, "/permissions", nil)
	var matrix oapi.PermissionMatrix
	_ = json.Unmarshal(body, &matrix)
	if code != http.StatusOK || len(matrix.Rows) != 7 {
		t.Fatalf("read matrix: %d %s", code, body)
	}
	for i, row := range matrix.Rows {
		if row.Action == "members.manage" {
			matrix.Rows[i].Allowed = append(row.Allowed, oapi.Supervisor)
		}
	}
	if code, _ := as("dev:supervisor").do(http.MethodPut, "/permissions", matrix); code != http.StatusForbidden {
		t.Fatalf("supervisor edits matrix: %d", code)
	}
	if code, body := as("dev:owner").do(http.MethodPut, "/permissions", matrix); code != http.StatusOK {
		t.Fatalf("owner edits matrix: %d %s", code, body)
	}
	invite := map[string]any{"name": "Via Matrix", "email": "matrix@example.com", "role": "Employee"}
	if code, body := as("dev:supervisor").do(http.MethodPost, "/members", invite); code != http.StatusCreated {
		t.Fatalf("supervisor invites after the edit: %d %s", code, body)
	}
	for i, row := range matrix.Rows {
		if row.Action == "roles.assign" {
			matrix.Rows[i].Allowed = []oapi.MemberRole{oapi.HRAdmin}
		}
	}
	if code, _ := as("dev:owner").do(http.MethodPut, "/permissions", matrix); code != http.StatusUnprocessableEntity {
		t.Fatalf("removing the owner from roles.assign: %d", code)
	}

	// Audit history (BR-OAM-R10): newest first, every change above recorded.
	if code, _ := as("dev:supervisor").do(http.MethodGet, "/audit", nil); code != http.StatusForbidden {
		t.Fatalf("supervisor reads audit: %d", code)
	}
	code, body = as("dev:hr-admin").do(http.MethodGet, "/audit?limit=10", nil)
	var entries []oapi.AuditEntry
	_ = json.Unmarshal(body, &entries)
	if code != http.StatusOK || len(entries) != 3 {
		t.Fatalf("audit: %d %s", code, body)
	}
	want := []oapi.AuditAction{"member.invited", "permissions.updated", "role.changed"}
	for i, e := range entries {
		if e.Action != want[i] || e.Actor == "" {
			t.Fatalf("entry %d: %+v, want %s with an actor", i, e, want[i])
		}
	}
}

func TestUnknownRoute(t *testing.T) {
	h, err := NewHandler("", newTestDB(t))
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
