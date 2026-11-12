package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io/fs"
	"regexp"
	"slices"
	"strings"
	"time"
)

// Source is one functional area's schema: its embedded migrations/ and seed/
// folders. Each area exposes one (e.g. oam.Schema) and internal/app lists them.
//
//	migrations/202611111200_oam_init.sql      applied once, in timestamp order, across all areas
//	seed/dev/202611111201_oam_demo.sql        loaded into a new dev database
//	seed/prod/…                               loaded into a new prod database
type Source struct {
	Area  string // short lowercase name, also the file-name prefix: "oam", "hr", "analytics"
	Files fs.FS  // contains migrations/ and optionally seed/dev/, seed/prod/
}

// fileName is "<12-digit UTC timestamp>_<area>_<what>.sql", e.g. 202611111200_oam_init.sql.
// The timestamp orders files across areas; `pnpm db:new` writes it for you.
var fileName = regexp.MustCompile(`^(\d{12})_([a-z0-9]+)_[a-z0-9_]+\.sql$`)

type script struct {
	name, area, sql string
}

// collect reads dir from every source, checks the names and returns the scripts in
// timestamp order.
func collect(sources []Source, dir string) ([]script, error) {
	var out []script
	for _, s := range sources {
		entries, err := fs.ReadDir(s.Files, dir)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				continue // the area has nothing here (yet)
			}
			return nil, fmt.Errorf("%s: read %s: %w", s.Area, dir, err)
		}
		for _, e := range entries {
			if e.IsDir() || e.Name() == ".gitkeep" || strings.HasSuffix(e.Name(), ".md") {
				continue
			}
			m := fileName.FindStringSubmatch(e.Name())
			if m == nil || m[2] != s.Area {
				return nil, fmt.Errorf("%s/%s: name it <yyyymmddhhmm>_%s_<what>.sql (use pnpm db:new)", dir, e.Name(), s.Area)
			}
			body, err := fs.ReadFile(s.Files, dir+"/"+e.Name())
			if err != nil {
				return nil, err
			}
			out = append(out, script{name: e.Name(), area: s.Area, sql: string(body)})
		}
	}
	slices.SortFunc(out, func(a, b script) int { return strings.Compare(a.name, b.name) })
	for i := 1; i < len(out); i++ {
		if out[i].name == out[i-1].name {
			return nil, fmt.Errorf("two files named %s", out[i].name)
		}
	}
	return out, nil
}

// Migrate applies every migration not applied yet, each in its own transaction, and
// records it in schema_migrations. Safe to run on every start.
func Migrate(ctx context.Context, conn *sql.DB, sources ...Source) (applied []string, err error) {
	if _, err := conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		name TEXT PRIMARY KEY, area TEXT NOT NULL, applied_at TEXT NOT NULL)`); err != nil {
		return nil, fmt.Errorf("create schema_migrations: %w", err)
	}
	scripts, err := collect(sources, "migrations")
	if err != nil {
		return nil, err
	}
	done, err := appliedNames(ctx, conn)
	if err != nil {
		return nil, err
	}
	for _, s := range scripts {
		if done[s.name] {
			continue
		}
		err := RunInTx(ctx, conn, func(ctx context.Context) error {
			if _, err := Q(ctx, conn).ExecContext(ctx, s.sql); err != nil {
				return err
			}
			_, err := Q(ctx, conn).ExecContext(ctx, `INSERT INTO schema_migrations (name, area, applied_at) VALUES (?, ?, ?)`,
				s.name, s.area, time.Now().UTC().Format(time.RFC3339))
			return err
		})
		if err != nil {
			return applied, fmt.Errorf("migration %s: %w", s.name, err)
		}
		applied = append(applied, s.name)
	}
	return applied, nil
}

// Pending lists migrations that exist in the sources but aren't applied yet.
func Pending(ctx context.Context, conn *sql.DB, sources ...Source) ([]string, error) {
	scripts, err := collect(sources, "migrations")
	if err != nil {
		return nil, err
	}
	done, err := appliedNames(ctx, conn)
	if err != nil {
		return nil, err
	}
	var out []string
	for _, s := range scripts {
		if !done[s.name] {
			out = append(out, s.name)
		}
	}
	return out, nil
}

func appliedNames(ctx context.Context, conn *sql.DB) (map[string]bool, error) {
	done := map[string]bool{}
	rows, err := conn.QueryContext(ctx, `SELECT name FROM schema_migrations`)
	if err != nil {
		if strings.Contains(err.Error(), "no such table") {
			return done, nil
		}
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		done[n] = true
	}
	return done, rows.Err()
}

// Seed loads seed/<env>/ from every source, but only into a database that has never
// been seeded, so data you create while developing survives restarts.
func Seed(ctx context.Context, conn *sql.DB, env Env, sources ...Source) (loaded []string, err error) {
	if _, err := conn.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS orbit_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`); err != nil {
		return nil, err
	}
	var seededAs string
	switch err := conn.QueryRowContext(ctx, `SELECT value FROM orbit_meta WHERE key = 'seeded'`).Scan(&seededAs); {
	case err == nil:
		return nil, nil // seeded before
	case !errors.Is(err, sql.ErrNoRows):
		return nil, err
	}
	scripts, err := collect(sources, "seed/"+string(env))
	if err != nil {
		return nil, err
	}
	err = RunInTx(ctx, conn, func(ctx context.Context) error {
		for _, s := range scripts {
			if _, err := Q(ctx, conn).ExecContext(ctx, s.sql); err != nil {
				return fmt.Errorf("seed %s: %w", s.name, err)
			}
			loaded = append(loaded, s.name)
		}
		_, err := Q(ctx, conn).ExecContext(ctx, `INSERT INTO orbit_meta (key, value) VALUES ('seeded', ?)`, string(env))
		return err
	})
	if err != nil {
		return nil, err
	}
	return loaded, nil
}

// Setup is what the API runs on start: migrate, then seed a new database.
func Setup(ctx context.Context, conn *sql.DB, env Env, sources ...Source) error {
	if _, err := Migrate(ctx, conn, sources...); err != nil {
		return err
	}
	_, err := Seed(ctx, conn, env, sources...)
	return err
}
