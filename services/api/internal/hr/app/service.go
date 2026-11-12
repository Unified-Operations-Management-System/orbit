// Package app is the HR application layer: the use cases of Time and Attendance
// (UC-HR-01 Clock In, UC-HR-02 Clock Out, UC-HR-03 View Upcoming Shifts, UC-HR-04
// Request Time Correction) plus the queries behind the HR employee screens. It
// orchestrates the domain and reaches the database only through domain repositories.
package app

import (
	"context"
	"errors"
	"slices"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oamapp "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Principal is the signed-in caller, as authenticated by OAM.
type Principal = oamapp.Principal

// Deps are the Service's collaborators.
type Deps struct {
	Shifts      domain.ShiftRepository
	TimeOff     domain.TimeOffRepository
	Entries     domain.TimeEntryRepository
	Corrections domain.CorrectionRepository
	Periods     domain.PayPeriodRepository
	Settings    domain.SettingsRepository
	People      domain.People
	Tx          oamapp.TxRunner
	Clock       oamapp.Clock
	NewID       func(prefix string) string
}

// Service implements the HR use cases.
type Service struct{ d Deps }

// NewService wires a Service.
func NewService(d Deps) *Service { return &Service{d: d} }

func scopeOf(p Principal) domain.Scope {
	return domain.Scope{OrgID: p.OrgID, Kind: oam.ScopeOf(p.Role), ViewerID: p.MemberID, TeamID: p.TeamID}
}

// canSee applies the BR-OAM-R09 scope to one person.
func canSee(p Principal, person domain.Person) bool {
	switch oam.ScopeOf(p.Role) {
	case oam.ScopeCompany:
		return true
	case oam.ScopeTeam:
		return person.ID == p.MemberID || (p.TeamID != "" && person.TeamID == p.TeamID)
	default:
		return person.ID == p.MemberID
	}
}

// person returns the member if the caller may see them, else ErrNotFound (hiding
// whether the member exists).
func (s *Service) person(ctx context.Context, p Principal, id oam.MemberID) (domain.Person, error) {
	person, err := s.d.People.Get(ctx, p.OrgID, id)
	if err != nil {
		return person, err
	}
	if !canSee(p, person) {
		return person, domain.ErrNotFound
	}
	return person, nil
}

// ---------- UC-HR-03 View Upcoming Shifts ----------

// ScheduleQuery narrows a schedule. Zero From/To mean this week and next.
type ScheduleQuery struct {
	From, To time.Time
	MemberID oam.MemberID
	TeamID   oam.TeamID
}

// Schedule is shifts plus time off in a range.
type Schedule struct {
	From, To time.Time
	Shifts   []domain.Shift
	TimeOff  []domain.TimeOff
}

// Schedule lists the shifts and time off the caller may see. Employees see published
// shifts only; supervisors and HR also see drafts.
func (s *Service) Schedule(ctx context.Context, p Principal, q ScheduleQuery) (Schedule, error) {
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return Schedule{}, err
	}
	from, to, err := dateRange(q.From, q.To, domain.WeekStart(s.d.Clock.Now(), settings.Timezone), 14)
	if err != nil {
		return Schedule{}, err
	}
	f := domain.ShiftFilter{
		Scope: scopeOf(p), MemberID: q.MemberID, TeamID: q.TeamID, From: from, To: to,
		PublishedOnly: oam.ScopeOf(p.Role) == oam.ScopeSelf,
	}
	shifts, err := s.d.Shifts.List(ctx, f)
	if err != nil {
		return Schedule{}, err
	}
	off, err := s.d.TimeOff.List(ctx, f)
	if err != nil {
		return Schedule{}, err
	}
	return Schedule{From: from, To: to, Shifts: shifts, TimeOff: off}, nil
}

// Shift returns one shift (UC-HR-03 step 4).
func (s *Service) Shift(ctx context.Context, p Principal, id domain.ShiftID) (domain.Shift, error) {
	sh, err := s.d.Shifts.Get(ctx, p.OrgID, id)
	if err != nil {
		return sh, err
	}
	if _, err := s.person(ctx, p, sh.MemberID); err != nil {
		return domain.Shift{}, err
	}
	if !sh.Published() && oam.ScopeOf(p.Role) == oam.ScopeSelf {
		return domain.Shift{}, domain.ErrNotFound
	}
	return sh, nil
}

// ---------- UC-HR-01 Clock In / UC-HR-02 Clock Out ----------

// ClockStatus is what the Time Clock screen shows (UC-HR-01 step 2, UC-HR-02 step 2).
type ClockStatus struct {
	Now             time.Time
	Open            *domain.TimeEntry
	Shift           *domain.Shift // today's shift, or the open entry's shift
	Settings        domain.Settings
	Period          *domain.PayPeriod
	HoursThisWeek   float64 // closed entries since Monday
	HoursThisPeriod float64
	MissedClockOut  bool // the open entry is longer than a shift can be (UC-HR-02 ext 2.b)
	EarliestClockIn *time.Time
}

// todayShift is the caller's published shift today: the first that hasn't ended, else
// today's last one, else nil.
func (s *Service) todayShift(ctx context.Context, p Principal, now time.Time, settings domain.Settings) (*domain.Shift, error) {
	day := domain.DayStart(now, settings.Timezone)
	shifts, err := s.d.Shifts.List(ctx, domain.ShiftFilter{
		Scope: scopeOf(p), MemberID: p.MemberID, From: day, To: day.AddDate(0, 0, 1), PublishedOnly: true,
	})
	if err != nil || len(shifts) == 0 {
		return nil, err
	}
	for i := range shifts {
		if shifts[i].EndsAt.After(now) {
			return &shifts[i], nil
		}
	}
	return &shifts[len(shifts)-1], nil
}

// ClockStatus returns the caller's punch status, today's shift and their hours.
func (s *Service) ClockStatus(ctx context.Context, p Principal) (ClockStatus, error) {
	now := s.d.Clock.Now()
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return ClockStatus{}, err
	}
	st := ClockStatus{Now: now, Settings: settings}

	open, err := s.d.Entries.OpenFor(ctx, p.OrgID, p.MemberID)
	switch {
	case err == nil:
		st.Open = &open
		st.MissedClockOut = domain.ProbablyMissedClockOut(open, now, settings)
		if open.ShiftID != "" {
			if sh, err := s.d.Shifts.Get(ctx, p.OrgID, open.ShiftID); err == nil {
				st.Shift = &sh
			}
		}
	case !errors.Is(err, domain.ErrNotFound):
		return st, err
	}
	if st.Shift == nil && st.Open == nil {
		if st.Shift, err = s.todayShift(ctx, p, now, settings); err != nil {
			return st, err
		}
	}
	if st.Shift != nil {
		e := st.Shift.StartsAt.Add(-settings.ClockInWindow)
		st.EarliestClockIn = &e
	}

	week, err := s.d.Entries.List(ctx, domain.EntryFilter{Scope: scopeOf(p), MemberID: p.MemberID, From: domain.WeekStart(now, settings.Timezone), To: now.Add(time.Second)})
	if err != nil {
		return st, err
	}
	st.HoursThisWeek = domain.SumHours(week)

	if period, err := s.d.Periods.At(ctx, p.OrgID, now); err == nil {
		st.Period = &period
		entries, err := s.d.Entries.List(ctx, domain.EntryFilter{Scope: scopeOf(p), MemberID: p.MemberID, From: period.StartsAt, To: period.EndsAt})
		if err != nil {
			return st, err
		}
		st.HoursThisPeriod = domain.SumHours(entries)
	} else if !errors.Is(err, domain.ErrNotFound) {
		return st, err
	}
	return st, nil
}

// checkPeriodOpen refuses changes to a closed pay period ("Period Lock").
func (s *Service) checkPeriodOpen(ctx context.Context, org oam.OrgID, t time.Time) error {
	period, err := s.d.Periods.At(ctx, org, t)
	if errors.Is(err, domain.ErrNotFound) {
		return nil // no period defined yet: nothing to lock
	}
	if err != nil {
		return err
	}
	if period.Status == domain.PeriodClosed {
		return domain.ErrPeriodClosed
	}
	return nil
}

// ClockIn starts a time entry now (UC-HR-01 steps 3-7).
func (s *Service) ClockIn(ctx context.Context, p Principal) (domain.TimeEntry, error) {
	var entry domain.TimeEntry
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		now := s.d.Clock.Now()
		if _, err := s.d.Entries.OpenFor(ctx, p.OrgID, p.MemberID); err == nil {
			return domain.ErrAlreadyClockedIn // ext 2.a
		} else if !errors.Is(err, domain.ErrNotFound) {
			return err
		}
		settings, err := s.d.Settings.Get(ctx, p.OrgID)
		if err != nil {
			return err
		}
		shift, err := s.todayShift(ctx, p, now, settings)
		if err != nil {
			return err
		}
		if shift != nil && !shift.EndsAt.After(now) {
			shift = nil // today's shift is over: this is an unscheduled punch
		}
		flags, err := domain.CheckClockIn(now, shift, settings) // step 4, ext 2.b, 4.a, 4.b
		if err != nil {
			return err
		}
		if err := s.checkPeriodOpen(ctx, p.OrgID, now); err != nil {
			return err
		}
		entry = domain.TimeEntry{
			ID: domain.EntryID(s.d.NewID("te")), OrgID: p.OrgID, MemberID: p.MemberID, ClockIn: now,
			Late: flags.Late, NeedsReview: flags.NeedsReview, Source: domain.SourceClock,
		}
		if shift != nil {
			entry.ShiftID = shift.ID
		}
		return s.d.Entries.Save(ctx, entry) // step 7
	})
	return entry, err
}

// ClockOut closes the caller's open entry now (UC-HR-02 steps 3-7).
func (s *Service) ClockOut(ctx context.Context, p Principal) (domain.TimeEntry, error) {
	var entry domain.TimeEntry
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		now := s.d.Clock.Now()
		var err error
		entry, err = s.d.Entries.OpenFor(ctx, p.OrgID, p.MemberID)
		if errors.Is(err, domain.ErrNotFound) {
			return domain.ErrNotClockedIn // ext 2.a
		}
		if err != nil {
			return err
		}
		var shift *domain.Shift
		if entry.ShiftID != "" {
			if sh, err := s.d.Shifts.Get(ctx, p.OrgID, entry.ShiftID); err == nil {
				shift = &sh
			}
		}
		entry.ClockOut = &now
		entry.EarlyOut = domain.IsEarlyOut(now, shift) // ext 4.a
		return s.d.Entries.Save(ctx, entry)            // step 6
	})
	return entry, err
}

// ---------- Timecard (UC-HR-04 steps 1-2) ----------

// EntryQuery narrows a time-entry list.
type EntryQuery struct {
	From, To time.Time
	MemberID oam.MemberID
	TeamID   oam.TeamID
}

// Entries lists the punches the caller may see.
func (s *Service) Entries(ctx context.Context, p Principal, q EntryQuery) ([]domain.TimeEntry, error) {
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return nil, err
	}
	from, to, err := dateRange(q.From, q.To, domain.WeekStart(s.d.Clock.Now(), settings.Timezone), 7)
	if err != nil {
		return nil, err
	}
	return s.d.Entries.List(ctx, domain.EntryFilter{Scope: scopeOf(p), MemberID: q.MemberID, TeamID: q.TeamID, From: from, To: to})
}

// Timecard is one member's pay period: punches, shifts they missed, correction
// requests and the hours split into regular and overtime per week.
type Timecard struct {
	Person       domain.Person
	Period       domain.PayPeriod
	Entries      []domain.TimeEntry
	MissedShifts []domain.Shift
	Corrections  []domain.Correction
	Hours        float64
	Regular      float64
	Overtime     float64
}

// Timecard returns a member's pay period (default: the caller, the current period).
func (s *Service) Timecard(ctx context.Context, p Principal, periodID domain.PeriodID, memberID oam.MemberID) (Timecard, error) {
	if memberID == "" {
		memberID = p.MemberID
	}
	person, err := s.person(ctx, p, memberID)
	if err != nil {
		return Timecard{}, err
	}
	now := s.d.Clock.Now()
	var period domain.PayPeriod
	if periodID != "" {
		period, err = s.d.Periods.Get(ctx, p.OrgID, periodID)
	} else {
		period, err = s.d.Periods.At(ctx, p.OrgID, now)
	}
	if err != nil {
		return Timecard{}, err
	}
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return Timecard{}, err
	}
	sc := scopeOf(p)
	entries, err := s.d.Entries.List(ctx, domain.EntryFilter{Scope: sc, MemberID: memberID, From: period.StartsAt, To: period.EndsAt})
	if err != nil {
		return Timecard{}, err
	}
	shifts, err := s.d.Shifts.List(ctx, domain.ShiftFilter{Scope: sc, MemberID: memberID, From: period.StartsAt, To: period.EndsAt, PublishedOnly: true})
	if err != nil {
		return Timecard{}, err
	}
	corrections, err := s.d.Corrections.List(ctx, domain.CorrectionFilter{Scope: sc, MemberID: memberID})
	if err != nil {
		return Timecard{}, err
	}

	tc := Timecard{Person: person, Period: period, Entries: entries}
	for _, sh := range shifts {
		if sh.EndsAt.After(now) {
			continue // hasn't happened yet
		}
		worked := slices.ContainsFunc(entries, func(e domain.TimeEntry) bool {
			return e.ShiftID == sh.ID || domain.Overlaps(sh.StartsAt, sh.EndsAt, e, now)
		})
		if !worked {
			tc.MissedShifts = append(tc.MissedShifts, sh)
		}
	}
	for _, c := range corrections {
		if c.Status == domain.CorrectionPending || period.Contains(c.ClockIn) {
			tc.Corrections = append(tc.Corrections, c)
		}
	}
	// Overtime is weekly: split each week of the period separately.
	byWeek := map[time.Time]float64{}
	for _, e := range entries {
		byWeek[domain.WeekStart(e.ClockIn, settings.Timezone)] += e.Hours()
	}
	for _, h := range byWeek {
		reg, ot := domain.SplitOvertime(0, h, settings)
		tc.Regular += reg
		tc.Overtime += ot
	}
	tc.Hours = domain.SumHours(entries)
	return tc, nil
}

// PayPeriods lists the company's pay periods, oldest first.
func (s *Service) PayPeriods(ctx context.Context, p Principal) ([]domain.PayPeriod, error) {
	return s.d.Periods.List(ctx, p.OrgID)
}

// ---------- UC-HR-04 Request Time Correction ----------

// CorrectionQuery narrows the correction list.
type CorrectionQuery struct {
	Status       domain.CorrectionStatus
	MemberID     oam.MemberID
	AssignedToMe bool
}

// Corrections lists the requests the caller may see, newest first.
func (s *Service) Corrections(ctx context.Context, p Principal, q CorrectionQuery) ([]domain.Correction, error) {
	f := domain.CorrectionFilter{Scope: scopeOf(p), MemberID: q.MemberID, Status: q.Status}
	if q.AssignedToMe {
		f.AssignedTo = p.MemberID
	}
	return s.d.Corrections.List(ctx, f)
}

// CorrectionInput is a correction request as submitted (UC-HR-04 steps 3-6).
type CorrectionInput struct {
	TimeEntryID           domain.EntryID // the punch to fix
	ShiftID               domain.ShiftID // or the shift with no punch (ext 3.a)
	ClockIn, ClockOut     time.Time
	Reason                string
	AcknowledgeAdjustment bool // ext 7.c: the employee accepted an adjustment to a closed period
}

// RequestCorrection saves a pending correction for the caller and routes it to their
// reviewer (UC-HR-04 steps 7-9). The original entry is not changed.
func (s *Service) RequestCorrection(ctx context.Context, p Principal, in CorrectionInput) (domain.Correction, error) {
	if err := domain.ValidateCorrection(in.ClockIn, in.ClockOut, in.Reason); err != nil { // ext 5.a, 7.a
		return domain.Correction{}, err
	}
	now := s.d.Clock.Now()
	c := domain.Correction{
		ID: domain.CorrectionID(s.d.NewID("tc")), OrgID: p.OrgID, MemberID: p.MemberID, MemberName: p.Name,
		ClockIn: in.ClockIn.UTC(), ClockOut: in.ClockOut.UTC(), Reason: in.Reason, Status: domain.CorrectionPending, SubmittedAt: now,
	}
	if in.ClockOut.After(now.Add(time.Minute)) {
		return c, domain.ValidationError{Field: "clockOut", Message: "can't be in the future"}
	}

	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		switch {
		case in.TimeEntryID != "":
			e, err := s.d.Entries.Get(ctx, p.OrgID, in.TimeEntryID)
			if errors.Is(err, domain.ErrNotFound) || (err == nil && e.MemberID != p.MemberID) {
				return domain.ErrNotFound
			}
			if err != nil {
				return err
			}
			c.TimeEntryID, c.ShiftID = e.ID, e.ShiftID // ShiftID is empty for an unscheduled punch
		case in.ShiftID != "":
			sh, err := s.d.Shifts.Get(ctx, p.OrgID, in.ShiftID)
			if errors.Is(err, domain.ErrNotFound) || (err == nil && sh.MemberID != p.MemberID) {
				return domain.ErrNotFound
			}
			if err != nil {
				return err
			}
			c.ShiftID = sh.ID
		default:
			return domain.ValidationError{Field: "timeEntryId", Message: "give the entry to fix, or shiftId to add a missing entry"}
		}

		// ext 7.b: the new times must not overlap the member's other punches.
		near, err := s.d.Entries.List(ctx, domain.EntryFilter{Scope: scopeOf(p), MemberID: p.MemberID,
			From: c.ClockIn.Add(-24 * time.Hour), To: c.ClockOut.Add(24 * time.Hour)})
		if err != nil {
			return err
		}
		for _, e := range near {
			if e.ID != c.TimeEntryID && domain.Overlaps(c.ClockIn, c.ClockOut, e, now) {
				return domain.OverlapError{With: e}
			}
		}

		// ext 7.c: a closed pay period is fixed by an adjustment in the current one.
		if err := s.checkPeriodOpen(ctx, p.OrgID, c.ClockIn); errors.Is(err, domain.ErrPeriodClosed) {
			if !in.AcknowledgeAdjustment {
				return domain.ErrAdjustmentNotAcked
			}
			c.Adjustment = true
		} else if err != nil {
			return err
		}

		// Step 8 / ext 8.b: route to the team's supervisor, else HR, never to the requester.
		reviewer, err := s.d.People.Reviewer(ctx, p.OrgID, p.TeamID)
		if err == nil && reviewer == p.MemberID {
			reviewer, err = s.d.People.Reviewer(ctx, p.OrgID, "")
		}
		if err == nil && reviewer != p.MemberID {
			c.AssignedToID = reviewer
		} else if err != nil && !errors.Is(err, domain.ErrNotFound) {
			return err
		}
		return s.d.Corrections.Save(ctx, c) // ext 3.b: a second pending request is ErrPendingExists
	})
	return c, err
}

// WithdrawCorrection cancels the caller's own pending request (UC-HR-04 ext 3.b).
func (s *Service) WithdrawCorrection(ctx context.Context, p Principal, id domain.CorrectionID) (domain.Correction, error) {
	var c domain.Correction
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		var err error
		c, err = s.d.Corrections.Get(ctx, p.OrgID, id)
		if err != nil {
			return err
		}
		if c.MemberID != p.MemberID {
			return domain.ErrNotFound
		}
		if c.Status != domain.CorrectionPending {
			return domain.ErrNotPending
		}
		c.Status = domain.CorrectionWithdrawn
		return s.d.Corrections.Save(ctx, c)
	})
	return c, err
}

// ReviewCorrection approves or rejects a pending request (Approve Timecards). Approving
// writes the corrected times onto the entry, or adds the missing entry, in the same
// transaction as the status change.
func (s *Service) ReviewCorrection(ctx context.Context, p Principal, id domain.CorrectionID, approve bool) (domain.Correction, error) {
	var c domain.Correction
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		var err error
		c, err = s.d.Corrections.Get(ctx, p.OrgID, id)
		if err != nil {
			return err
		}
		requester, err := s.person(ctx, p, c.MemberID)
		if err != nil {
			return err
		}
		if err := domain.CanReview(p.Role, p.MemberID, p.TeamID, c, requester.TeamID); err != nil {
			return err
		}
		if c.Status != domain.CorrectionPending {
			return domain.ErrNotPending
		}
		now := s.d.Clock.Now()
		c.ReviewerID, c.ReviewedAt = p.MemberID, &now
		if !approve {
			c.Status = domain.CorrectionRejected
			return s.d.Corrections.Save(ctx, c)
		}

		var entry domain.TimeEntry
		if c.TimeEntryID != "" {
			if entry, err = s.d.Entries.Get(ctx, p.OrgID, c.TimeEntryID); err != nil {
				return err
			}
		} else {
			entry = domain.TimeEntry{ID: domain.EntryID(s.d.NewID("te")), OrgID: c.OrgID, MemberID: c.MemberID, ShiftID: c.ShiftID}
		}
		out := c.ClockOut
		entry.ClockIn, entry.ClockOut, entry.Source, entry.NeedsReview = c.ClockIn, &out, domain.SourceCorrection, false
		entry.Late, entry.EarlyOut = false, false
		if entry.ShiftID != "" {
			if sh, err := s.d.Shifts.Get(ctx, p.OrgID, entry.ShiftID); err == nil {
				entry.Late = entry.ClockIn.After(sh.StartsAt)
				entry.EarlyOut = domain.IsEarlyOut(out, &sh)
			}
		}
		if err := s.d.Entries.Save(ctx, entry); err != nil {
			return err
		}
		c.TimeEntryID, c.Status = entry.ID, domain.CorrectionApproved
		return s.d.Corrections.Save(ctx, c)
	})
	return c, err
}

// ---------- Employees (HR employee list with filters) ----------

// EmployeeQuery filters the employee list.
type EmployeeQuery struct {
	TeamID    oam.TeamID
	Status    oam.Status
	Role      oam.Role
	Query     string
	ClockedIn *bool
}

// Employees lists the people the caller may see with their attendance this pay period.
func (s *Service) Employees(ctx context.Context, p Principal, q EmployeeQuery) ([]domain.EmployeeSummary, *domain.PayPeriod, error) {
	now := s.d.Clock.Now()
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return nil, nil, err
	}
	f := domain.EmployeeFilter{Scope: scopeOf(p), TeamID: q.TeamID, Status: q.Status, Role: q.Role, Query: q.Query, ClockedIn: q.ClockedIn}
	var period *domain.PayPeriod
	if pp, err := s.d.Periods.At(ctx, p.OrgID, now); err == nil {
		period = &pp
		f.PeriodStart, f.PeriodEnd = pp.StartsAt, pp.EndsAt
	} else if errors.Is(err, domain.ErrNotFound) {
		f.PeriodStart = domain.WeekStart(now, settings.Timezone)
		f.PeriodEnd = f.PeriodStart.AddDate(0, 0, 7)
	} else {
		return nil, nil, err
	}
	out, err := s.d.People.Employees(ctx, f)
	return out, period, err
}

// dateRange fills a missing range with defaultDays from defaultFrom and checks it.
func dateRange(from, to, defaultFrom time.Time, defaultDays int) (time.Time, time.Time, error) {
	if from.IsZero() {
		from = defaultFrom
	}
	if to.IsZero() {
		to = from.AddDate(0, 0, defaultDays)
	}
	if !to.After(from) {
		return from, to, domain.ValidationError{Field: "to", Message: "must be after from"}
	}
	if to.Sub(from) > 93*24*time.Hour {
		return from, to, domain.ValidationError{Field: "to", Message: "range can be at most 93 days"}
	}
	return from, to, nil
}
