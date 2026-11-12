-- HR Management: schedules, time and attendance, pay periods and time corrections.
-- Author: Suthakaran Siva.
--
-- An employee is NOT redefined here. HR reuses OAM's `members` row as the employee
-- (name, email, role, team, status) and points at it with member_id. HR only reads the
-- shared tables (organizations, teams, members); it never writes to them.
--
-- Keys at a glance
--   * Every table has a TEXT primary key `id` (or org_id for the one-row-per-company table).
--   * Every table has org_id -> organizations(id): one database serves many companies, and
--     every query filters by org_id first.
--   * member_id -> members(id): whose shift / punch / request it is.
--   * team_id -> teams(id): which line or crew a shift belongs to (supervisor scoping).
--   * hr_time_entries.shift_id -> hr_shifts(id): the shift a punch was made against (NULL
--     when someone clocked in with no shift, which is flagged for review).
--   * hr_time_corrections.time_entry_id -> hr_time_entries(id): the punch being fixed
--     (NULL when the whole shift had no punch and the employee is adding a missing entry).
--
-- Times are UTC RFC 3339 text (2026-11-20T12:00:00Z), booleans are 0/1, ids are TEXT.

-- One row per company: the rules the HR Administrator sets (Configure Pay and Time Rules).
CREATE TABLE hr_settings (
    org_id                TEXT PRIMARY KEY REFERENCES organizations (id),
    timezone              TEXT    NOT NULL DEFAULT 'America/Toronto',  -- local day and week boundaries
    clock_in_window_min   INTEGER NOT NULL DEFAULT 15 CHECK (clock_in_window_min BETWEEN 0 AND 240),
    overtime_weekly_hours REAL    NOT NULL DEFAULT 40 CHECK (overtime_weekly_hours > 0),
    max_shift_hours       REAL    NOT NULL DEFAULT 12 CHECK (max_shift_hours > 0)
);

-- Pay periods: [starts_at, ends_at). An entry belongs to the period containing its clock_in,
-- so entries don't store a period id (it would duplicate what the times already say).
CREATE TABLE hr_pay_periods (
    id        TEXT PRIMARY KEY,
    org_id    TEXT NOT NULL REFERENCES organizations (id),
    starts_at TEXT NOT NULL,
    ends_at   TEXT NOT NULL,
    pay_date  TEXT NOT NULL,                                  -- YYYY-MM-DD
    status    TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
    CHECK (ends_at > starts_at),
    UNIQUE (org_id, starts_at)                                -- no two periods start together
);

-- Scheduled shifts (UC-HR-03). A NULL published_at is a draft only HR and supervisors see.
CREATE TABLE hr_shifts (
    id           TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL REFERENCES organizations (id),
    member_id    TEXT NOT NULL REFERENCES members (id),
    team_id      TEXT REFERENCES teams (id),
    starts_at    TEXT NOT NULL,
    ends_at      TEXT NOT NULL,
    station      TEXT NOT NULL,
    notes        TEXT NOT NULL DEFAULT '',
    published_at TEXT,
    change_note  TEXT,                                        -- "Moved from 7:00 AM", shown as Updated
    updated_at   TEXT NOT NULL,
    CHECK (ends_at > starts_at)
);
CREATE INDEX hr_shifts_by_member ON hr_shifts (org_id, member_id, starts_at);
CREATE INDEX hr_shifts_by_team   ON hr_shifts (org_id, team_id, starts_at);

-- Approved or requested time off, shown on the schedule.
CREATE TABLE hr_time_off (
    id        TEXT PRIMARY KEY,
    org_id    TEXT NOT NULL REFERENCES organizations (id),
    member_id TEXT NOT NULL REFERENCES members (id),
    starts_at TEXT NOT NULL,
    ends_at   TEXT NOT NULL,
    kind      TEXT NOT NULL CHECK (kind IN ('Vacation', 'Sick', 'Personal')),
    status    TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    note      TEXT NOT NULL DEFAULT '',
    CHECK (ends_at > starts_at)
);
CREATE INDEX hr_time_off_by_member ON hr_time_off (org_id, member_id, starts_at);

-- Punches (UC-HR-01 Clock In, UC-HR-02 Clock Out). clock_out NULL = still clocked in.
CREATE TABLE hr_time_entries (
    id           TEXT PRIMARY KEY,
    org_id       TEXT NOT NULL REFERENCES organizations (id),
    member_id    TEXT NOT NULL REFERENCES members (id),
    shift_id     TEXT REFERENCES hr_shifts (id),
    clock_in     TEXT NOT NULL,
    clock_out    TEXT,
    late         INTEGER NOT NULL DEFAULT 0 CHECK (late IN (0, 1)),
    early_out    INTEGER NOT NULL DEFAULT 0 CHECK (early_out IN (0, 1)),
    needs_review INTEGER NOT NULL DEFAULT 0 CHECK (needs_review IN (0, 1)),  -- clocked in with no shift
    source       TEXT NOT NULL DEFAULT 'Clock' CHECK (source IN ('Clock', 'Correction')),
    CHECK (clock_out IS NULL OR clock_out > clock_in)
);
CREATE INDEX hr_time_entries_by_member ON hr_time_entries (org_id, member_id, clock_in);
-- Business rule "Single Active Clock-In": at most one open entry per member.
CREATE UNIQUE INDEX hr_time_entries_one_open ON hr_time_entries (member_id) WHERE clock_out IS NULL;

-- Correction requests (UC-HR-04). The original entry is never changed until a reviewer approves.
CREATE TABLE hr_time_corrections (
    id             TEXT PRIMARY KEY,
    org_id         TEXT NOT NULL REFERENCES organizations (id),
    member_id      TEXT NOT NULL REFERENCES members (id),
    time_entry_id  TEXT REFERENCES hr_time_entries (id),
    shift_id       TEXT REFERENCES hr_shifts (id),
    clock_in       TEXT NOT NULL,
    clock_out      TEXT NOT NULL,
    reason         TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),  -- "Manual Entry Reason"
    status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Withdrawn')),
    adjustment     INTEGER NOT NULL DEFAULT 0 CHECK (adjustment IN (0, 1)),       -- fixes a closed pay period
    assigned_to_id TEXT REFERENCES members (id),             -- the supervisor (or HR Admin) who must review
    reviewer_id    TEXT REFERENCES members (id),             -- who actually approved or rejected
    submitted_at   TEXT NOT NULL,
    reviewed_at    TEXT,
    CHECK (clock_out > clock_in),
    CHECK (time_entry_id IS NOT NULL OR shift_id IS NOT NULL),
    CHECK (reviewer_id IS NULL OR reviewer_id <> member_id)   -- "No Self-Approval"
);
CREATE INDEX hr_time_corrections_by_member ON hr_time_corrections (org_id, member_id, submitted_at);
CREATE INDEX hr_time_corrections_by_status ON hr_time_corrections (org_id, status, submitted_at);
-- Only one pending request per punch.
CREATE UNIQUE INDEX hr_time_corrections_one_pending
    ON hr_time_corrections (time_entry_id) WHERE status = 'Pending' AND time_entry_id IS NOT NULL;
