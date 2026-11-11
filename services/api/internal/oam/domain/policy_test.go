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
		domain.ActionApproveMember,
		domain.ActionDeactivateMember,
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
		domain.ActionApproveMember: {
			domain.RoleOwner:   true,
			domain.RoleHRAdmin: true,
		},
		domain.ActionDeactivateMember: {
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
