package infra

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// SQLiteMemberRepository stores members in the shared Orbit database (table
// `members`, see migrations/). It joins a transaction started with db.RunInTx.
type SQLiteMemberRepository struct {
	db *sql.DB
}

var _ domain.MemberRepository = (*SQLiteMemberRepository)(nil)

// NewSQLiteMemberRepository returns a repository over conn.
func NewSQLiteMemberRepository(conn *sql.DB) *SQLiteMemberRepository {
	return &SQLiteMemberRepository{db: conn}
}

const memberColumns = `id, org_id, name, email, role, status, team_id, invited_at, expires_at`

// ListByOrg returns the organization's members, oldest invitation first, then by name.
func (r *SQLiteMemberRepository) ListByOrg(ctx context.Context, org domain.OrgID) ([]domain.Member, error) {
	rows, err := db.Q(ctx, r.db).QueryContext(ctx,
		`SELECT `+memberColumns+` FROM members WHERE org_id = ? ORDER BY invited_at, name`, string(org))
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()
	var out []domain.Member
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// GetByID returns domain.ErrNotFound if the member isn't in org.
func (r *SQLiteMemberRepository) GetByID(ctx context.Context, org domain.OrgID, id domain.MemberID) (domain.Member, error) {
	row := db.Q(ctx, r.db).QueryRowContext(ctx,
		`SELECT `+memberColumns+` FROM members WHERE org_id = ? AND id = ?`, string(org), string(id))
	return oneMember(row)
}

// GetByEmail returns domain.ErrNotFound if no member of org has that email.
func (r *SQLiteMemberRepository) GetByEmail(ctx context.Context, org domain.OrgID, e domain.Email) (domain.Member, error) {
	row := db.Q(ctx, r.db).QueryRowContext(ctx,
		`SELECT `+memberColumns+` FROM members WHERE org_id = ? AND email = ?`, string(org), string(e))
	return oneMember(row)
}

// Save inserts the member or updates it by ID. The database's unique email per
// company is reported as domain.ErrDuplicateEmail.
func (r *SQLiteMemberRepository) Save(ctx context.Context, m domain.Member) error {
	_, err := db.Q(ctx, r.db).ExecContext(ctx, `
		INSERT INTO members (`+memberColumns+`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			name = excluded.name, email = excluded.email, role = excluded.role,
			status = excluded.status, team_id = excluded.team_id,
			invited_at = excluded.invited_at, expires_at = excluded.expires_at`,
		string(m.ID), string(m.OrgID), m.Name, string(m.Email), string(m.Role), string(m.Status),
		nullable(string(m.TeamID)), formatTime(m.InvitedAt), formatTime(m.ExpiresAt))
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed: members.org_id, members.email") {
		return domain.ErrDuplicateEmail
	}
	if err != nil {
		return fmt.Errorf("save member %s: %w", m.ID, err)
	}
	return nil
}

type scanner interface{ Scan(dest ...any) error }

func scanMember(s scanner) (domain.Member, error) {
	var (
		m                                  domain.Member
		id, org, name, email, role, status string
		team                               sql.NullString
		invitedAt, expiresAt               string
	)
	if err := s.Scan(&id, &org, &name, &email, &role, &status, &team, &invitedAt, &expiresAt); err != nil {
		return domain.Member{}, err
	}
	invited, err := time.Parse(time.RFC3339, invitedAt)
	if err != nil {
		return domain.Member{}, fmt.Errorf("member %s invited_at: %w", id, err)
	}
	expires, err := time.Parse(time.RFC3339, expiresAt)
	if err != nil {
		return domain.Member{}, fmt.Errorf("member %s expires_at: %w", id, err)
	}
	m = domain.Member{
		ID: domain.MemberID(id), OrgID: domain.OrgID(org), Name: name, Email: domain.Email(email),
		Role: domain.Role(role), Status: domain.Status(status), TeamID: domain.TeamID(team.String),
		InvitedAt: invited, ExpiresAt: expires,
	}
	return m, nil
}

func oneMember(row *sql.Row) (domain.Member, error) {
	m, err := scanMember(row)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Member{}, domain.ErrNotFound
	}
	return m, err
}

func formatTime(t time.Time) string { return t.UTC().Format(time.RFC3339) }

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
