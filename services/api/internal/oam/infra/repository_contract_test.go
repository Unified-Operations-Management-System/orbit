package infra_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

// Both repositories must behave the same; this suite runs against each, starting
// from the demo company (Go seed for memory, the SQL dev seed for SQLite).
func TestMemberRepositories(t *testing.T) {
	repos := map[string]func(t *testing.T) domain.MemberRepository{
		"memory": func(t *testing.T) domain.MemberRepository {
			return infra.NewMemoryMemberRepository(infra.DemoMembers(time.Now().UTC())...)
		},
		"sqlite": func(t *testing.T) domain.MemberRepository {
			ctx := context.Background()
			conn, err := db.Open(ctx, ":memory:")
			if err != nil {
				t.Fatal(err)
			}
			t.Cleanup(func() { conn.Close() })
			if err := db.Setup(ctx, conn, db.Dev, oam.Schema); err != nil {
				t.Fatal(err)
			}
			return infra.NewSQLiteMemberRepository(conn)
		},
	}
	for name, newRepo := range repos {
		t.Run(name, func(t *testing.T) { repositoryContract(t, newRepo) })
	}
}

func repositoryContract(t *testing.T, newRepo func(t *testing.T) domain.MemberRepository) {
	ctx := context.Background()

	t.Run("lists the demo company oldest first", func(t *testing.T) {
		repo := newRepo(t)
		ms, err := repo.ListByOrg(ctx, infra.DemoOrg)
		if err != nil {
			t.Fatal(err)
		}
		want := []domain.MemberID{"m-1", "m-2", "m-3", "m-4", "m-5", "m-6"}
		if len(ms) != len(want) {
			t.Fatalf("got %d members", len(ms))
		}
		for i, m := range ms {
			if m.ID != want[i] {
				t.Fatalf("position %d: got %s, want %s", i, m.ID, want[i])
			}
		}
		if ms[1].TeamID != infra.DemoTeamLine1 || ms[0].TeamID != "" {
			t.Fatalf("teams not loaded: %q %q", ms[0].TeamID, ms[1].TeamID)
		}
		if ms[4].Status != domain.StatusPending || !ms[4].ExpiresAt.After(time.Now()) {
			t.Fatalf("Casey should be a pending, unexpired invite: %+v", ms[4])
		}
	})

	t.Run("gets by id and email, scoped to the org", func(t *testing.T) {
		repo := newRepo(t)
		m, err := repo.GetByID(ctx, infra.DemoOrg, "m-2")
		if err != nil || m.Name != "Jordan Lee" {
			t.Fatalf("by id: %+v %v", m, err)
		}
		if _, err := repo.GetByID(ctx, "other-org", "m-2"); !errors.Is(err, domain.ErrNotFound) {
			t.Fatalf("other org: want ErrNotFound, got %v", err)
		}
		m, err = repo.GetByEmail(ctx, infra.DemoOrg, "riley@example.com")
		if err != nil || m.ID != "m-4" {
			t.Fatalf("by email: %+v %v", m, err)
		}
		if _, err := repo.GetByEmail(ctx, infra.DemoOrg, "nobody@example.com"); !errors.Is(err, domain.ErrNotFound) {
			t.Fatalf("unknown email: want ErrNotFound, got %v", err)
		}
	})

	t.Run("saves new members and updates existing ones", func(t *testing.T) {
		repo := newRepo(t)
		now := time.Now().UTC().Truncate(time.Second)
		dana, err := domain.NewInvitedMember("m-new", infra.DemoOrg, "Dana Fox", "dana@example.com", domain.RoleEmployee, now)
		if err != nil {
			t.Fatal(err)
		}
		if err := repo.Save(ctx, dana); err != nil {
			t.Fatal(err)
		}
		if err := dana.Approve(now); err != nil {
			t.Fatal(err)
		}
		if err := repo.Save(ctx, dana); err != nil {
			t.Fatal(err)
		}
		got, err := repo.GetByID(ctx, infra.DemoOrg, "m-new")
		if err != nil || got.Status != domain.StatusActive || !got.InvitedAt.Equal(now) {
			t.Fatalf("saved member: %+v %v", got, err)
		}
		ms, _ := repo.ListByOrg(ctx, infra.DemoOrg)
		if len(ms) != 7 {
			t.Fatalf("want 7 members after insert, got %d", len(ms))
		}
	})
}

func TestSQLiteEnforcesBusinessRules(t *testing.T) {
	ctx := context.Background()
	conn, _ := db.Open(ctx, ":memory:")
	defer conn.Close()
	if err := db.Setup(ctx, conn, db.Dev, oam.Schema); err != nil {
		t.Fatal(err)
	}
	repo := infra.NewSQLiteMemberRepository(conn)
	now := time.Now().UTC()

	twin, _ := domain.NewInvitedMember("m-twin", infra.DemoOrg, "Sam Again", "sam@example.com", domain.RoleEmployee, now)
	if err := repo.Save(ctx, twin); !errors.Is(err, domain.ErrDuplicateEmail) {
		t.Fatalf("BR-OAM-R05 one membership per email: got %v", err)
	}

	second := domain.Member{ID: "m-owner2", OrgID: infra.DemoOrg, Name: "Second Owner", Email: "owner2@example.com",
		Role: domain.RoleOwner, Status: domain.StatusActive, InvitedAt: now, ExpiresAt: now}
	if err := repo.Save(ctx, second); err == nil {
		t.Fatal("BR-OAM-R01 one owner: a second owner was saved")
	}
}
