// Package db owns Orbit's SQLite database: opening it, applying every area's
// migrations and seeding it. Areas never open the file themselves; they get a
// *sql.DB from here and run their own SQL in their own infra package.
//
// How an area plugs in: see "Database" in services/api/README.md.
package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite" // pure Go: the API builds with CGO_ENABLED=0
)

// Env selects which seed data a fresh database gets.
type Env string

const (
	Dev  Env = "dev"  // develop: demo data, safe to reset
	Prod Env = "prod" // main: the data set shown to the professor
)

// ParseEnv accepts "dev" (also the empty string) or "prod".
func ParseEnv(s string) (Env, error) {
	switch s {
	case "", "dev":
		return Dev, nil
	case "prod":
		return Prod, nil
	}
	return "", fmt.Errorf("ORBIT_ENV must be dev or prod, got %q", s)
}

// DefaultPath is where the database lives when DB_PATH isn't set, relative to
// services/api (the API's working directory in development).
func DefaultPath(env Env) string {
	if env == Prod {
		return filepath.Join("data", "orbit.db")
	}
	return filepath.Join("data", "orbit-dev.db")
}

// Open opens (creating if needed) the SQLite file at path. Use ":memory:" in tests.
func Open(ctx context.Context, path string) (*sql.DB, error) {
	if path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return nil, fmt.Errorf("create database folder: %w", err)
		}
	}
	// WAL lets reads run during a write; foreign keys are off by default in SQLite;
	// busy_timeout waits instead of failing when another write holds the lock.
	dsn := "file:" + path + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=synchronous(NORMAL)"
	conn, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	// SQLite allows one writer at a time; one connection keeps writes ordered and makes
	// ":memory:" behave like a single database.
	conn.SetMaxOpenConns(1)
	if err := conn.PingContext(ctx); err != nil {
		conn.Close()
		return nil, fmt.Errorf("open database %s: %w", path, err)
	}
	return conn, nil
}
