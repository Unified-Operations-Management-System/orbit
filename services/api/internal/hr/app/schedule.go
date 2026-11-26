package app

import (
	"context"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// ---------- SCRUM-14 Supervisor builds and publishes the shift schedule ----------
//
// Supervisors schedule their own team, the owner and HR administrators the company
// (BR-OAM-R09). New shifts are drafts that only schedulers see until they are published;
// employees then see them in View Upcoming Shifts (UC-HR-03). Changing a published shift
// leaves a note that the employee's app shows as "Updated".

// ShiftInput is a new shift.
type ShiftInput struct {
	MemberID         oam.MemberID
	StartsAt, EndsAt time.Time
	Station, Notes   string
}

// ShiftChange edits a shift; nil fields stay as they are.
type ShiftChange struct {
	StartsAt, EndsAt *time.Time
	Station, Notes   *string
}

// PublishQuery picks the drafts to publish: those starting in [From, To), optionally one team.
type PublishQuery struct {
	From, To time.Time
	TeamID   oam.TeamID
}

// CreateShift adds a draft shift for an employee the caller may schedule.
func (s *Service) CreateShift(ctx context.Context, p Principal, in ShiftInput) (domain.Shift, error) {
	if !domain.CanSchedule(p.Role) {
		return domain.Shift{}, domain.ErrForbidden
	}
	now := s.d.Clock.Now()
	sh := domain.Shift{
		ID: domain.ShiftID(s.d.NewID("sh")), OrgID: p.OrgID, MemberID: in.MemberID,
		StartsAt: in.StartsAt.UTC(), EndsAt: in.EndsAt.UTC(), Station: in.Station, Notes: in.Notes, UpdatedAt: now,
	}
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		person, err := s.person(ctx, p, in.MemberID) // 404 outside the caller's team
		if err != nil {
			return err
		}
		if person.Status != oam.StatusActive {
			return domain.ErrNotSchedulable
		}
		sh.MemberName, sh.TeamID = person.Name, person.TeamID
		return s.checkAndSave(ctx, p, sh, now)
	})
	return sh, err
}

// UpdateShift changes a shift's time, station or notes before it starts.
func (s *Service) UpdateShift(ctx context.Context, p Principal, id domain.ShiftID, ch ShiftChange) (domain.Shift, error) {
	if !domain.CanSchedule(p.Role) {
		return domain.Shift{}, domain.ErrForbidden
	}
	now := s.d.Clock.Now()
	var sh domain.Shift
	err := s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		before, err := s.Shift(ctx, p, id) // 404 outside the caller's team
		if err != nil {
			return err
		}
		settings, err := s.d.Settings.Get(ctx, p.OrgID)
		if err != nil {
			return err
		}
		if domain.ShiftLocked(before, now, settings) {
			return domain.ErrShiftStarted
		}
		sh = before
		if ch.StartsAt != nil {
			sh.StartsAt = ch.StartsAt.UTC()
		}
		if ch.EndsAt != nil {
			sh.EndsAt = ch.EndsAt.UTC()
		}
		if ch.Station != nil {
			sh.Station = *ch.Station
		}
		if ch.Notes != nil {
			sh.Notes = *ch.Notes
		}
		sh.UpdatedAt = now
		// UC-HR-03 ext 2.b: employees see what changed on a published shift.
		if sh.Published() {
			if note := domain.DescribeShiftChange(before, sh, settings.Timezone); note != "" {
				sh.ChangeNote = note
			}
		}
		return s.checkAndSave(ctx, p, sh, now)
	})
	return sh, err
}

// DeleteShift removes a draft shift. Published shifts are moved instead, so the employee
// is told about the change.
func (s *Service) DeleteShift(ctx context.Context, p Principal, id domain.ShiftID) error {
	if !domain.CanSchedule(p.Role) {
		return domain.ErrForbidden
	}
	return s.d.Tx.WithinTx(ctx, func(ctx context.Context) error {
		sh, err := s.Shift(ctx, p, id)
		if err != nil {
			return err
		}
		if sh.Published() {
			return domain.ErrShiftPublished
		}
		return s.d.Shifts.Delete(ctx, p.OrgID, id)
	})
}

// PublishShifts makes the caller's drafts in a date range visible to employees.
func (s *Service) PublishShifts(ctx context.Context, p Principal, q PublishQuery) (int, error) {
	if !domain.CanSchedule(p.Role) {
		return 0, domain.ErrForbidden
	}
	if q.From.IsZero() {
		return 0, domain.ValidationError{Field: "from", Message: "is required"}
	}
	from, to, err := dateRange(q.From, q.To, q.From, 7) // default: the week starting at from
	if err != nil {
		return 0, err
	}
	return s.d.Shifts.Publish(ctx, domain.ShiftFilter{Scope: scopeOf(p), TeamID: q.TeamID, From: from, To: to}, s.d.Clock.Now())
}

// checkAndSave applies the shift rules that need the database (no overlap with the same
// employee's other shifts) and saves.
func (s *Service) checkAndSave(ctx context.Context, p Principal, sh domain.Shift, now time.Time) error {
	settings, err := s.d.Settings.Get(ctx, p.OrgID)
	if err != nil {
		return err
	}
	if err := domain.ValidateShift(sh.StartsAt, sh.EndsAt, sh.Station, now, settings); err != nil {
		return err
	}
	others, err := s.d.Shifts.List(ctx, domain.ShiftFilter{
		Scope: domain.Scope{OrgID: p.OrgID, Kind: oam.ScopeCompany}, MemberID: sh.MemberID, From: sh.StartsAt, To: sh.EndsAt,
	})
	if err != nil {
		return err
	}
	for _, o := range others {
		if o.ID != sh.ID && domain.ShiftsOverlap(sh.StartsAt, sh.EndsAt, o.StartsAt, o.EndsAt) {
			return domain.ShiftOverlapError{With: o, Loc: settings.Timezone}
		}
	}
	return s.d.Shifts.Save(ctx, sh)
}
