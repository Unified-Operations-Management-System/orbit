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

func serviceWithAudit(t *testing.T) (*app.MemberService, *infra.MemoryMemberRepository, *infra.MemoryAuditLog) {
	t.Helper()
	now := time.Date(2026, 2, 1, 12, 0, 0, 0, time.UTC)
	repo := infra.NewMemoryMemberRepository(infra.DemoMembers(now)...)
	audit := &infra.MemoryAuditLog{}
	n := 0
	svc := app.NewMemberService(app.Deps{
		Members: repo, Permissions: infra.NewMemoryPermissionRepository(), Audit: audit, Tx: app.NoTx{},
		Mailer: &recordingMailer{}, Clock: &fakeClock{now: now},
		NewID: func() domain.MemberID { n++; return domain.MemberID("m-" + string(rune('a'+n))) },
	})
	return svc, repo, audit
}

func TestChangeRoleUseCase(t *testing.T) {
	ctx := context.Background()
	svc, repo, audit := serviceWithAudit(t)
	owner, supervisor := principalFor(t, repo, "m-1"), principalFor(t, repo, "m-2")

	m, err := svc.ChangeRole(ctx, owner, "m-3", "Supervisor")
	if err != nil || m.Role != domain.RoleSupervisor {
		t.Fatalf("owner changes Sam to supervisor: %+v %v", m, err)
	}
	if got := audit.Entries[len(audit.Entries)-1]; got.Action != domain.AuditRoleChanged || got.ActorID != "m-1" {
		t.Fatalf("audit entry: %+v", got)
	}
	if _, err := svc.ChangeRole(ctx, supervisor, "m-3", "Employee"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("supervisor: want ErrForbidden, got %v", err)
	}
	if _, err := svc.ChangeRole(ctx, owner, "m-1", "Employee"); !errors.Is(err, domain.ErrOwnerProtected) {
		t.Fatalf("owner's own role: want ErrOwnerProtected, got %v", err)
	}
	var ve domain.ValidationError
	if _, err := svc.ChangeRole(ctx, owner, "m-3", "Owner"); !errors.As(err, &ve) {
		t.Fatalf("second owner: want ValidationError, got %v", err)
	}
	if _, err := svc.ChangeRole(ctx, owner, "m-3", "Boss"); !errors.As(err, &ve) {
		t.Fatalf("unknown role: want ValidationError, got %v", err)
	}
}

func TestPermissionsUseCase(t *testing.T) {
	ctx := context.Background()
	svc, repo, audit := serviceWithAudit(t)
	owner, supervisor, employee := principalFor(t, repo, "m-1"), principalFor(t, repo, "m-2"), principalFor(t, repo, "m-3")

	m, err := svc.Permissions(ctx, employee)
	if err != nil || len(m) != len(domain.MatrixActions) {
		t.Fatalf("anyone reads the matrix: %v %v", m, err)
	}

	edited := domain.DefaultMatrix()
	edited[domain.ActionManageMembers] = append(edited[domain.ActionManageMembers], domain.RoleSupervisor)
	if _, err := svc.UpdatePermissions(ctx, supervisor, edited); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("only the owner edits: got %v", err)
	}
	if _, err := svc.InviteMember(ctx, supervisor, app.InviteInput{Name: "Before", Email: "before@example.com", Role: "Employee"}); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("supervisor can't invite yet: %v", err)
	}
	if _, err := svc.UpdatePermissions(ctx, owner, edited); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.InviteMember(ctx, supervisor, app.InviteInput{Name: "After", Email: "after@example.com", Role: "Employee"}); err != nil {
		t.Fatalf("the edited matrix is enforced: %v", err)
	}

	locked := domain.DefaultMatrix()
	locked[domain.ActionAssignRoles] = []domain.Role{domain.RoleHRAdmin}
	var ve domain.ValidationError
	if _, err := svc.UpdatePermissions(ctx, owner, locked); !errors.As(err, &ve) {
		t.Fatalf("owner-locked row: want ValidationError, got %v", err)
	}

	var actions []domain.AuditAction
	for _, e := range audit.Entries {
		actions = append(actions, e.Action)
	}
	if len(actions) != 2 || actions[0] != domain.AuditPermissionsUpdated || actions[1] != domain.AuditMemberInvited {
		t.Fatalf("audit trail: %v", actions)
	}
}

func TestAuditHistoryUseCase(t *testing.T) {
	ctx := context.Background()
	svc, repo, _ := serviceWithAudit(t)
	owner, hr, employee := principalFor(t, repo, "m-1"), principalFor(t, repo, "m-4"), principalFor(t, repo, "m-3")

	if _, err := svc.ApproveMember(ctx, owner, "m-5"); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.DeactivateMember(ctx, hr, "m-3"); err != nil {
		t.Fatal(err)
	}
	entries, err := svc.AuditHistory(ctx, hr, 50)
	if err != nil || len(entries) != 2 {
		t.Fatalf("history: %+v %v", entries, err)
	}
	if entries[0].Action != domain.AuditMemberDeactivated || entries[1].Action != domain.AuditMemberApproved {
		t.Fatalf("newest first: %+v", entries)
	}
	if _, err := svc.AuditHistory(ctx, employee, 50); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("employee reads audit: want ErrForbidden, got %v", err)
	}
}
