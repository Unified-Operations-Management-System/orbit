package infra

import (
	"context"
	"strings"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// DevAuthenticator accepts "dev:<role>" tokens. It exists for local development
// and the demo only; the production adapter (API-issued tokens or Firebase)
// plugs in behind app.Authenticator.
type DevAuthenticator struct {
	repo domain.MemberRepository
	org  domain.OrgID
}

var _ app.Authenticator = (*DevAuthenticator)(nil)

// NewDevAuthenticator returns a DevAuthenticator for one organization.
func NewDevAuthenticator(repo domain.MemberRepository, org domain.OrgID) *DevAuthenticator {
	return &DevAuthenticator{repo: repo, org: org}
}

// devRoles maps the token suffix to a role.
var devRoles = map[string]domain.Role{
	"owner":      domain.RoleOwner,
	"supervisor": domain.RoleSupervisor,
	"employee":   domain.RoleEmployee,
	"hr-admin":   domain.RoleHRAdmin,
}

// Authenticate returns the principal of the first Active member with the role
// named by the token. Anything else yields app.ErrUnauthenticated.
func (a *DevAuthenticator) Authenticate(ctx context.Context, token string) (app.Principal, error) {
	suffix, ok := strings.CutPrefix(token, "dev:")
	if !ok {
		return app.Principal{}, app.ErrUnauthenticated
	}
	role, ok := devRoles[suffix]
	if !ok {
		return app.Principal{}, app.ErrUnauthenticated
	}
	members, err := a.repo.ListByOrg(ctx, a.org)
	if err != nil {
		return app.Principal{}, err
	}
	for _, m := range members {
		if m.Role == role && m.Status == domain.StatusActive {
			return app.Principal{
				MemberID: m.ID,
				OrgID:    m.OrgID,
				Role:     m.Role,
				Email:    m.Email,
				Name:     m.Name,
				TeamID:   m.TeamID,
			}, nil
		}
	}
	return app.Principal{}, app.ErrUnauthenticated
}
