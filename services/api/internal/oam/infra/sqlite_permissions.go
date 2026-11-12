package infra

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// SQLitePermissionRepository stores each company's roles matrix in
// oam_role_permissions (one row per allowed action + role).
type SQLitePermissionRepository struct{ db *sql.DB }

var _ domain.PermissionRepository = (*SQLitePermissionRepository)(nil)

// NewSQLitePermissionRepository returns a repository over conn.
func NewSQLitePermissionRepository(conn *sql.DB) *SQLitePermissionRepository {
	return &SQLitePermissionRepository{db: conn}
}

// Get returns the company's matrix, or the default if it was never edited.
func (r *SQLitePermissionRepository) Get(ctx context.Context, org domain.OrgID) (domain.Matrix, error) {
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, `SELECT action, role FROM oam_role_permissions WHERE org_id = ?`, string(org))
	if err != nil {
		return nil, fmt.Errorf("load permissions: %w", err)
	}
	defer rows.Close()
	m := domain.Matrix{}
	for rows.Next() {
		var a, role string
		if err := rows.Scan(&a, &role); err != nil {
			return nil, err
		}
		m[domain.Action(a)] = append(m[domain.Action(a)], domain.Role(role))
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	var edited int
	if err := db.Q(ctx, r.db).QueryRowContext(ctx, `SELECT count(*) FROM orbit_meta WHERE key = ?`, permissionsKey(org)).Scan(&edited); err != nil {
		return nil, err
	}
	if edited == 0 {
		return domain.DefaultMatrix(), nil
	}
	for _, a := range domain.MatrixActions {
		if m[a] == nil {
			m[a] = []domain.Role{} // an action nobody may do is still a row
		}
	}
	return m, nil
}

// Put replaces the company's matrix. Run it inside db.RunInTx with its audit entry.
func (r *SQLitePermissionRepository) Put(ctx context.Context, org domain.OrgID, m domain.Matrix) error {
	return db.RunInTx(ctx, r.db, func(ctx context.Context) error {
		q := db.Q(ctx, r.db)
		if _, err := q.ExecContext(ctx, `DELETE FROM oam_role_permissions WHERE org_id = ?`, string(org)); err != nil {
			return err
		}
		for a, roles := range m {
			for _, role := range roles {
				if _, err := q.ExecContext(ctx, `INSERT INTO oam_role_permissions (org_id, action, role) VALUES (?, ?, ?)`, string(org), string(a), string(role)); err != nil {
					return err
				}
			}
		}
		// Remembers that the company edited its matrix, so an action with no roles
		// isn't mistaken for "never edited, use the default".
		_, err := q.ExecContext(ctx, `INSERT INTO orbit_meta (key, value) VALUES (?, ?)
			ON CONFLICT (key) DO UPDATE SET value = excluded.value`, permissionsKey(org), time.Now().UTC().Format(time.RFC3339))
		return err
	})
}

func permissionsKey(org domain.OrgID) string { return "oam.permissions_edited." + string(org) }

// SQLiteAuditLog stores audit entries in oam_audit_entries.
type SQLiteAuditLog struct{ db *sql.DB }

var _ domain.AuditLog = (*SQLiteAuditLog)(nil)

// NewSQLiteAuditLog returns an audit log over conn.
func NewSQLiteAuditLog(conn *sql.DB) *SQLiteAuditLog { return &SQLiteAuditLog{db: conn} }

// Record adds one entry; it joins the caller's transaction.
func (l *SQLiteAuditLog) Record(ctx context.Context, e domain.AuditEntry) error {
	_, err := db.Q(ctx, l.db).ExecContext(ctx,
		`INSERT INTO oam_audit_entries (id, org_id, at, actor_id, action, summary) VALUES (?, ?, ?, ?, ?, ?)`,
		e.ID, string(e.OrgID), formatTime(e.At), nullable(string(e.ActorID)), string(e.Action), e.Summary)
	if err != nil {
		return fmt.Errorf("record audit entry: %w", err)
	}
	return nil
}

// List returns the company's entries newest first, with the actor's name.
func (l *SQLiteAuditLog) List(ctx context.Context, org domain.OrgID, limit int) ([]domain.AuditEntry, error) {
	rows, err := db.Q(ctx, l.db).QueryContext(ctx, `
		SELECT a.id, a.org_id, a.at, COALESCE(a.actor_id, ''), COALESCE(m.name, ''), a.action, a.summary
		FROM oam_audit_entries a LEFT JOIN members m ON m.id = a.actor_id
		WHERE a.org_id = ? ORDER BY a.at DESC, a.rowid DESC LIMIT ?`, string(org), limit)
	if err != nil {
		return nil, fmt.Errorf("list audit entries: %w", err)
	}
	defer rows.Close()
	var out []domain.AuditEntry
	for rows.Next() {
		var e domain.AuditEntry
		var org, at, actor, action string
		if err := rows.Scan(&e.ID, &org, &at, &actor, &e.ActorName, &action, &e.Summary); err != nil {
			return nil, err
		}
		t, err := time.Parse(time.RFC3339, at)
		if err != nil {
			return nil, fmt.Errorf("audit entry %s at: %w", e.ID, err)
		}
		e.OrgID, e.At, e.ActorID, e.Action = domain.OrgID(org), t, domain.MemberID(actor), domain.AuditAction(action)
		out = append(out, e)
	}
	return out, rows.Err()
}

// SQLiteTx runs a use case's repository calls in one database transaction.
type SQLiteTx struct{ DB *sql.DB }

// WithinTx commits fn's writes together or not at all.
func (t SQLiteTx) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return db.RunInTx(ctx, t.DB, fn)
}
