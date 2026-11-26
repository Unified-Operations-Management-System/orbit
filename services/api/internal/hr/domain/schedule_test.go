package domain_test

import (
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

func TestValidateShift(t *testing.T) {
	s := domain.DefaultSettings()
	now := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC)
	start := now.Add(24 * time.Hour)
	field := func(err error) string {
		var ve domain.ValidationError
		if !errors.As(err, &ve) {
			return ""
		}
		return ve.Field
	}
	cases := []struct {
		name       string
		start, end time.Time
		station    string
		want       string
	}{
		{"ok", start, start.Add(8 * time.Hour), "Packing Line 2", ""},
		{"ends before it starts", start, start, "Packing Line 2", "endsAt"},
		{"longer than the longest shift", start, start.Add(13 * time.Hour), "Packing Line 2", "endsAt"},
		{"in the past", now.Add(-time.Hour), now.Add(7 * time.Hour), "Packing Line 2", "startsAt"},
		{"no station", start, start.Add(8 * time.Hour), "  ", "station"},
		{"station too long", start, start.Add(8 * time.Hour), strings.Repeat("x", domain.MaxStationLength+1), "station"},
	}
	for _, c := range cases {
		if got := field(domain.ValidateShift(c.start, c.end, c.station, now, s)); got != c.want {
			t.Errorf("%s: field %q, want %q", c.name, got, c.want)
		}
	}
}

func TestShiftsOverlap(t *testing.T) {
	a := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC)
	if !domain.ShiftsOverlap(a, a.Add(8*time.Hour), a.Add(7*time.Hour), a.Add(9*time.Hour)) {
		t.Error("an hour of overlap")
	}
	if domain.ShiftsOverlap(a, a.Add(8*time.Hour), a.Add(8*time.Hour), a.Add(16*time.Hour)) {
		t.Error("back-to-back shifts don't overlap")
	}
}

func TestShiftLocked(t *testing.T) {
	s := domain.DefaultSettings()
	start := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC)
	sh := domain.Shift{StartsAt: start, EndsAt: start.Add(8 * time.Hour)}
	if domain.ShiftLocked(sh, start.Add(-16*time.Minute), s) {
		t.Error("open before clock-in opens")
	}
	if !domain.ShiftLocked(sh, start.Add(-15*time.Minute), s) {
		t.Error("locked once clock-in opens")
	}
}

func TestDescribeShiftChange(t *testing.T) {
	loc, _ := time.LoadLocation("America/Toronto")
	start := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC) // Mon 7:00 AM in Toronto
	before := domain.Shift{StartsAt: start, EndsAt: start.Add(8 * time.Hour), Station: "Mixing Line 1"}

	moved := before
	moved.StartsAt, moved.EndsAt = start.Add(2*time.Hour), start.Add(10*time.Hour)
	if got, want := domain.DescribeShiftChange(before, moved, loc), "Moved from Mon 7:00 AM – 3:00 PM to Mon 9:00 AM – 5:00 PM"; got != want {
		t.Errorf("moved: %q, want %q", got, want)
	}

	station := before
	station.Station = "Shipping Dock"
	if got, want := domain.DescribeShiftChange(before, station, loc), "Station changed from Mixing Line 1 to Shipping Dock"; got != want {
		t.Errorf("station: %q, want %q", got, want)
	}

	notes := before
	notes.Notes = "Bring steel-toe boots"
	if got := domain.DescribeShiftChange(before, notes, loc); got != "" {
		t.Errorf("notes only: %q, want empty", got)
	}
}

func TestCanSchedule(t *testing.T) {
	for role, want := range map[oam.Role]bool{oam.RoleOwner: true, oam.RoleHRAdmin: true, oam.RoleSupervisor: true, oam.RoleEmployee: false} {
		if got := domain.CanSchedule(role); got != want {
			t.Errorf("%s: %v, want %v", role, got, want)
		}
	}
}
