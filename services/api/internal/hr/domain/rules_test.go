package domain_test

import (
	"errors"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

func TestCheckClockIn(t *testing.T) {
	s := domain.DefaultSettings()
	start := time.Date(2026, 11, 16, 12, 0, 0, 0, time.UTC)
	shift := &domain.Shift{StartsAt: start, EndsAt: start.Add(8 * time.Hour)}

	var early domain.TooEarlyError
	if _, err := domain.CheckClockIn(start.Add(-16*time.Minute), shift, s); !errors.As(err, &early) || !early.Earliest.Equal(start.Add(-15*time.Minute)) {
		t.Fatalf("16 minutes early: %v", err)
	}
	if f, err := domain.CheckClockIn(start.Add(-15*time.Minute), shift, s); err != nil || f.Late {
		t.Fatalf("window edge: %+v %v", f, err)
	}
	if f, _ := domain.CheckClockIn(start.Add(time.Minute), shift, s); !f.Late {
		t.Fatal("one minute after the start is late")
	}
	if f, _ := domain.CheckClockIn(start, nil, s); !f.NeedsReview {
		t.Fatal("no shift needs review")
	}
}

func TestSplitOvertime(t *testing.T) {
	s := domain.DefaultSettings() // 40 hours
	for _, c := range []struct{ before, worked, reg, ot float64 }{
		{0, 8, 8, 0},
		{33.5, 8, 6.5, 1.5},
		{40, 8, 0, 8},
		{45, 2, 0, 2},
	} {
		if reg, ot := domain.SplitOvertime(c.before, c.worked, s); reg != c.reg || ot != c.ot {
			t.Errorf("before %v worked %v: got %v/%v, want %v/%v", c.before, c.worked, reg, ot, c.reg, c.ot)
		}
	}
}

func TestWeekStart_Toronto(t *testing.T) {
	loc, _ := time.LoadLocation("America/Toronto")
	// Sunday Nov 1 2026, 23:30 local (after the switch back to EST) is still last week.
	sun := time.Date(2026, 11, 2, 4, 30, 0, 0, time.UTC)
	if got := domain.WeekStart(sun, loc); got.Format("2006-01-02 15:04 MST") != "2026-10-26 00:00 EDT" {
		t.Fatalf("Sunday night: %v", got)
	}
	mon := time.Date(2026, 11, 2, 5, 0, 0, 0, time.UTC) // Monday 00:00 EST
	if got := domain.WeekStart(mon, loc); !got.Equal(mon) {
		t.Fatalf("Monday midnight: %v", got)
	}
}

func TestCanReview(t *testing.T) {
	c := domain.Correction{MemberID: "m-3"}
	cases := []struct {
		role oam.Role
		id   oam.MemberID
		team oam.TeamID
		want error
	}{
		{oam.RoleSupervisor, "m-2", "team-line-1", nil},
		{oam.RoleSupervisor, "m-9", "team-line-2", domain.ErrForbidden},
		{oam.RoleHRAdmin, "m-4", "", nil},
		{oam.RoleOwner, "m-1", "", nil},
		{oam.RoleEmployee, "m-5", "team-line-1", domain.ErrForbidden},
		{oam.RoleEmployee, "m-3", "team-line-1", domain.ErrSelfApproval},
	}
	for _, tc := range cases {
		if err := domain.CanReview(tc.role, tc.id, tc.team, c, "team-line-1"); !errors.Is(err, tc.want) {
			t.Errorf("%s %s: got %v, want %v", tc.role, tc.id, err, tc.want)
		}
	}
}
