package domain_test

import (
	"errors"
	"testing"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

func TestCan(t *testing.T) {
	roles := []domain.Role{
		domain.RoleOwner,
		domain.RoleSupervisor,
		domain.RoleEmployee,
		domain.RoleHRAdmin,
	}
	actions := []domain.Action{
		domain.ActionListMembers,
		domain.ActionInviteMember,
		domain.ActionAssignRoles,
		domain.ActionViewAudit,
	}

	allowed := map[domain.Action]map[domain.Role]bool{
		domain.ActionListMembers: {
			domain.RoleOwner:      true,
			domain.RoleSupervisor: true,
			domain.RoleEmployee:   true,
			domain.RoleHRAdmin:    true,
		},
		domain.ActionInviteMember: {
			domain.RoleOwner:   true,
			domain.RoleHRAdmin: true,
		},
		domain.ActionAssignRoles: {
			domain.RoleOwner: true,
		},
		domain.ActionViewAudit: {
			domain.RoleOwner:   true,
			domain.RoleHRAdmin: true,
		},
	}

	for _, role := range roles {
		for _, action := range actions {
			err := domain.Can(role, action)
			if want := allowed[action][role]; want {
				if err != nil {
					t.Errorf("Can(%q, %q) = %v, want nil", role, action, err)
				}
				continue
			}
			if !errors.Is(err, domain.ErrForbidden) {
				t.Errorf("Can(%q, %q) = %v, want ErrForbidden", role, action, err)
			}
		}
	}

	if err := domain.Can(domain.RoleOwner, domain.Action("members.unknown")); !errors.Is(err, domain.ErrForbidden) {
		t.Errorf("unknown action: got %v, want ErrForbidden", err)
	}
}

func TestCanSee(t *testing.T) {
	const team domain.TeamID = "team-a"
	self := domain.Member{ID: "me", TeamID: team}
	teammate := domain.Member{ID: "mate", TeamID: team}
	other := domain.Member{ID: "other", TeamID: "team-b"}
	noTeam := domain.Member{ID: "loner"}

	cases := []struct {
		role       domain.Role
		viewerTeam domain.TeamID
		m          domain.Member
		want       bool
	}{
		{domain.RoleOwner, "", other, true},
		{domain.RoleHRAdmin, "", noTeam, true},
		{domain.RoleSupervisor, team, self, true},
		{domain.RoleSupervisor, team, teammate, true},
		{domain.RoleSupervisor, team, other, false},
		{domain.RoleSupervisor, team, noTeam, false},
		{domain.RoleSupervisor, "", noTeam, false},
		{domain.RoleSupervisor, "", self, true},
		{domain.RoleEmployee, team, self, true},
		{domain.RoleEmployee, team, teammate, false},
	}
	for _, tc := range cases {
		if got := domain.CanSee(tc.role, "me", tc.viewerTeam, tc.m); got != tc.want {
			t.Errorf("CanSee(%s, team %q, %s) = %v, want %v", tc.role, tc.viewerTeam, tc.m.ID, got, tc.want)
		}
	}
}

func TestScopeOf(t *testing.T) {
	want := map[domain.Role]domain.Scope{
		domain.RoleOwner:      domain.ScopeCompany,
		domain.RoleHRAdmin:    domain.ScopeCompany,
		domain.RoleSupervisor: domain.ScopeTeam,
		domain.RoleEmployee:   domain.ScopeSelf,
	}
	for role, scope := range want {
		if got := domain.ScopeOf(role); got != scope {
			t.Errorf("ScopeOf(%s) = %s, want %s", role, got, scope)
		}
	}
}

func TestEditedMatrix(t *testing.T) {
	m := domain.DefaultMatrix()
	m[domain.ActionAssignRoles] = append(m[domain.ActionAssignRoles], domain.RoleSupervisor)
	if err := m.Validate(); err != nil {
		t.Fatalf("valid edit rejected: %v", err)
	}
	if err := m.Can(domain.RoleSupervisor, domain.ActionAssignRoles); err != nil {
		t.Fatalf("edited matrix not used: %v", err)
	}

	locked := domain.DefaultMatrix()
	locked[domain.ActionEditCompany] = []domain.Role{domain.RoleHRAdmin}
	var ve domain.ValidationError
	if err := locked.Validate(); !errors.As(err, &ve) {
		t.Fatalf("removing the owner from a locked action: want ValidationError, got %v", err)
	}

	unknown := domain.DefaultMatrix()
	unknown["coffee.brew"] = []domain.Role{domain.RoleEmployee}
	if err := unknown.Validate(); !errors.As(err, &ve) {
		t.Fatalf("unknown action: want ValidationError, got %v", err)
	}

	missing := domain.DefaultMatrix()
	delete(missing, domain.ActionViewCosts)
	if err := missing.Validate(); !errors.As(err, &ve) {
		t.Fatalf("missing action: want ValidationError, got %v", err)
	}
}
