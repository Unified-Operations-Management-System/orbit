package server

import (
	"context"
	"net/http"
	"strings"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
)

type principalKey struct{}

// Authenticate reads the bearer token, asks the Authenticator who it belongs to
// and stores the Principal in the request context. It never rejects a request
// itself: public operations ignore the principal, and protected ones answer 401
// when PrincipalFrom finds none.
func Authenticate(auth app.Authenticator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if ok && token != "" {
				if p, err := auth.Authenticate(r.Context(), token); err == nil {
					r = r.WithContext(context.WithValue(r.Context(), principalKey{}, p))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// PrincipalFrom returns the caller stored by Authenticate.
func PrincipalFrom(ctx context.Context) (app.Principal, bool) {
	p, ok := ctx.Value(principalKey{}).(app.Principal)
	return p, ok
}
