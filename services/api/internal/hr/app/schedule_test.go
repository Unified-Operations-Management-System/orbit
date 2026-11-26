package app_test

import (
	"context"
	"errors"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// SCRUM-14: a supervisor builds and publishes the shift schedule for their team.

func TestCreateShift_DraftUntilPublished(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(1, 9, 0)
	wed := f.monday.AddDate(0, 0, 23).Add(12 * time.Hour) // Wednesday in three weeks, 7 AM Toronto

	sh, err := f.svc.CreateShift(ctx, f.who["supervisor"], app.ShiftInput{
		MemberID: "m-3", StartsAt: wed, EndsAt: wed.Add(8 * time.Hour), Station: "Mixing Line 1", Notes: "Cover for Riley",
	})
	if err != nil {
		t.Fatal(err)
	}
	if sh.Published() || sh.TeamID != "team-line-1" || sh.MemberName != "Sam Patel" {
		t.Fatalf("new shift: %+v", sh)
	}

	week := app.ScheduleQuery{From: f.monday.AddDate(0, 0, 21), To: f.monday.AddDate(0, 0, 28)}
	mine, _ := f.svc.Schedule(ctx, f.who["employee"], week)
	if slices.Contains(shiftIDs(mine.Shifts), sh.ID) {
		t.Fatal("employees must not see a draft")
	}

	n, err := f.svc.PublishShifts(ctx, f.who["supervisor"], app.PublishQuery{From: week.From, To: week.To})
	if err != nil || n != 1 {
		t.Fatalf("publish: %d %v", n, err)
	}
	mine, _ = f.svc.Schedule(ctx, f.who["employee"], week)
	if !slices.Contains(shiftIDs(mine.Shifts), sh.ID) {
		t.Fatal("employees see the shift once it's published")
	}
	if n, _ := f.svc.PublishShifts(ctx, f.who["supervisor"], app.PublishQuery{From: week.From, To: week.To}); n != 0 {
		t.Fatalf("publishing again changes nothing, got %d", n)
	}
}

func TestCreateShift_Rules(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(1, 9, 0)
	day := f.monday.AddDate(0, 0, 22).Add(12 * time.Hour)
	shift := func(member string, start time.Time, hours int) app.ShiftInput {
		return app.ShiftInput{MemberID: oam.MemberID(member), StartsAt: start, EndsAt: start.Add(time.Duration(hours) * time.Hour), Station: "Packing Line 2"}
	}

	if _, err := f.svc.CreateShift(ctx, f.who["employee"], shift("m-3", day, 8)); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("employee: want ErrForbidden, got %v", err)
	}
	// Taylor is on another team: hidden from Jordan, and deactivated for the owner.
	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-6", day, 8)); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("other team: want ErrNotFound, got %v", err)
	}
	if _, err := f.svc.CreateShift(ctx, f.who["owner"], shift("m-6", day, 8)); !errors.Is(err, domain.ErrNotSchedulable) {
		t.Fatalf("deactivated: want ErrNotSchedulable, got %v", err)
	}
	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-3", day, 13)); !isField(err, "endsAt") {
		t.Fatalf("13 hours: want endsAt error, got %v", err)
	}
	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-3", f.monday, 8)); !isField(err, "startsAt") {
		t.Fatalf("in the past: want startsAt error, got %v", err)
	}

	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-3", day, 8)); err != nil {
		t.Fatal(err)
	}
	var overlap domain.ShiftOverlapError
	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-3", day.Add(6*time.Hour), 6)); !errors.As(err, &overlap) {
		t.Fatalf("overlap: want ShiftOverlapError, got %v", err)
	}
	if _, err := f.svc.CreateShift(ctx, f.who["supervisor"], shift("m-3", day.Add(8*time.Hour), 4)); err != nil {
		t.Fatalf("back to back is fine: %v", err)
	}
}

func TestUpdateShift_PublishedShowsWhatChanged(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(1, 9, 0)
	start := f.monday.AddDate(0, 0, 10).Add(14 * time.Hour) // the seeded week-1 Thursday, two hours later
	station := "Mixing Line 1"

	sh, err := f.svc.UpdateShift(ctx, f.who["supervisor"], "sh-sam-w1-thu", app.ShiftChange{StartsAt: &start, EndsAt: ptr(start.Add(8 * time.Hour)), Station: &station})
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(sh.ChangeNote, "Moved from ") || !strings.Contains(sh.ChangeNote, "Station changed") {
		t.Fatalf("change note: %q", sh.ChangeNote)
	}
	got, err := f.svc.Shift(ctx, f.who["employee"], "sh-sam-w1-thu")
	if err != nil || got.ChangeNote != sh.ChangeNote || !got.StartsAt.Equal(start) {
		t.Fatalf("employee sees the change: %+v %v", got, err)
	}
}

func TestUpdateAndDeleteShift_Locks(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	// Clock-in for the seeded week-1 Monday shift (16:00Z) opens at 15:45Z.
	f.at(7, 15, 50)
	notes := "Bring gloves"
	if _, err := f.svc.UpdateShift(ctx, f.who["supervisor"], "sh-sam-w1-mon", app.ShiftChange{Notes: &notes}); !errors.Is(err, domain.ErrShiftStarted) {
		t.Fatalf("started: want ErrShiftStarted, got %v", err)
	}

	f.at(1, 9, 0)
	if err := f.svc.DeleteShift(ctx, f.who["supervisor"], "sh-sam-w1-tue"); !errors.Is(err, domain.ErrShiftPublished) {
		t.Fatalf("published: want ErrShiftPublished, got %v", err)
	}
	if err := f.svc.DeleteShift(ctx, f.who["employee"], "sh-sam-w2-mon"); !errors.Is(err, domain.ErrForbidden) {
		t.Fatalf("employee: want ErrForbidden, got %v", err)
	}
	if err := f.svc.DeleteShift(ctx, f.who["supervisor"], "sh-sam-w2-mon"); err != nil {
		t.Fatalf("draft: %v", err)
	}
	if _, err := f.svc.Shift(ctx, f.who["supervisor"], "sh-sam-w2-mon"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("deleted: want ErrNotFound, got %v", err)
	}
}

func isField(err error, field string) bool {
	var ve domain.ValidationError
	return errors.As(err, &ve) && ve.Field == field
}

func ptr[T any](v T) *T { return &v }
