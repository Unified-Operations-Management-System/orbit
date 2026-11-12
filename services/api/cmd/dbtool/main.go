// Command dbtool is the team's database helper. Run it through pnpm from the repo root:
//
//	pnpm db:new <area> <what>                 new migration   internal/<area>/migrations/<ts>_<area>_<what>.sql
//	pnpm db:new <area> <what> --seed dev      new dev seed    internal/<area>/seed/dev/…
//	pnpm db:new <area> <what> --seed prod     new prod seed   internal/<area>/seed/prod/…
//	pnpm db:status                            which migrations are applied / pending (ORBIT_ENV picks the file)
//	pnpm db:reset                             delete the dev database; the next API start rebuilds it
//
// A new area also gets internal/<area>/schema.go; add `<area>.Schema` to
// internal/app/areas.go once and the API picks the folder up.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
)

func main() {
	if len(os.Args) < 2 {
		usage()
	}
	var err error
	switch os.Args[1] {
	case "new":
		err = newFile(os.Args[2:])
	case "status":
		err = status()
	case "reset":
		err = reset(os.Args[2:])
	default:
		usage()
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

func usage() {
	fmt.Fprintln(os.Stderr, `usage:
  pnpm db:new <area> <what> [--seed dev|prod]
  pnpm db:status
  pnpm db:reset [--prod]`)
	os.Exit(2)
}

var word = regexp.MustCompile(`^[a-z][a-z0-9]*$`)
var what = regexp.MustCompile(`^[a-z0-9][a-z0-9_]*$`)

func newFile(args []string) error {
	fs := flag.NewFlagSet("new", flag.ExitOnError)
	seed := fs.String("seed", "", "dev or prod: write a seed file instead of a migration")
	// Allow the flag after the positional arguments: `db:new hr demo_rows --seed dev`.
	var pos []string
	for i := 0; i < len(args); i++ {
		if strings.HasPrefix(args[i], "--seed") {
			if err := fs.Parse(args[i:]); err != nil {
				return err
			}
			break
		}
		pos = append(pos, args[i])
	}
	if len(pos) != 2 {
		usage()
	}
	area, name := pos[0], strings.ReplaceAll(strings.ToLower(pos[1]), "-", "_")
	if !word.MatchString(area) {
		return fmt.Errorf("area %q: use one lowercase word, e.g. hr, analytics, inventory", area)
	}
	if !what.MatchString(name) {
		return fmt.Errorf("name %q: use lowercase words joined by _, e.g. time_entries", name)
	}
	dir := filepath.Join("internal", area, "migrations")
	header := fmt.Sprintf("-- %s: %s\n-- Applied once, in timestamp order with every area's migrations. Never edit it\n-- after it's merged; add a new migration instead. Prefix your tables with %s_.\n\n", area, strings.ReplaceAll(name, "_", " "), area)
	switch *seed {
	case "":
	case "dev", "prod":
		dir = filepath.Join("internal", area, "seed", *seed)
		header = fmt.Sprintf("-- %s %s seed: %s\n-- Loaded once into a brand-new %s database, after all migrations.\n\n", area, *seed, strings.ReplaceAll(name, "_", " "), *seed)
	default:
		return fmt.Errorf("--seed must be dev or prod")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	if err := ensureSchemaFile(area); err != nil {
		return err
	}
	path := filepath.Join(dir, fmt.Sprintf("%s_%s_%s.sql", time.Now().UTC().Format("200601021504"), area, name))
	if _, err := os.Stat(path); err == nil {
		return fmt.Errorf("%s already exists; wait a minute or pick another name", path)
	}
	if err := os.WriteFile(path, []byte(header), 0o644); err != nil {
		return err
	}
	fmt.Println("created", filepath.Join("services/api", path))
	return nil
}

// ensureSchemaFile gives a new area the one Go file the database needs.
func ensureSchemaFile(area string) error {
	path := filepath.Join("internal", area, "schema.go")
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	// embed needs every listed folder to exist; keep the seed folders with .gitkeep.
	for _, d := range []string{"migrations", "seed/dev", "seed/prod"} {
		full := filepath.Join("internal", area, d)
		if err := os.MkdirAll(full, 0o755); err != nil {
			return err
		}
		keep := filepath.Join(full, ".gitkeep")
		if _, err := os.Stat(keep); errors.Is(err, os.ErrNotExist) {
			if err := os.WriteFile(keep, nil, 0o644); err != nil {
				return err
			}
		}
	}
	src := fmt.Sprintf(`// Package %[1]s hands the %[1]s area's SQL to the shared database (internal/db).
package %[1]s

import (
	"embed"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
)

//go:embed migrations seed
var files embed.FS

// Schema is %[1]s's migrations and seed data. Add it to internal/app/areas.go.
var Schema = db.Source{Area: %[1]q, Files: files}
`, area)
	if err := os.WriteFile(path, []byte(src), 0o644); err != nil {
		return err
	}
	fmt.Printf("created services/api/%s\n  -> add %s.Schema to services/api/internal/app/areas.go\n", path, area)
	return nil
}

func env() (db.Env, string, error) {
	e, err := db.ParseEnv(os.Getenv("ORBIT_ENV"))
	if err != nil {
		return "", "", err
	}
	p := os.Getenv("DB_PATH")
	if p == "" {
		p = db.DefaultPath(e)
	}
	return e, p, nil
}

func status() error {
	e, path, err := env()
	if err != nil {
		return err
	}
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		fmt.Printf("%s database %s doesn't exist yet; start the API to create it\n", e, path)
		return nil
	}
	ctx := context.Background()
	conn, err := db.Open(ctx, path)
	if err != nil {
		return err
	}
	defer conn.Close()
	rows, err := conn.QueryContext(ctx, `SELECT name, applied_at FROM schema_migrations ORDER BY name`)
	if err != nil {
		return err
	}
	defer rows.Close()
	fmt.Printf("%s database %s\napplied:\n", e, path)
	for rows.Next() {
		var n, at string
		if err := rows.Scan(&n, &at); err != nil {
			return err
		}
		fmt.Printf("  %s  (%s)\n", n, at)
	}
	pending, err := db.Pending(ctx, conn, app.Areas...)
	if err != nil {
		return err
	}
	fmt.Println("pending (applied on the next API start):")
	if len(pending) == 0 {
		fmt.Println("  none")
	}
	for _, n := range pending {
		fmt.Println("  " + n)
	}
	return nil
}

// reset deletes the dev database (the prod one only with --prod), so the next API
// start rebuilds it from every area's migrations and seeds.
func reset(args []string) error {
	target := db.Dev
	if len(args) > 0 && args[0] == "--prod" {
		target = db.Prod
	}
	if e, _, err := env(); err != nil {
		return err
	} else if e == db.Prod && target != db.Prod {
		return fmt.Errorf("ORBIT_ENV=prod: pass --prod to really delete the prod database")
	}
	path := os.Getenv("DB_PATH")
	if path == "" {
		path = db.DefaultPath(target)
	}
	for _, p := range []string{path, path + "-wal", path + "-shm"} {
		if err := os.Remove(p); err != nil && !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}
	fmt.Printf("deleted %s; the next API start rebuilds it from every area's migrations and seeds\n", path)
	return nil
}
