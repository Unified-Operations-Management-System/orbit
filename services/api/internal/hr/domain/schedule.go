package domain

import (
	"errors"
	"fmt"
	"strings"
	"time"

	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Business rules for building the schedule (SCRUM-14: a supervisor builds and publishes
// the shift schedule for their team).

var (
	ErrShiftStarted   = errors.New("this shift has already started and can't be changed")
	ErrShiftPublished = errors.New("a published shift can't be deleted; change its time instead")
	ErrNotSchedulable = errors.New("shifts can only be scheduled for active employees")
)

// MaxStationLength caps the station name.
const MaxStationLength = 80

// ShiftOverlapError says a shift collides with another shift of the same employee.
type ShiftOverlapError struct {
	With Shift
	Loc  *time.Location
}

func (e ShiftOverlapError) Error() string {
	return fmt.Sprintf("%s already has a shift %s", e.With.MemberName, describeSpan(e.With.StartsAt, e.With.EndsAt, e.Loc))
}

// CanSchedule reports whether a role may build the schedule: supervisors for their team,
// the owner and HR administrators for the company. Employees only read it.
func CanSchedule(role oam.Role) bool { return oam.ScopeOf(role) != oam.ScopeSelf }

// ValidateShift checks a new or changed shift's own fields: it ends after it starts, is no
// longer than the company's longest shift, starts in the future, and has a station.
func ValidateShift(start, end time.Time, station string, now time.Time, s Settings) error {
	switch {
	case !end.After(start):
		return ValidationError{Field: "endsAt", Message: "must be after the start"}
	case end.Sub(start) > s.MaxShift:
		return ValidationError{Field: "endsAt", Message: fmt.Sprintf("a shift can be at most %g hours", s.MaxShift.Hours())}
	case !start.After(now):
		return ValidationError{Field: "startsAt", Message: "must be in the future"}
	case strings.TrimSpace(station) == "":
		return ValidationError{Field: "station", Message: "is required"}
	case len(station) > MaxStationLength:
		return ValidationError{Field: "station", Message: fmt.Sprintf("must be at most %d characters", MaxStationLength)}
	}
	return nil
}

// ShiftsOverlap reports whether [aStart, aEnd) and [bStart, bEnd) share any time.
func ShiftsOverlap(aStart, aEnd, bStart, bEnd time.Time) bool {
	return aStart.Before(bEnd) && aEnd.After(bStart)
}

// ShiftLocked reports whether a shift can no longer be changed or deleted: once clock-in
// opens for it, an employee may already be on the clock.
func ShiftLocked(sh Shift, now time.Time, s Settings) bool {
	return !now.Before(sh.StartsAt.Add(-s.ClockInWindow))
}

// DescribeShiftChange is the note employees see on a published shift that changed
// (UC-HR-03 ext 2.b), e.g. "Moved from Mon 7:00 AM – 3:00 PM to Mon 9:00 AM – 5:00 PM".
// Empty when nothing an employee needs to know about changed.
func DescribeShiftChange(before, after Shift, loc *time.Location) string {
	var parts []string
	if !before.StartsAt.Equal(after.StartsAt) || !before.EndsAt.Equal(after.EndsAt) {
		parts = append(parts, "Moved from "+describeSpan(before.StartsAt, before.EndsAt, loc)+" to "+describeSpan(after.StartsAt, after.EndsAt, loc))
	}
	if before.Station != after.Station {
		parts = append(parts, "Station changed from "+before.Station+" to "+after.Station)
	}
	return strings.Join(parts, "; ")
}

// describeSpan is "Mon 7:00 AM – 3:00 PM" in the company's time zone.
func describeSpan(start, end time.Time, loc *time.Location) string {
	if loc == nil {
		loc = time.UTC
	}
	return start.In(loc).Format("Mon 3:04 PM") + " – " + end.In(loc).Format("3:04 PM")
}
