// Package infra implements HR's repositories over the shared SQLite database with
// plain SQL. Every query runs through db.Q so it joins a transaction started by the
// application layer, and every query filters by org_id first.
package infra

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Store bundles HR's repositories over one connection.
type Store struct{ db *sql.DB }

// NewStore returns HR's repositories over conn.
func NewStore(conn *sql.DB) *Store { return &Store{db: conn} }

// Repositories, each a view of the same store.
func (s *Store) Shifts() domain.ShiftRepository           { return shiftRepo{s.db} }
func (s *Store) TimeOff() domain.TimeOffRepository        { return timeOffRepo{s.db} }
func (s *Store) Entries() domain.TimeEntryRepository      { return entryRepo{s.db} }
func (s *Store) Corrections() domain.CorrectionRepository { return correctionRepo{s.db} }
func (s *Store) Periods() domain.PayPeriodRepository      { return periodRepo{s.db} }
func (s *Store) Settings() domain.SettingsRepository      { return settingsRepo{s.db} }
func (s *Store) People() domain.People                    { return peopleRepo{s.db} }

// ---------- shared helpers ----------

const timeLayout = "2006-01-02T15:04:05Z" // UTC, whole seconds: sorts correctly as text

func ts(t time.Time) string { return t.UTC().Truncate(time.Second).Format(timeLayout) }

func parseTS(s string) (time.Time, error) { return time.Parse(time.RFC3339Nano, s) }

func nullTS(t *time.Time) any {
	if t == nil {
		return nil
	}
	return ts(*t)
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func b2i(b bool) int {
	if b {
		return 1
	}
	return 0
}

// where builds "a AND b AND ..." with its arguments.
type where struct {
	parts []string
	args  []any
}

func (w *where) add(cond string, args ...any) {
	w.parts = append(w.parts, cond)
	w.args = append(w.args, args...)
}

func (w *where) sql() string { return strings.Join(w.parts, " AND ") }

// scope limits rows to what the caller may see, through the employee row aliased m
// (BR-OAM-R09): company = everything, team = the viewer and their team, self = the viewer.
func (w *where) scope(s domain.Scope) {
	w.add("m.org_id = ?", string(s.OrgID))
	switch s.Kind {
	case oam.ScopeCompany:
	case oam.ScopeTeam:
		w.add("(m.id = ? OR (? <> '' AND m.team_id = ?))", string(s.ViewerID), string(s.TeamID), string(s.TeamID))
	default:
		w.add("m.id = ?", string(s.ViewerID))
	}
}

// scanner is *sql.Row or *sql.Rows.
type scanner interface{ Scan(dest ...any) error }

// ---------- shifts ----------

type shiftRepo struct{ db *sql.DB }

const shiftSelect = `
	SELECT s.id, s.org_id, s.member_id, m.name, COALESCE(s.team_id, ''), s.starts_at, s.ends_at,
	       s.station, s.notes, s.published_at, COALESCE(s.change_note, ''), s.updated_at
	FROM hr_shifts s
	JOIN members m ON m.id = s.member_id AND m.org_id = s.org_id`

func scanShift(r scanner) (domain.Shift, error) {
	var (
		sh                    domain.Shift
		start, end, upd       string
		published             sql.NullString
		id, org, member, team string
	)
	if err := r.Scan(&id, &org, &member, &sh.MemberName, &team, &start, &end, &sh.Station, &sh.Notes, &published, &sh.ChangeNote, &upd); err != nil {
		return sh, err
	}
	sh.ID, sh.OrgID, sh.MemberID, sh.TeamID = domain.ShiftID(id), oam.OrgID(org), oam.MemberID(member), oam.TeamID(team)
	var err error
	if sh.StartsAt, err = parseTS(start); err != nil {
		return sh, err
	}
	if sh.EndsAt, err = parseTS(end); err != nil {
		return sh, err
	}
	if sh.UpdatedAt, err = parseTS(upd); err != nil {
		return sh, err
	}
	if published.Valid {
		t, err := parseTS(published.String)
		if err != nil {
			return sh, err
		}
		sh.PublishedAt = &t
	}
	return sh, nil
}

func (r shiftRepo) List(ctx context.Context, f domain.ShiftFilter) ([]domain.Shift, error) {
	var w where
	w.scope(f.Scope)
	if f.MemberID != "" {
		w.add("s.member_id = ?", string(f.MemberID))
	}
	if f.TeamID != "" {
		w.add("s.team_id = ?", string(f.TeamID))
	}
	if !f.From.IsZero() {
		w.add("s.ends_at > ?", ts(f.From))
	}
	if !f.To.IsZero() {
		w.add("s.starts_at < ?", ts(f.To))
	}
	if f.PublishedOnly {
		w.add("s.published_at IS NOT NULL")
	}
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, shiftSelect+` WHERE `+w.sql()+` ORDER BY s.starts_at, m.name`, w.args...)
	if err != nil {
		return nil, fmt.Errorf("list shifts: %w", err)
	}
	defer rows.Close()
	var out []domain.Shift
	for rows.Next() {
		sh, err := scanShift(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sh)
	}
	return out, rows.Err()
}

func (r shiftRepo) Get(ctx context.Context, org oam.OrgID, id domain.ShiftID) (domain.Shift, error) {
	sh, err := scanShift(db.Q(ctx, r.db).QueryRowContext(ctx, shiftSelect+` WHERE s.org_id = ? AND s.id = ?`, string(org), string(id)))
	if errors.Is(err, sql.ErrNoRows) {
		return sh, domain.ErrNotFound
	}
	return sh, err
}

// ---------- time off ----------

type timeOffRepo struct{ db *sql.DB }

func (r timeOffRepo) List(ctx context.Context, f domain.ShiftFilter) ([]domain.TimeOff, error) {
	var w where
	w.scope(f.Scope)
	if f.MemberID != "" {
		w.add("t.member_id = ?", string(f.MemberID))
	}
	if f.TeamID != "" {
		w.add("m.team_id = ?", string(f.TeamID))
	}
	if !f.From.IsZero() {
		w.add("t.ends_at > ?", ts(f.From))
	}
	if !f.To.IsZero() {
		w.add("t.starts_at < ?", ts(f.To))
	}
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, `
		SELECT t.id, t.org_id, t.member_id, t.starts_at, t.ends_at, t.kind, t.status, t.note
		FROM hr_time_off t JOIN members m ON m.id = t.member_id AND m.org_id = t.org_id
		WHERE `+w.sql()+` ORDER BY t.starts_at`, w.args...)
	if err != nil {
		return nil, fmt.Errorf("list time off: %w", err)
	}
	defer rows.Close()
	var out []domain.TimeOff
	for rows.Next() {
		var (
			t                           domain.TimeOff
			id, org, member, start, end string
			kind, status                string
		)
		if err := rows.Scan(&id, &org, &member, &start, &end, &kind, &status, &t.Note); err != nil {
			return nil, err
		}
		t.ID, t.OrgID, t.MemberID = domain.TimeOffID(id), oam.OrgID(org), oam.MemberID(member)
		t.Kind, t.Status = domain.TimeOffKind(kind), domain.TimeOffStatus(status)
		if t.StartsAt, err = parseTS(start); err != nil {
			return nil, err
		}
		if t.EndsAt, err = parseTS(end); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// ---------- time entries ----------

type entryRepo struct{ db *sql.DB }

const entrySelect = `
	SELECT e.id, e.org_id, e.member_id, COALESCE(e.shift_id, ''), e.clock_in, e.clock_out,
	       e.late, e.early_out, e.needs_review, e.source
	FROM hr_time_entries e
	JOIN members m ON m.id = e.member_id AND m.org_id = e.org_id`

func scanEntry(r scanner) (domain.TimeEntry, error) {
	var (
		e                               domain.TimeEntry
		id, org, member, shift, in, src string
		out                             sql.NullString
		late, early, review             int
	)
	if err := r.Scan(&id, &org, &member, &shift, &in, &out, &late, &early, &review, &src); err != nil {
		return e, err
	}
	e.ID, e.OrgID, e.MemberID, e.ShiftID = domain.EntryID(id), oam.OrgID(org), oam.MemberID(member), domain.ShiftID(shift)
	e.Late, e.EarlyOut, e.NeedsReview, e.Source = late == 1, early == 1, review == 1, domain.EntrySource(src)
	var err error
	if e.ClockIn, err = parseTS(in); err != nil {
		return e, err
	}
	if out.Valid {
		t, err := parseTS(out.String)
		if err != nil {
			return e, err
		}
		e.ClockOut = &t
	}
	return e, nil
}

func (r entryRepo) query(ctx context.Context, q string, args ...any) ([]domain.TimeEntry, error) {
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("list time entries: %w", err)
	}
	defer rows.Close()
	var out []domain.TimeEntry
	for rows.Next() {
		e, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (r entryRepo) List(ctx context.Context, f domain.EntryFilter) ([]domain.TimeEntry, error) {
	var w where
	w.scope(f.Scope)
	if f.MemberID != "" {
		w.add("e.member_id = ?", string(f.MemberID))
	}
	if f.TeamID != "" {
		w.add("m.team_id = ?", string(f.TeamID))
	}
	if !f.From.IsZero() {
		w.add("e.clock_in >= ?", ts(f.From))
	}
	if !f.To.IsZero() {
		w.add("e.clock_in < ?", ts(f.To))
	}
	return r.query(ctx, entrySelect+` WHERE `+w.sql()+` ORDER BY e.clock_in`, w.args...)
}

func (r entryRepo) Get(ctx context.Context, org oam.OrgID, id domain.EntryID) (domain.TimeEntry, error) {
	e, err := scanEntry(db.Q(ctx, r.db).QueryRowContext(ctx, entrySelect+` WHERE e.org_id = ? AND e.id = ?`, string(org), string(id)))
	if errors.Is(err, sql.ErrNoRows) {
		return e, domain.ErrNotFound
	}
	return e, err
}

func (r entryRepo) OpenFor(ctx context.Context, org oam.OrgID, member oam.MemberID) (domain.TimeEntry, error) {
	e, err := scanEntry(db.Q(ctx, r.db).QueryRowContext(ctx,
		entrySelect+` WHERE e.org_id = ? AND e.member_id = ? AND e.clock_out IS NULL`, string(org), string(member)))
	if errors.Is(err, sql.ErrNoRows) {
		return e, domain.ErrNotFound
	}
	return e, err
}

func (r entryRepo) Save(ctx context.Context, e domain.TimeEntry) error {
	_, err := db.Q(ctx, r.db).ExecContext(ctx, `
		INSERT INTO hr_time_entries (id, org_id, member_id, shift_id, clock_in, clock_out, late, early_out, needs_review, source)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			shift_id = excluded.shift_id, clock_in = excluded.clock_in, clock_out = excluded.clock_out,
			late = excluded.late, early_out = excluded.early_out, needs_review = excluded.needs_review,
			source = excluded.source`,
		string(e.ID), string(e.OrgID), string(e.MemberID), nullStr(string(e.ShiftID)), ts(e.ClockIn), nullTS(e.ClockOut),
		b2i(e.Late), b2i(e.EarlyOut), b2i(e.NeedsReview), string(e.Source))
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed: hr_time_entries.member_id") {
		return domain.ErrAlreadyClockedIn
	}
	if err != nil {
		return fmt.Errorf("save time entry %s: %w", e.ID, err)
	}
	return nil
}

// ---------- corrections ----------

type correctionRepo struct{ db *sql.DB }

const correctionSelect = `
	SELECT c.id, c.org_id, c.member_id, m.name, COALESCE(c.time_entry_id, ''), COALESCE(c.shift_id, ''),
	       c.clock_in, c.clock_out, c.reason, c.status, c.adjustment, COALESCE(c.assigned_to_id, ''),
	       COALESCE(c.reviewer_id, ''), c.submitted_at, c.reviewed_at,
	       e.clock_in, e.clock_out, s.starts_at, s.ends_at
	FROM hr_time_corrections c
	JOIN members m ON m.id = c.member_id AND m.org_id = c.org_id
	LEFT JOIN hr_time_entries e ON e.id = c.time_entry_id
	LEFT JOIN hr_shifts s ON s.id = COALESCE(c.shift_id, e.shift_id)`

func scanCorrection(r scanner) (domain.Correction, error) {
	var (
		c                                       domain.Correction
		id, org, member, entry, shift, in, out  string
		status, assigned, reviewer, submitted   string
		adjustment                              int
		reviewed                                sql.NullString
		punchIn, punchOut, shiftStart, shiftEnd sql.NullString
	)
	if err := r.Scan(&id, &org, &member, &c.MemberName, &entry, &shift, &in, &out, &c.Reason, &status, &adjustment,
		&assigned, &reviewer, &submitted, &reviewed, &punchIn, &punchOut, &shiftStart, &shiftEnd); err != nil {
		return c, err
	}
	for _, f := range []struct {
		src sql.NullString
		dst **time.Time
	}{{punchIn, &c.PunchClockIn}, {punchOut, &c.PunchClockOut}, {shiftStart, &c.ShiftStartsAt}, {shiftEnd, &c.ShiftEndsAt}} {
		if !f.src.Valid {
			continue
		}
		t, err := parseTS(f.src.String)
		if err != nil {
			return c, err
		}
		*f.dst = &t
	}
	c.ID, c.OrgID, c.MemberID = domain.CorrectionID(id), oam.OrgID(org), oam.MemberID(member)
	c.TimeEntryID, c.ShiftID, c.Status = domain.EntryID(entry), domain.ShiftID(shift), domain.CorrectionStatus(status)
	c.Adjustment, c.AssignedToID, c.ReviewerID = adjustment == 1, oam.MemberID(assigned), oam.MemberID(reviewer)
	var err error
	if c.ClockIn, err = parseTS(in); err != nil {
		return c, err
	}
	if c.ClockOut, err = parseTS(out); err != nil {
		return c, err
	}
	if c.SubmittedAt, err = parseTS(submitted); err != nil {
		return c, err
	}
	if reviewed.Valid {
		t, err := parseTS(reviewed.String)
		if err != nil {
			return c, err
		}
		c.ReviewedAt = &t
	}
	return c, nil
}

func (r correctionRepo) List(ctx context.Context, f domain.CorrectionFilter) ([]domain.Correction, error) {
	var w where
	w.scope(f.Scope)
	if f.MemberID != "" {
		w.add("c.member_id = ?", string(f.MemberID))
	}
	if f.Status != "" {
		w.add("c.status = ?", string(f.Status))
	}
	if f.AssignedTo != "" {
		w.add("c.assigned_to_id = ?", string(f.AssignedTo))
	}
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, correctionSelect+` WHERE `+w.sql()+` ORDER BY c.submitted_at DESC`, w.args...)
	if err != nil {
		return nil, fmt.Errorf("list corrections: %w", err)
	}
	defer rows.Close()
	var out []domain.Correction
	for rows.Next() {
		c, err := scanCorrection(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r correctionRepo) Get(ctx context.Context, org oam.OrgID, id domain.CorrectionID) (domain.Correction, error) {
	c, err := scanCorrection(db.Q(ctx, r.db).QueryRowContext(ctx, correctionSelect+` WHERE c.org_id = ? AND c.id = ?`, string(org), string(id)))
	if errors.Is(err, sql.ErrNoRows) {
		return c, domain.ErrNotFound
	}
	return c, err
}

func (r correctionRepo) Save(ctx context.Context, c domain.Correction) error {
	_, err := db.Q(ctx, r.db).ExecContext(ctx, `
		INSERT INTO hr_time_corrections (id, org_id, member_id, time_entry_id, shift_id, clock_in, clock_out, reason,
		                                 status, adjustment, assigned_to_id, reviewer_id, submitted_at, reviewed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (id) DO UPDATE SET
			status = excluded.status, reviewer_id = excluded.reviewer_id, reviewed_at = excluded.reviewed_at,
			assigned_to_id = excluded.assigned_to_id,
			time_entry_id = COALESCE(excluded.time_entry_id, hr_time_corrections.time_entry_id)`,
		string(c.ID), string(c.OrgID), string(c.MemberID), nullStr(string(c.TimeEntryID)), nullStr(string(c.ShiftID)),
		ts(c.ClockIn), ts(c.ClockOut), strings.TrimSpace(c.Reason), string(c.Status), b2i(c.Adjustment),
		nullStr(string(c.AssignedToID)), nullStr(string(c.ReviewerID)), ts(c.SubmittedAt), nullTS(c.ReviewedAt))
	if err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed: hr_time_corrections.time_entry_id") {
		return domain.ErrPendingExists
	}
	if err != nil {
		return fmt.Errorf("save correction %s: %w", c.ID, err)
	}
	return nil
}

// ---------- pay periods ----------

type periodRepo struct{ db *sql.DB }

const periodSelect = `SELECT id, org_id, starts_at, ends_at, pay_date, status FROM hr_pay_periods`

func scanPeriod(r scanner) (domain.PayPeriod, error) {
	var (
		p                           domain.PayPeriod
		id, org, start, end, status string
	)
	if err := r.Scan(&id, &org, &start, &end, &p.PayDate, &status); err != nil {
		return p, err
	}
	p.ID, p.OrgID, p.Status = domain.PeriodID(id), oam.OrgID(org), domain.PeriodStatus(status)
	var err error
	if p.StartsAt, err = parseTS(start); err != nil {
		return p, err
	}
	p.EndsAt, err = parseTS(end)
	return p, err
}

func (r periodRepo) List(ctx context.Context, org oam.OrgID) ([]domain.PayPeriod, error) {
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, periodSelect+` WHERE org_id = ? ORDER BY starts_at`, string(org))
	if err != nil {
		return nil, fmt.Errorf("list pay periods: %w", err)
	}
	defer rows.Close()
	var out []domain.PayPeriod
	for rows.Next() {
		p, err := scanPeriod(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r periodRepo) one(ctx context.Context, q string, args ...any) (domain.PayPeriod, error) {
	p, err := scanPeriod(db.Q(ctx, r.db).QueryRowContext(ctx, q, args...))
	if errors.Is(err, sql.ErrNoRows) {
		return p, domain.ErrNotFound
	}
	return p, err
}

func (r periodRepo) Get(ctx context.Context, org oam.OrgID, id domain.PeriodID) (domain.PayPeriod, error) {
	return r.one(ctx, periodSelect+` WHERE org_id = ? AND id = ?`, string(org), string(id))
}

func (r periodRepo) At(ctx context.Context, org oam.OrgID, t time.Time) (domain.PayPeriod, error) {
	return r.one(ctx, periodSelect+` WHERE org_id = ? AND starts_at <= ? AND ends_at > ?`, string(org), ts(t), ts(t))
}

// ---------- settings ----------

type settingsRepo struct{ db *sql.DB }

func (r settingsRepo) Get(ctx context.Context, org oam.OrgID) (domain.Settings, error) {
	s := domain.DefaultSettings()
	var (
		tz                 string
		window             int
		overtime, maxShift float64
	)
	err := db.Q(ctx, r.db).QueryRowContext(ctx,
		`SELECT timezone, clock_in_window_min, overtime_weekly_hours, max_shift_hours FROM hr_settings WHERE org_id = ?`,
		string(org)).Scan(&tz, &window, &overtime, &maxShift)
	if errors.Is(err, sql.ErrNoRows) {
		return s, nil
	}
	if err != nil {
		return s, fmt.Errorf("hr settings: %w", err)
	}
	if loc, err := time.LoadLocation(tz); err == nil {
		s.Timezone = loc
	}
	s.ClockInWindow = time.Duration(window) * time.Minute
	s.OvertimeWeeklyHours = overtime
	s.MaxShift = time.Duration(maxShift * float64(time.Hour))
	return s, nil
}

// ---------- people (read-only view of OAM's members and teams) ----------

type peopleRepo struct{ db *sql.DB }

func (r peopleRepo) Get(ctx context.Context, org oam.OrgID, id oam.MemberID) (domain.Person, error) {
	var (
		p                             domain.Person
		mid, morg, role, status, team string
	)
	err := db.Q(ctx, r.db).QueryRowContext(ctx,
		`SELECT id, org_id, name, email, role, status, COALESCE(team_id, '') FROM members WHERE org_id = ? AND id = ?`,
		string(org), string(id)).Scan(&mid, &morg, &p.Name, &p.Email, &role, &status, &team)
	if errors.Is(err, sql.ErrNoRows) {
		return p, domain.ErrNotFound
	}
	if err != nil {
		return p, err
	}
	p.ID, p.OrgID, p.Role, p.Status, p.TeamID = oam.MemberID(mid), oam.OrgID(morg), oam.Role(role), oam.Status(status), oam.TeamID(team)
	return p, nil
}

func (r peopleRepo) Reviewer(ctx context.Context, org oam.OrgID, team oam.TeamID) (oam.MemberID, error) {
	var id string
	err := db.Q(ctx, r.db).QueryRowContext(ctx, `
		SELECT id FROM members
		WHERE org_id = ? AND status = 'Active'
		  AND ((role = 'Supervisor' AND team_id = ? AND ? <> '') OR role IN ('HR Admin', 'Owner'))
		ORDER BY CASE role WHEN 'Supervisor' THEN 0 WHEN 'HR Admin' THEN 1 ELSE 2 END, invited_at
		LIMIT 1`, string(org), string(team), string(team)).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", domain.ErrNotFound
	}
	return oam.MemberID(id), err
}

// Employees joins members to their team, their open punch, the hours they worked in the
// period and their pending corrections, then applies the filters. One query, no N+1.
func (r peopleRepo) Employees(ctx context.Context, f domain.EmployeeFilter) ([]domain.EmployeeSummary, error) {
	var w where
	w.scope(f.Scope)
	status := f.Status
	if status == "" {
		status = oam.StatusActive
	}
	w.add("m.status = ?", string(status))
	if f.TeamID != "" {
		w.add("m.team_id = ?", string(f.TeamID))
	}
	if f.Role != "" {
		w.add("m.role = ?", string(f.Role))
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		like := "%" + strings.ToLower(q) + "%"
		w.add("(lower(m.name) LIKE ? OR lower(m.email) LIKE ?)", like, like)
	}
	if f.ClockedIn != nil {
		if *f.ClockedIn {
			w.add("open.clock_in IS NOT NULL")
		} else {
			w.add("open.clock_in IS NULL")
		}
	}
	args := []any{ts(f.PeriodStart), ts(f.PeriodEnd)}
	args = append(args, w.args...)
	rows, err := db.Q(ctx, r.db).QueryContext(ctx, `
		SELECT m.id, m.org_id, m.name, m.email, m.role, m.status, COALESCE(m.team_id, ''), COALESCE(t.name, ''),
		       open.clock_in,
		       COALESCE(worked.hours, 0),
		       COALESCE(pending.n, 0)
		FROM members m
		LEFT JOIN teams t ON t.id = m.team_id
		LEFT JOIN hr_time_entries open ON open.member_id = m.id AND open.clock_out IS NULL
		LEFT JOIN (
			SELECT member_id, SUM((julianday(clock_out) - julianday(clock_in)) * 24) AS hours
			FROM hr_time_entries
			WHERE clock_out IS NOT NULL AND clock_in >= ? AND clock_in < ?
			GROUP BY member_id
		) worked ON worked.member_id = m.id
		LEFT JOIN (
			SELECT member_id, COUNT(*) AS n FROM hr_time_corrections WHERE status = 'Pending' GROUP BY member_id
		) pending ON pending.member_id = m.id
		WHERE `+w.sql()+`
		ORDER BY m.name`, args...)
	if err != nil {
		return nil, fmt.Errorf("list employees: %w", err)
	}
	defer rows.Close()
	var out []domain.EmployeeSummary
	for rows.Next() {
		var (
			e                           domain.EmployeeSummary
			id, org, role, status, team string
			since                       sql.NullString
		)
		if err := rows.Scan(&id, &org, &e.Name, &e.Email, &role, &status, &team, &e.TeamName, &since, &e.HoursThisPeriod, &e.PendingCorrections); err != nil {
			return nil, err
		}
		e.ID, e.OrgID, e.Role, e.Status, e.TeamID = oam.MemberID(id), oam.OrgID(org), oam.Role(role), oam.Status(status), oam.TeamID(team)
		e.HoursThisPeriod = float64(int64(e.HoursThisPeriod*100+0.5)) / 100
		if since.Valid {
			t, err := parseTS(since.String)
			if err != nil {
				return nil, err
			}
			e.ClockedInSince = &t
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ---------- ids and transactions ----------

// NewID returns "<prefix>-<12 hex>" ids for new rows.
func NewID(prefix string) string { return prefix + "-" + randomHex(6) }

// Tx runs fn in one SQLite transaction.
type Tx struct{ DB *sql.DB }

// WithinTx commits fn's writes together or not at all.
func (t Tx) WithinTx(ctx context.Context, fn func(ctx context.Context) error) error {
	return db.RunInTx(ctx, t.DB, fn)
}
