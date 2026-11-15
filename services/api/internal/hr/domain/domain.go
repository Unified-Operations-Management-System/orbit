// Package domain models HR Management: shifts, time entries (punches), pay periods,
// time corrections and the rules that govern them. It has no database or HTTP code.
//
// An employee is OAM's member: HR refers to people by oam.MemberID and reads their
// name, role and team from OAM; it never redefines them.
package domain

import (
	"time"

	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Identifiers. Member, organization and team ids come from OAM.
type (
	ShiftID      string
	EntryID      string
	CorrectionID string
	PeriodID     string
	TimeOffID    string
)

// Settings are the company's pay and time rules (Configure Pay and Time Rules).
type Settings struct {
	Timezone            *time.Location
	ClockInWindow       time.Duration // earliest clock-in before a shift starts (UC-HR-01 ext 4.a)
	OvertimeWeeklyHours float64       // weekly hours above this are overtime (UC-HR-02 ext 4.b)
	MaxShift            time.Duration // an open entry longer than this probably missed a clock-out
}

// DefaultSettings applies when a company has not saved its own rules.
func DefaultSettings() Settings {
	loc, err := time.LoadLocation("America/Toronto")
	if err != nil {
		loc = time.UTC
	}
	return Settings{Timezone: loc, ClockInWindow: 15 * time.Minute, OvertimeWeeklyHours: 40, MaxShift: 12 * time.Hour}
}

// Shift is one scheduled shift for one member (UC-HR-03).
type Shift struct {
	ID          ShiftID
	OrgID       oam.OrgID
	MemberID    oam.MemberID
	MemberName  string
	TeamID      oam.TeamID
	StartsAt    time.Time
	EndsAt      time.Time
	Station     string
	Notes       string
	PublishedAt *time.Time // nil: a draft only HR and supervisors see
	ChangeNote  string     // set when the shift changed after publishing
	UpdatedAt   time.Time
}

// Published reports whether employees can see the shift.
func (s Shift) Published() bool { return s.PublishedAt != nil }

// Hours is the scheduled length of the shift.
func (s Shift) Hours() float64 { return hoursBetween(s.StartsAt, s.EndsAt) }

// TimeOffKind and TimeOffStatus classify a time-off request.
type (
	TimeOffKind   string
	TimeOffStatus string
)

// TimeOff is leave shown on the schedule.
type TimeOff struct {
	ID       TimeOffID
	OrgID    oam.OrgID
	MemberID oam.MemberID
	StartsAt time.Time
	EndsAt   time.Time
	Kind     TimeOffKind
	Status   TimeOffStatus
	Note     string
}

// EntrySource says how a time entry was created.
type EntrySource string

const (
	SourceClock      EntrySource = "Clock"
	SourceCorrection EntrySource = "Correction"
)

// TimeEntry is one punch pair (UC-HR-01, UC-HR-02). ClockOut is nil while clocked in.
type TimeEntry struct {
	ID          EntryID
	OrgID       oam.OrgID
	MemberID    oam.MemberID
	ShiftID     ShiftID // empty when clocked in without a scheduled shift
	ClockIn     time.Time
	ClockOut    *time.Time
	Late        bool
	EarlyOut    bool
	NeedsReview bool
	Source      EntrySource
}

// Open reports whether the employee is still clocked in on this entry.
func (e TimeEntry) Open() bool { return e.ClockOut == nil }

// Hours is the worked time; zero while the entry is open.
func (e TimeEntry) Hours() float64 {
	if e.ClockOut == nil {
		return 0
	}
	return hoursBetween(e.ClockIn, *e.ClockOut)
}

// PeriodStatus is whether a pay period still accepts changes.
type PeriodStatus string

const (
	PeriodOpen   PeriodStatus = "Open"
	PeriodClosed PeriodStatus = "Closed"
)

// PayPeriod is [StartsAt, EndsAt).
type PayPeriod struct {
	ID       PeriodID
	OrgID    oam.OrgID
	StartsAt time.Time
	EndsAt   time.Time
	PayDate  string // YYYY-MM-DD
	Status   PeriodStatus
}

// Contains reports whether t falls inside the period.
func (p PayPeriod) Contains(t time.Time) bool { return !t.Before(p.StartsAt) && t.Before(p.EndsAt) }

// CorrectionStatus is the life cycle of a correction request.
type CorrectionStatus string

const (
	CorrectionPending   CorrectionStatus = "Pending"
	CorrectionApproved  CorrectionStatus = "Approved"
	CorrectionRejected  CorrectionStatus = "Rejected"
	CorrectionWithdrawn CorrectionStatus = "Withdrawn"
)

// Correction asks to fix a punch, or to add one for a shift with none (UC-HR-04).
// The original entry stays unchanged until a reviewer approves.
type Correction struct {
	ID           CorrectionID
	OrgID        oam.OrgID
	MemberID     oam.MemberID
	MemberName   string
	TimeEntryID  EntryID // empty when adding a missing entry
	ShiftID      ShiftID
	ClockIn      time.Time
	ClockOut     time.Time
	Reason       string
	Status       CorrectionStatus
	Adjustment   bool         // the entry is in a closed pay period (UC-HR-04 ext 7.c)
	AssignedToID oam.MemberID // supervisor, or HR Admin when there is none (ext 8.b)
	ReviewerID   oam.MemberID
	SubmittedAt  time.Time
	ReviewedAt   *time.Time

	// Read-only context for reviewers, filled in by the repository: the punch as it is now
	// and the scheduled shift. Not stored on the correction.
	PunchClockIn, PunchClockOut *time.Time
	ShiftStartsAt, ShiftEndsAt  *time.Time
}

// Person is the slice of an OAM member that HR needs.
type Person struct {
	ID     oam.MemberID
	OrgID  oam.OrgID
	Name   string
	Email  string
	Role   oam.Role
	Status oam.Status
	TeamID oam.TeamID
}

// EmployeeSummary is one row of the HR employee list: who they are plus their
// attendance this pay period.
type EmployeeSummary struct {
	Person
	TeamName           string
	ClockedInSince     *time.Time
	HoursThisPeriod    float64
	PendingCorrections int
}

func hoursBetween(a, b time.Time) float64 {
	return round2(b.Sub(a).Hours())
}

func round2(h float64) float64 {
	if h < 0 {
		return -round2(-h)
	}
	return float64(int64(h*100+0.5)) / 100
}
