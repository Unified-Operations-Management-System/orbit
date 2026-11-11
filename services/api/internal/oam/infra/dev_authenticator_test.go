package infra_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

func TestDevAuthenticator(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	auth := infra.NewDevAuthenticator(infra.NewMemoryMemberRepository(infra.DemoMembers(now)...), infra.DemoOrg)

	tests := []struct {
		token  string
		wantID domain.MemberID
	}{
		{"dev:owner", "m-1"},
		{"dev:supervisor", "m-2"},
		{"dev:employee", "m-3"},
		{"dev:hr-admin", "m-4"},
	}
	for _, tc := range tests {
		t.Run(tc.token, func(t *testing.T) {
			p, err := auth.Authenticate(ctx, tc.token)
			if err != nil {
				t.Fatalf("Authenticate: %v", err)
			}
			if p.MemberID != tc.wantID {
				t.Errorf("MemberID = %q, want %q", p.MemberID, tc.wantID)
			}
			if p.OrgID != infra.DemoOrg {
				t.Errorf("OrgID = %q, want %q", p.OrgID, infra.DemoOrg)
			}
			if p.Email == "" || p.Name == "" {
				t.Errorf("principal missing identity fields: %+v", p)
			}
		})
	}

	for _, token := range []string{"", "dev:", "dev:admin", "owner", "dev:Owner", "Bearer dev:owner"} {
		t.Run("bad token "+token, func(t *testing.T) {
			if _, err := auth.Authenticate(ctx, token); !errors.Is(err, app.ErrUnauthenticated) {
				t.Fatalf("got %v, want ErrUnauthenticated", err)
			}
		})
	}
}

func TestDevAuthenticatorNoActiveMember(t *testing.T) {
	ctx := context.Background()
	repo := infra.NewMemoryMemberRepository(domain.Member{
		ID: "m-1", OrgID: infra.DemoOrg, Name: "Pending Person",
		Email: "pending@example.com", Role: domain.RoleSupervisor, Status: domain.StatusPending,
	})
	auth := infra.NewDevAuthenticator(repo, infra.DemoOrg)

	if _, err := auth.Authenticate(ctx, "dev:supervisor"); !errors.Is(err, app.ErrUnauthenticated) {
		t.Fatalf("got %v, want ErrUnauthenticated", err)
	}
}
