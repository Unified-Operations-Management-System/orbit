// Package app is the OAM application layer: use cases that orchestrate the
// domain and talk to the outside world through small ports.
package app

import (
	"context"
	"errors"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// ErrUnauthenticated means the caller is not signed in or is no longer active.
var ErrUnauthenticated = errors.New("not signed in")

// Principal is the authenticated caller.
type Principal struct {
	MemberID domain.MemberID
	OrgID    domain.OrgID
	Role     domain.Role
	Email    domain.Email
	Name     string
}

// Authenticator verifies a bearer token (without the "Bearer " prefix) and
// returns the caller. An unknown or invalid token yields ErrUnauthenticated.
type Authenticator interface {
	Authenticate(ctx context.Context, token string) (Principal, error)
}
