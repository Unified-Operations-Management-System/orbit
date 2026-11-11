package infra_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

func TestMemoryMemberRepositoryReturnsCopies(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	repo := infra.NewMemoryMemberRepository(infra.DemoMembers(now)...)

	got, err := repo.GetByID(ctx, infra.DemoOrg, "m-1")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	got.Name = "Mutated"
	got.Status = domain.StatusDeactivated

	again, err := repo.GetByID(ctx, infra.DemoOrg, "m-1")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	if again.Name != "Alex Morgan" || again.Status != domain.StatusActive {
		t.Fatalf("stored member changed: %+v", again)
	}

	list, err := repo.ListByOrg(ctx, infra.DemoOrg)
	if err != nil {
		t.Fatalf("ListByOrg: %v", err)
	}
	list[0].Name = "Mutated Again"
	list[0].Role = domain.RoleEmployee

	listAgain, err := repo.ListByOrg(ctx, infra.DemoOrg)
	if err != nil {
		t.Fatalf("ListByOrg: %v", err)
	}
	if listAgain[0].Name != "Alex Morgan" || listAgain[0].Role != domain.RoleOwner {
		t.Fatalf("stored member changed via list: %+v", listAgain[0])
	}
}

func TestMemoryMemberRepositoryOrdering(t *testing.T) {
	ctx := context.Background()
	base := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	repo := infra.NewMemoryMemberRepository(
		domain.Member{ID: "b", OrgID: "org-1", Name: "Beth", InvitedAt: base.Add(time.Hour)},
		domain.Member{ID: "c", OrgID: "org-1", Name: "Cara", InvitedAt: base},
		domain.Member{ID: "a", OrgID: "org-1", Name: "Adam", InvitedAt: base},
		domain.Member{ID: "other", OrgID: "org-2", Name: "Other", InvitedAt: base},
	)

	members, err := repo.ListByOrg(ctx, "org-1")
	if err != nil {
		t.Fatalf("ListByOrg: %v", err)
	}
	want := []domain.MemberID{"a", "c", "b"}
	if len(members) != len(want) {
		t.Fatalf("len = %d, want %d", len(members), len(want))
	}
	for i, id := range want {
		if members[i].ID != id {
			t.Errorf("members[%d].ID = %q, want %q", i, members[i].ID, id)
		}
	}
}

func TestMemoryMemberRepositoryLookupAndSave(t *testing.T) {
	ctx := context.Background()
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	repo := infra.NewMemoryMemberRepository(infra.DemoMembers(now)...)

	if _, err := repo.GetByID(ctx, "org-other", "m-1"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("GetByID wrong org: got %v, want ErrNotFound", err)
	}
	if _, err := repo.GetByEmail(ctx, infra.DemoOrg, "nobody@example.com"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("GetByEmail missing: got %v, want ErrNotFound", err)
	}
	if m, err := repo.GetByEmail(ctx, infra.DemoOrg, "sam@example.com"); err != nil || m.ID != "m-3" {
		t.Fatalf("GetByEmail = %v, %v; want m-3", m.ID, err)
	}

	m, err := repo.GetByID(ctx, infra.DemoOrg, "m-6")
	if err != nil {
		t.Fatalf("GetByID: %v", err)
	}
	m.Status = domain.StatusActive
	if err := repo.Save(ctx, m); err != nil {
		t.Fatalf("Save: %v", err)
	}
	updated, err := repo.GetByID(ctx, infra.DemoOrg, "m-6")
	if err != nil || updated.Status != domain.StatusActive {
		t.Fatalf("after Save = %v, %v; want Active", updated.Status, err)
	}
}
