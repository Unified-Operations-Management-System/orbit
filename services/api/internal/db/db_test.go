package db_test

import (
	"context"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
)

func area(files map[string]string) db.Source {
	fsys := fstest.MapFS{}
	for name, body := range files {
		fsys[name] = &fstest.MapFile{Data: []byte(body)}
	}
	return db.Source{Area: "demo", Files: fsys}
}

func TestMigrateSeedAndRestart(t *testing.T) {
	ctx := context.Background()
	conn, err := db.Open(ctx, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	src := area(map[string]string{
		"migrations/202611110900_demo_init.sql":   "CREATE TABLE demo_things (id INTEGER PRIMARY KEY, name TEXT NOT NULL);\nCREATE INDEX demo_things_name ON demo_things(name);",
		"migrations/202611111000_demo_colour.sql": "ALTER TABLE demo_things ADD COLUMN colour TEXT;",
		"seed/dev/202611111001_demo_rows.sql":     "INSERT INTO demo_things (name) VALUES ('a'), ('b');",
		"seed/prod/README.md":                     "empty on purpose",
	})

	applied, err := db.Migrate(ctx, conn, src)
	if err != nil || len(applied) != 2 {
		t.Fatalf("first migrate: %v %v", applied, err)
	}
	if applied, err := db.Migrate(ctx, conn, src); err != nil || len(applied) != 0 {
		t.Fatalf("second migrate should be a no-op: %v %v", applied, err)
	}
	if loaded, err := db.Seed(ctx, conn, db.Dev, src); err != nil || len(loaded) != 1 {
		t.Fatalf("seed: %v %v", loaded, err)
	}
	if loaded, err := db.Seed(ctx, conn, db.Dev, src); err != nil || len(loaded) != 0 {
		t.Fatalf("seed runs only once: %v %v", loaded, err)
	}
	var n int
	if err := conn.QueryRowContext(ctx, "SELECT count(*) FROM demo_things").Scan(&n); err != nil || n != 2 {
		t.Fatalf("rows: %d %v", n, err)
	}
	if pending, err := db.Pending(ctx, conn, src); err != nil || len(pending) != 0 {
		t.Fatalf("pending: %v %v", pending, err)
	}
}

func TestBadFileNamesAreRejected(t *testing.T) {
	ctx := context.Background()
	conn, _ := db.Open(ctx, ":memory:")
	for _, name := range []string{"migrations/init.sql", "migrations/202611110900_hr_init.sql", "migrations/2026111109_demo_init.sql"} {
		_, err := db.Migrate(ctx, conn, area(map[string]string{name: "SELECT 1;"}))
		if err == nil || !strings.Contains(err.Error(), "name it") {
			t.Errorf("%s: want a naming error, got %v", name, err)
		}
	}
}

func TestFailedMigrationRollsBack(t *testing.T) {
	ctx := context.Background()
	conn, _ := db.Open(ctx, ":memory:")
	src := area(map[string]string{"migrations/202611110900_demo_bad.sql": "CREATE TABLE demo_ok (id INTEGER);\nNOT VALID SQL;"})
	if _, err := db.Migrate(ctx, conn, src); err == nil {
		t.Fatal("want an error")
	}
	var n int
	_ = conn.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE name = 'demo_ok'").Scan(&n)
	if n != 0 {
		t.Fatal("half-applied migration was kept")
	}
}

func TestRunInTxRollsBack(t *testing.T) {
	ctx := context.Background()
	conn, _ := db.Open(ctx, ":memory:")
	_, _ = conn.ExecContext(ctx, "CREATE TABLE t (v INTEGER)")
	_ = db.RunInTx(ctx, conn, func(ctx context.Context) error {
		_, _ = db.Q(ctx, conn).ExecContext(ctx, "INSERT INTO t VALUES (1)")
		return context.Canceled
	})
	var n int
	_ = conn.QueryRowContext(ctx, "SELECT count(*) FROM t").Scan(&n)
	if n != 0 {
		t.Fatalf("rolled back insert is still there: %d", n)
	}
}

func TestParseEnv(t *testing.T) {
	for in, want := range map[string]db.Env{"": db.Dev, "dev": db.Dev, "prod": db.Prod} {
		if got, err := db.ParseEnv(in); err != nil || got != want {
			t.Errorf("ParseEnv(%q) = %v, %v", in, got, err)
		}
	}
	if _, err := db.ParseEnv("production"); err == nil {
		t.Error("want an error for an unknown env")
	}
}
