# Orbit API

Go 1.27, `net/http`, handlers generated from the OpenAPI contract in `packages/api-spec`.
See the root README for running the whole stack.

## Database

Orbit uses one SQLite file. It lives inside the API process, so there's no database
server to install or start: running the API opens the file (creating it if needed),
applies every area's migrations and, for a brand-new file, loads the seed data.

| | develop (default) | main |
|---|---|---|
| Start | `pnpm dev` or `pnpm --filter api dev` | `pnpm start:prod` |
| `ORBIT_ENV` | `dev` | `prod` |
| File | `services/api/data/orbit-dev.db` | `services/api/data/orbit.db` |
| Seed | each area's `seed/dev/` (demo data) | each area's `seed/prod/` (the data we show the professor) |

`DB_PATH` overrides the file. Both files are git-ignored: the database is always rebuilt
from the SQL in the repo, so it can't drift and you never merge a binary.

Your data survives restarts. To start over: `pnpm db:reset` (dev), then restart the API.

### Who owns what

```
services/api/internal/
  db/                     shared: open, migrate, seed, transactions (don't edit for your area)
  app/areas.go            the list of areas; one line per area
  oam/                    Organization and Access (Oluwasekunayo)
    schema.go             hands the folders below to internal/db
    migrations/           CREATE / ALTER TABLE, in timestamp order
    seed/dev/  seed/prod/ INSERTs for a fresh database
    infra/                the repository that runs your SQL
  <your area>/            same shape: hr, analytics, sim, inventory
```

### Adding your area's tables

1. Create a migration (the helper names and places it for you):

   ```sh
   pnpm db:new hr time_entries
   # created services/api/internal/hr/schema.go            (first time only)
   #   -> add hr.Schema to services/api/internal/app/areas.go
   # created services/api/internal/hr/migrations/202611201000_hr_time_entries.sql
   ```

2. First time only: add your area to `internal/app/areas.go`:

   ```go
   var Areas = []db.Source{
       oamschema.Schema,
       hr.Schema,
   }
   ```

3. Write the SQL. Prefix your tables with your area, and reference shared tables
   (`organizations`, `teams`, `members`) by id:

   ```sql
   CREATE TABLE hr_time_entries (
       id        TEXT PRIMARY KEY,
       org_id    TEXT NOT NULL REFERENCES organizations (id),
       member_id TEXT NOT NULL REFERENCES members (id),
       clock_in  TEXT NOT NULL,          -- UTC RFC 3339, e.g. 2026-11-20T07:02:00Z
       clock_out TEXT
   );
   CREATE INDEX hr_time_entries_by_member ON hr_time_entries (member_id, clock_in);
   ```

4. Demo rows for develop: `pnpm db:new hr demo_rows --seed dev`, then write `INSERT`s.
   Data for the professor goes in `--seed prod` the same way.

5. Restart the API. `pnpm db:status` shows what's applied and what's pending.

6. Write your repository in `internal/<area>/infra/` with plain SQL. Run every query
   through `db.Q(ctx, r.db)` so it joins a transaction when your use case starts one:

   ```go
   type SQLiteTimeEntryRepository struct{ db *sql.DB }

   func (r *SQLiteTimeEntryRepository) Save(ctx context.Context, e domain.TimeEntry) error {
       _, err := db.Q(ctx, r.db).ExecContext(ctx,
           `INSERT INTO hr_time_entries (id, org_id, member_id, clock_in) VALUES (?, ?, ?, ?)`,
           e.ID, e.OrgID, e.MemberID, e.ClockIn.UTC().Format(time.RFC3339))
       return err
   }

   // Several writes that must succeed together:
   err := db.RunInTx(ctx, conn, func(ctx context.Context) error {
       if err := entries.Save(ctx, e); err != nil { return err }
       return audit.Record(ctx, entry)
   })
   ```

   `internal/oam/infra/sqlite_member_repo.go` is a full example, and
   `repository_contract_test.go` shows how to test it on an in-memory database
   (`db.Open(ctx, ":memory:")` + `db.Setup(ctx, conn, db.Dev, oam.Schema)`).

### Rules

- **Never edit a migration that's merged.** Other people's databases already ran it. Add
  a new migration (`pnpm db:new <area> add_<column>`) instead.
- **One area, one prefix.** `hr_…`, `analytics_…`, `sim_…`, `inventory_…`. Only the shared
  tables (`organizations`, `teams`, `members`) have no prefix; other areas read them, and
  only OAM changes them.
- **Don't write to another area's tables.** Ask for an endpoint or a repository method.
- **File names are checked.** `<yyyymmddhhmm>_<area>_<what>.sql`, with the area matching
  its folder; the API refuses to start otherwise. `pnpm db:new` gets it right.
- **Times are UTC RFC 3339 text, booleans are 0/1, ids are TEXT.**
- **Something weird locally?** `pnpm db:reset` and restart.

### Branches

Work happens on `develop` with the dev database. `main` is what we show the professor:
`pnpm start:prod` builds `orbit.db` from the migrations plus every area's `seed/prod/`.
The prod seed is empty for now; fill it before the defense.
