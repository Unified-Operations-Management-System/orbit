package domain

import (
	"context"
	"time"

	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Scope limits a query to what the caller may see (BR-OAM-R09): the whole company, the
// viewer's team, or only the viewer.
type Scope struct {
	OrgID    oam.OrgID
	Kind     oam.Scope
	ViewerID oam.MemberID
	TeamID   oam.TeamID // the viewer's team, for oam.ScopeTeam
}

// ShiftFilter narrows a shift query. Zero values mean "no filter".
type ShiftFilter struct {
	Scope
	MemberID      oam.MemberID
	TeamID        oam.TeamID
	From, To      time.Time // shifts that overlap [From, To)
	PublishedOnly bool
}

// EntryFilter narrows a time-entry query.
type EntryFilter struct {
	Scope
	MemberID oam.MemberID
	TeamID   oam.TeamID
	From, To time.Time // entries whose clock_in is in [From, To)
}

// CorrectionFilter narrows a correction query.
type CorrectionFilter struct {
	Scope
	MemberID   oam.MemberID
	Status     CorrectionStatus
	AssignedTo oam.MemberID
}

// EmployeeFilter narrows the HR employee list.
type EmployeeFilter struct {
	Scope
	TeamID      oam.TeamID
	Status      oam.Status // default Active when empty
	Role        oam.Role
	Query       string // name or email contains
	ClockedIn   *bool
	PeriodStart time.Time // hours are summed over [PeriodStart, PeriodEnd)
	PeriodEnd   time.Time
}

// ShiftRepository reads and writes hr_shifts.
type ShiftRepository interface {
	List(ctx context.Context, f ShiftFilter) ([]Shift, error)
	Get(ctx context.Context, org oam.OrgID, id ShiftID) (Shift, error)
}

// TimeOffRepository reads hr_time_off.
type TimeOffRepository interface {
	List(ctx context.Context, f ShiftFilter) ([]TimeOff, error)
}

// TimeEntryRepository reads and writes hr_time_entries.
type TimeEntryRepository interface {
	List(ctx context.Context, f EntryFilter) ([]TimeEntry, error)
	Get(ctx context.Context, org oam.OrgID, id EntryID) (TimeEntry, error)
	// OpenFor returns the member's open entry, or ErrNotFound.
	OpenFor(ctx context.Context, org oam.OrgID, member oam.MemberID) (TimeEntry, error)
	// Save inserts or updates e by ID. A second open entry is ErrAlreadyClockedIn.
	Save(ctx context.Context, e TimeEntry) error
}

// CorrectionRepository reads and writes hr_time_corrections.
type CorrectionRepository interface {
	List(ctx context.Context, f CorrectionFilter) ([]Correction, error)
	Get(ctx context.Context, org oam.OrgID, id CorrectionID) (Correction, error)
	// Save inserts or updates c by ID. A second pending request is ErrPendingExists.
	Save(ctx context.Context, c Correction) error
}

// PayPeriodRepository reads hr_pay_periods.
type PayPeriodRepository interface {
	List(ctx context.Context, org oam.OrgID) ([]PayPeriod, error)
	Get(ctx context.Context, org oam.OrgID, id PeriodID) (PayPeriod, error)
	// At returns the period containing t, or ErrNotFound.
	At(ctx context.Context, org oam.OrgID, t time.Time) (PayPeriod, error)
}

// SettingsRepository reads hr_settings, falling back to DefaultSettings.
type SettingsRepository interface {
	Get(ctx context.Context, org oam.OrgID) (Settings, error)
}

// People reads employees from OAM's shared tables (read only).
type People interface {
	Get(ctx context.Context, org oam.OrgID, id oam.MemberID) (Person, error)
	// Reviewer returns who reviews requests from someone on team: the team's active
	// supervisor, else an active HR Admin, else the owner.
	Reviewer(ctx context.Context, org oam.OrgID, team oam.TeamID) (oam.MemberID, error)
	// Employees lists people with their attendance this period.
	Employees(ctx context.Context, f EmployeeFilter) ([]EmployeeSummary, error)
}
