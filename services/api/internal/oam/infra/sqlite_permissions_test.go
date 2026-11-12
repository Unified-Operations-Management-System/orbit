package infra_test

import (
	"context"
	"database/sql"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

func devDB(t *testing.T) *sql.DB {
	t.Helper()
	ctx := context.Background()
	conn, err := db.Open(ctx, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Setup(ctx, conn, db.Dev, oam.Schema); err != nil {
		t.Fatal(err)
	}
	return conn
}

func TestSQLitePermissions(t *testing.T) {
	ctx := context.Background()
	repo := infra.NewSQLitePermissionRepository(devDB(t))

	m, err := repo.Get(ctx, infra.DemoOrg)
	if err != nil || !slices.Equal(m[domain.ActionManageMembers], domain.DefaultMatrix()[domain.ActionManageMembers]) {
		t.Fatalf("never edited: want the default, got %v %v", m, err)
	}
	edited := domain.DefaultMatrix()
	edited[domain.ActionViewCosts] = []domain.Role{} // nobody
	edited[domain.ActionClockIn] = []domain.Role{domain.RoleEmployee}
	if err := repo.Put(ctx, infra.DemoOrg, edited); err != nil {
		t.Fatal(err)
	}
	got, err := repo.Get(ctx, infra.DemoOrg)
	if err != nil {
		t.Fatal(err)
	}
	if roles, ok := got[domain.ActionViewCosts]; !ok || len(roles) != 0 {
		t.Fatalf("an action nobody may do must survive: %v", got)
	}
	if !slices.Equal(got[domain.ActionClockIn], []domain.Role{domain.RoleEmployee}) {
		t.Fatalf("clock in: %v", got[domain.ActionClockIn])
	}
}

func TestSQLiteAuditLogAndTransactions(t *testing.T) {
	ctx := context.Background()
	conn := devDB(t)
	members := infra.NewSQLiteMemberRepository(conn)
	audit := infra.NewSQLiteAuditLog(conn)
	now := time.Now().UTC().Truncate(time.Second)

	for i, e := range []domain.AuditEntry{
		{ID: "a-1", OrgID: infra.DemoOrg, At: now.Add(-time.Hour), ActorID: "m-1", Action: domain.AuditMemberInvited, Summary: "Invited x"},
		{ID: "a-2", OrgID: infra.DemoOrg, At: now, ActorID: "m-4", Action: domain.AuditMemberApproved, Summary: "Approved x"},
	} {
		if err := audit.Record(ctx, e); err != nil {
			t.Fatalf("record %d: %v", i, err)
		}
	}
	list, err := audit.List(ctx, infra.DemoOrg, 10)
	if err != nil || len(list) != 2 || list[0].ID != "a-2" || list[0].ActorName != "Riley Chen" {
		t.Fatalf("list newest first with actor names: %+v %v", list, err)
	}

	// A member change and its audit entry commit together or not at all.
	sam, _ := members.GetByID(ctx, infra.DemoOrg, "m-3")
	sam.Role = domain.RoleSupervisor
	failing := errors.New("audit failed")
	err = infra.SQLiteTx{DB: conn}.WithinTx(ctx, func(ctx context.Context) error {
		if err := members.Save(ctx, sam); err != nil {
			return err
		}
		return failing
	})
	if !errors.Is(err, failing) {
		t.Fatalf("want the audit error, got %v", err)
	}
	again, _ := members.GetByID(ctx, infra.DemoOrg, "m-3")
	if again.Role != domain.RoleEmployee {
		t.Fatalf("rolled-back change was kept: %s", again.Role)
	}
	var _ app.TxRunner = infra.SQLiteTx{}
}
