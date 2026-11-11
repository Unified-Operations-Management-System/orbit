package infra_test

import (
	"encoding/hex"
	"strings"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

func TestDemoMembers(t *testing.T) {
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	members := infra.DemoMembers(now)
	if len(members) != 6 {
		t.Fatalf("len = %d, want 6", len(members))
	}

	wantRoles := []domain.Role{
		domain.RoleOwner,
		domain.RoleSupervisor,
		domain.RoleEmployee,
		domain.RoleHRAdmin,
		domain.RoleEmployee,
		domain.RoleEmployee,
	}
	wantStatuses := []domain.Status{
		domain.StatusActive,
		domain.StatusActive,
		domain.StatusActive,
		domain.StatusActive,
		domain.StatusPending,
		domain.StatusDeactivated,
	}

	for i, m := range members {
		if m.OrgID != infra.DemoOrg {
			t.Errorf("members[%d].OrgID = %q, want %q", i, m.OrgID, infra.DemoOrg)
		}
		if m.Role != wantRoles[i] {
			t.Errorf("members[%d].Role = %q, want %q", i, m.Role, wantRoles[i])
		}
		if m.Status != wantStatuses[i] {
			t.Errorf("members[%d].Status = %q, want %q", i, m.Status, wantStatuses[i])
		}
		if !m.ExpiresAt.Equal(m.InvitedAt.Add(domain.InviteTTL)) {
			t.Errorf("members[%d].ExpiresAt = %v, want InvitedAt+TTL", i, m.ExpiresAt)
		}
		if i > 0 && !members[i-1].InvitedAt.Before(m.InvitedAt) {
			t.Errorf("members[%d] is not invited after members[%d]", i, i-1)
		}
	}

	if !members[4].ExpiresAt.After(now) {
		t.Errorf("pending invite already expired: %v", members[4].ExpiresAt)
	}
}

func TestNewIDGenerator(t *testing.T) {
	newID := infra.NewIDGenerator()
	seen := make(map[domain.MemberID]bool, 100)
	for i := 0; i < 100; i++ {
		id := newID()
		s := string(id)
		if !strings.HasPrefix(s, "m-") {
			t.Fatalf("ID %q does not start with m-", s)
		}
		suffix := strings.TrimPrefix(s, "m-")
		if len(suffix) != 12 {
			t.Fatalf("ID %q has %d random characters, want 12", s, len(suffix))
		}
		if _, err := hex.DecodeString(suffix); err != nil {
			t.Fatalf("ID %q is not hex: %v", s, err)
		}
		if seen[id] {
			t.Fatalf("duplicate ID %q", id)
		}
		seen[id] = true
	}
}
