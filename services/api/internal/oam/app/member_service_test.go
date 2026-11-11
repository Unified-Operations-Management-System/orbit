package app_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

type fakeClock struct {
	now time.Time
}

func (c *fakeClock) Now() time.Time { return c.now }

type recordingMailer struct {
	sent []domain.Member
}

func (m *recordingMailer) SendInvite(_ context.Context, member domain.Member) error {
	m.sent = append(m.sent, member)
	return nil
}

type failingMailer struct {
	err error
}

func (m failingMailer) SendInvite(context.Context, domain.Member) error { return m.err }

func fixture(t *testing.T) (*app.MemberService, *infra.MemoryMemberRepository, *recordingMailer, *fakeClock) {
	t.Helper()
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	repo := infra.NewMemoryMemberRepository(infra.DemoMembers(now)...)
	clock := &fakeClock{now: now}
	mailer := &recordingMailer{}
	svc := app.NewMemberService(repo, mailer, clock, func() domain.MemberID { return "m-new" })
	return svc, repo, mailer, clock
}

func principalFor(t *testing.T, repo domain.MemberRepository, id domain.MemberID) app.Principal {
	t.Helper()
	m, err := repo.GetByID(context.Background(), infra.DemoOrg, id)
	if err != nil {
		t.Fatalf("loading %s: %v", id, err)
	}
	return app.Principal{MemberID: m.ID, OrgID: m.OrgID, Role: m.Role, Email: m.Email, Name: m.Name, TeamID: m.TeamID}
}

func countMembers(t *testing.T, repo domain.MemberRepository) int {
	t.Helper()
	members, err := repo.ListByOrg(context.Background(), infra.DemoOrg)
	if err != nil {
		t.Fatalf("ListByOrg: %v", err)
	}
	return len(members)
}

func TestInviteMember(t *testing.T) {
	ctx := context.Background()

	t.Run("ok", func(t *testing.T) {
		svc, repo, mailer, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		m, err := svc.InviteMember(ctx, owner, app.InviteInput{
			Name:  "  New Hire  ",
			Email: " New.Hire@Example.COM ",
			Role:  "Employee",
		})
		if err != nil {
			t.Fatalf("InviteMember: %v", err)
		}
		if m.ID != "m-new" || m.OrgID != infra.DemoOrg {
			t.Errorf("ID/OrgID = %q/%q, want m-new/%q", m.ID, m.OrgID, infra.DemoOrg)
		}
		if m.Name != "New Hire" {
			t.Errorf("Name = %q, want %q", m.Name, "New Hire")
		}
		if m.Email != "new.hire@example.com" {
			t.Errorf("Email = %q, want normalised", m.Email)
		}
		if m.Role != domain.RoleEmployee || m.Status != domain.StatusPending {
			t.Errorf("Role/Status = %q/%q, want Employee/Pending", m.Role, m.Status)
		}
		if len(mailer.sent) != 1 || mailer.sent[0].ID != "m-new" {
			t.Fatalf("mailer sent = %v, want the invited member", mailer.sent)
		}
		stored, err := repo.GetByID(ctx, infra.DemoOrg, "m-new")
		if err != nil {
			t.Fatalf("stored member: %v", err)
		}
		if stored.Status != domain.StatusPending {
			t.Errorf("stored Status = %q, want Pending", stored.Status)
		}
		if got := countMembers(t, repo); got != 7 {
			t.Errorf("member count = %d, want 7", got)
		}
	})

	for _, id := range []domain.MemberID{"m-2", "m-3"} {
		t.Run("forbidden for "+string(id), func(t *testing.T) {
			svc, repo, mailer, _ := fixture(t)
			caller := principalFor(t, repo, id)

			_, err := svc.InviteMember(ctx, caller, app.InviteInput{
				Name: "New Hire", Email: "new.hire@example.com", Role: "Employee",
			})
			if !errors.Is(err, domain.ErrForbidden) {
				t.Fatalf("got %v, want ErrForbidden", err)
			}
			if len(mailer.sent) != 0 {
				t.Errorf("mailer sent %d invitations, want 0", len(mailer.sent))
			}
			if got := countMembers(t, repo); got != 6 {
				t.Errorf("member count = %d, want 6 (nothing saved)", got)
			}
		})
	}

	t.Run("duplicate email", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		_, err := svc.InviteMember(ctx, owner, app.InviteInput{
			Name: "Jordan Again", Email: "Jordan@Example.com", Role: "Employee",
		})
		if !errors.Is(err, domain.ErrDuplicateEmail) {
			t.Fatalf("got %v, want ErrDuplicateEmail", err)
		}
	})

	t.Run("invalid email", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		_, err := svc.InviteMember(ctx, owner, app.InviteInput{
			Name: "New Hire", Email: "not-an-email", Role: "Employee",
		})
		var ve domain.ValidationError
		if !errors.As(err, &ve) || ve.Field != "email" {
			t.Fatalf("got %v, want ValidationError{Field: email}", err)
		}
	})

	t.Run("mail failure keeps member saved", func(t *testing.T) {
		now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
		repo := infra.NewMemoryMemberRepository(infra.DemoMembers(now)...)
		sendErr := errors.New("smtp down")
		svc := app.NewMemberService(repo, failingMailer{err: sendErr}, &fakeClock{now: now},
			func() domain.MemberID { return "m-new" })
		owner := principalFor(t, repo, "m-1")

		_, err := svc.InviteMember(ctx, owner, app.InviteInput{
			Name: "New Hire", Email: "new.hire@example.com", Role: "Employee",
		})
		if !errors.Is(err, sendErr) {
			t.Fatalf("got %v, want wrapped mail error", err)
		}
		if _, err := repo.GetByID(ctx, infra.DemoOrg, "m-new"); err != nil {
			t.Fatalf("member was not saved: %v", err)
		}
	})
}

func TestApproveMember(t *testing.T) {
	ctx := context.Background()

	t.Run("ok", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		m, err := svc.ApproveMember(ctx, owner, "m-5")
		if err != nil {
			t.Fatalf("ApproveMember: %v", err)
		}
		if m.Status != domain.StatusActive {
			t.Fatalf("Status = %q, want Active", m.Status)
		}
		stored, err := repo.GetByID(ctx, infra.DemoOrg, "m-5")
		if err != nil || stored.Status != domain.StatusActive {
			t.Fatalf("stored = %v, %v; want Active", stored.Status, err)
		}
	})

	t.Run("expired", func(t *testing.T) {
		svc, repo, _, clock := fixture(t)
		owner := principalFor(t, repo, "m-1")
		clock.now = clock.now.Add(8 * 24 * time.Hour)

		if _, err := svc.ApproveMember(ctx, owner, "m-5"); !errors.Is(err, domain.ErrInviteExpired) {
			t.Fatalf("got %v, want ErrInviteExpired", err)
		}
		stored, _ := repo.GetByID(ctx, infra.DemoOrg, "m-5")
		if stored.Status != domain.StatusPending {
			t.Fatalf("stored Status = %q, want Pending", stored.Status)
		}
	})

	t.Run("forbidden", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		supervisor := principalFor(t, repo, "m-2")

		if _, err := svc.ApproveMember(ctx, supervisor, "m-5"); !errors.Is(err, domain.ErrForbidden) {
			t.Fatalf("got %v, want ErrForbidden", err)
		}
	})
}

func TestDeactivateMember(t *testing.T) {
	ctx := context.Background()

	t.Run("ok", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		hr := principalFor(t, repo, "m-4")

		m, err := svc.DeactivateMember(ctx, hr, "m-3")
		if err != nil {
			t.Fatalf("DeactivateMember: %v", err)
		}
		if m.Status != domain.StatusDeactivated {
			t.Fatalf("Status = %q, want Deactivated", m.Status)
		}
	})

	t.Run("owner protected", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		if _, err := svc.DeactivateMember(ctx, owner, "m-1"); !errors.Is(err, domain.ErrOwnerProtected) {
			t.Fatalf("got %v, want ErrOwnerProtected", err)
		}
	})

	t.Run("forbidden", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		supervisor := principalFor(t, repo, "m-2")

		if _, err := svc.DeactivateMember(ctx, supervisor, "m-3"); !errors.Is(err, domain.ErrForbidden) {
			t.Fatalf("got %v, want ErrForbidden", err)
		}
	})
}

func TestSession(t *testing.T) {
	ctx := context.Background()

	t.Run("active", func(t *testing.T) {
		svc, repo, _, _ := fixture(t)
		owner := principalFor(t, repo, "m-1")

		m, err := svc.Session(ctx, owner)
		if err != nil {
			t.Fatalf("Session: %v", err)
		}
		if m.ID != "m-1" {
			t.Fatalf("ID = %q, want m-1", m.ID)
		}
	})

	for _, id := range []domain.MemberID{"m-5", "m-6"} {
		t.Run("not active "+string(id), func(t *testing.T) {
			svc, repo, _, _ := fixture(t)
			p := principalFor(t, repo, id)

			if _, err := svc.Session(ctx, p); !errors.Is(err, app.ErrUnauthenticated) {
				t.Fatalf("got %v, want ErrUnauthenticated", err)
			}
		})
	}
}

func TestListMembers(t *testing.T) {
	ctx := context.Background()
	svc, repo, _, _ := fixture(t)
	owner := principalFor(t, repo, "m-1") // company scope; see TestListMembersScope

	members, err := svc.ListMembers(ctx, owner)
	if err != nil {
		t.Fatalf("ListMembers: %v", err)
	}
	if len(members) != 6 {
		t.Fatalf("len = %d, want 6", len(members))
	}
	for i, want := range []domain.MemberID{"m-1", "m-2", "m-3", "m-4", "m-5", "m-6"} {
		if members[i].ID != want {
			t.Errorf("members[%d].ID = %q, want %q", i, members[i].ID, want)
		}
	}
}

// BR-OAM-R09: owner and HR admin see the company, a supervisor their own team,
// an employee only themselves.
func TestListMembersScope(t *testing.T) {
	svc, repo, _, _ := fixture(t)
	noTeamSupervisor := principalFor(t, repo, "m-2")
	noTeamSupervisor.TeamID = ""

	cases := []struct {
		name   string
		caller app.Principal
		want   []domain.MemberID
	}{
		{"owner", principalFor(t, repo, "m-1"), []domain.MemberID{"m-1", "m-2", "m-3", "m-4", "m-5", "m-6"}},
		{"hr admin", principalFor(t, repo, "m-4"), []domain.MemberID{"m-1", "m-2", "m-3", "m-4", "m-5", "m-6"}},
		{"supervisor", principalFor(t, repo, "m-2"), []domain.MemberID{"m-2", "m-3", "m-5"}},
		{"supervisor without team", noTeamSupervisor, []domain.MemberID{"m-2"}},
		{"employee", principalFor(t, repo, "m-3"), []domain.MemberID{"m-3"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := svc.ListMembers(context.Background(), tc.caller)
			if err != nil {
				t.Fatalf("ListMembers: %v", err)
			}
			ids := make([]domain.MemberID, len(got))
			for i, m := range got {
				ids[i] = m.ID
			}
			if len(ids) != len(tc.want) {
				t.Fatalf("got %v, want %v", ids, tc.want)
			}
			for i := range ids {
				if ids[i] != tc.want[i] {
					t.Fatalf("got %v, want %v", ids, tc.want)
				}
			}
		})
	}
}
