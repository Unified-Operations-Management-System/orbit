package domain

import (
	"errors"
	"fmt"
	"strings"
	"time"
	_ "time/tzdata" // company time zones work in containers without zoneinfo

	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Errors returned by the HR domain and application layers. Validation problems reuse
// OAM's ValidationError so every area reports them the same way.
var (
	ErrNotFound           = errors.New("not found")
	ErrForbidden          = oam.ErrForbidden
	ErrAlreadyClockedIn   = errors.New("you are already clocked in")
	ErrNotClockedIn       = errors.New("you are not clocked in")
	ErrPeriodClosed       = errors.New("this pay period is closed")
	ErrPendingExists      = errors.New("this entry already has a pending correction")
	ErrNotPending         = errors.New("this correction is no longer pending")
	ErrSelfApproval       = errors.New("you can't review your own request")
	ErrAdjustmentNotAcked = errors.New("confirm the correction will post as an adjustment")
)

// ValidationError is OAM's field error (field + message).
type ValidationError = oam.ValidationError

// TooEarlyError means the clock-in window for the shift hasn't opened (UC-HR-01 ext 4.a).
type TooEarlyError struct{ Earliest time.Time }

func (e TooEarlyError) Error() string {
	return "too early to clock in; you can clock in from " + e.Earliest.UTC().Format(time.RFC3339)
}

// OverlapError means a correction's times overlap another punch (UC-HR-04 ext 7.b).
type OverlapError struct{ With TimeEntry }

func (e OverlapError) Error() string {
	out := "missing clock-out"
	if e.With.ClockOut != nil {
		out = e.With.ClockOut.UTC().Format(time.RFC3339)
	}
	return fmt.Sprintf("these times overlap your entry from %s to %s", e.With.ClockIn.UTC().Format(time.RFC3339), out)
}

// ClockInFlags is what UC-HR-01 step 4 records on a new entry.
type ClockInFlags struct {
	Late        bool // after the shift start (ext 4.b)
	NeedsReview bool // no shift scheduled today (ext 2.b)
}

// CheckClockIn applies the clock-in window to now and today's shift (nil = no shift).
func CheckClockIn(now time.Time, shift *Shift, s Settings) (ClockInFlags, error) {
	if shift == nil {
		return ClockInFlags{NeedsReview: true}, nil
	}
	earliest := shift.StartsAt.Add(-s.ClockInWindow)
	if now.Before(earliest) {
		return ClockInFlags{}, TooEarlyError{Earliest: earliest}
	}
	return ClockInFlags{Late: now.After(shift.StartsAt)}, nil
}

// IsEarlyOut reports whether clocking out at now leaves before the shift ends (UC-HR-02 ext 4.a).
func IsEarlyOut(now time.Time, shift *Shift) bool {
	return shift != nil && now.Before(shift.EndsAt)
}

// ProbablyMissedClockOut reports whether an open entry has run longer than a shift can
// (UC-HR-02 ext 2.b): the employee should request a correction instead.
func ProbablyMissedClockOut(e TimeEntry, now time.Time, s Settings) bool {
	return e.Open() && now.Sub(e.ClockIn) > s.MaxShift
}

// Overlaps reports whether [in, out) overlaps entry e. An open entry runs until now.
func Overlaps(in, out time.Time, e TimeEntry, now time.Time) bool {
	end := now
	if e.ClockOut != nil {
		end = *e.ClockOut
	}
	return in.Before(end) && out.After(e.ClockIn)
}

// ValidateCorrection checks a correction request's own fields (UC-HR-04 step 7).
func ValidateCorrection(in, out time.Time, reason string) error {
	if strings.TrimSpace(reason) == "" {
		return ValidationError{Field: "reason", Message: "is required"}
	}
	if len(strings.TrimSpace(reason)) > 500 {
		return ValidationError{Field: "reason", Message: "must be at most 500 characters"}
	}
	if !out.After(in) {
		return ValidationError{Field: "clockOut", Message: "must be after clockIn"}
	}
	if out.Sub(in) > 24*time.Hour {
		return ValidationError{Field: "clockOut", Message: "must be within 24 hours of clockIn"}
	}
	return nil
}

// WeekStart is local midnight on the Monday of t's week in loc.
func WeekStart(t time.Time, loc *time.Location) time.Time {
	l := t.In(loc)
	offset := (int(l.Weekday()) + 6) % 7 // Monday = 0
	d := time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, loc)
	return d.AddDate(0, 0, -offset)
}

// DayStart is local midnight of t's day in loc.
func DayStart(t time.Time, loc *time.Location) time.Time {
	l := t.In(loc)
	return time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, loc)
}

// SplitOvertime splits hours worked this week into regular and overtime, given the
// hours already worked earlier in the week (UC-HR-02 ext 4.b).
func SplitOvertime(before, worked float64, s Settings) (regular, overtime float64) {
	room := s.OvertimeWeeklyHours - before
	if room < 0 {
		room = 0
	}
	if worked <= room {
		return round2(worked), 0
	}
	return round2(room), round2(worked - room)
}

// SumHours adds up closed entries.
func SumHours(entries []TimeEntry) float64 {
	var h float64
	for _, e := range entries {
		h += e.Hours()
	}
	return round2(h)
}

// CanReview reports whether reviewer may approve or reject c: never their own request
// ("No Self-Approval"); a supervisor reviews their own team; the owner and HR Admin
// review anyone. teamOfRequester is the requester's team.
func CanReview(reviewer oam.Role, reviewerID oam.MemberID, reviewerTeam oam.TeamID, c Correction, teamOfRequester oam.TeamID) error {
	if reviewerID == c.MemberID {
		return ErrSelfApproval
	}
	switch reviewer {
	case oam.RoleOwner, oam.RoleHRAdmin:
		return nil
	case oam.RoleSupervisor:
		if reviewerTeam != "" && reviewerTeam == teamOfRequester {
			return nil
		}
	}
	return ErrForbidden
}
