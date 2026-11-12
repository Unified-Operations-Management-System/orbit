package app_test

import (
	"context"
	"database/sql"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/db"
	hrschema "github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/infra"
	oamschema "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam"
	oamapp "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	oaminfra "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

// These tests run every use case against a real in-memory SQLite database built from the
// repo's migrations and dev seed, so the SQL, the keys and the rules are all exercised.

type fakeClock struct{ t time.Time }

func (c *fakeClock) Now() time.Time { return c.t }

type fixture struct {
	svc    *app.Service
	conn   *sql.DB
	clock  *fakeClock
	monday time.Time // 00:00Z on the Monday the seed calls "day 0"
	who    map[string]app.Principal
}

func setup(t *testing.T) fixture {
	t.Helper()
	ctx := context.Background()
	conn, err := db.Open(ctx, ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { conn.Close() })
	if err := db.Setup(ctx, conn, db.Dev, oamschema.Schema, hrschema.Schema); err != nil {
		t.Fatalf("setup: %v", err)
	}
	var day string
	if err := conn.QueryRowContext(ctx, `SELECT date('now', '-6 days', 'weekday 1')`).Scan(&day); err != nil {
		t.Fatal(err)
	}
	monday, _ := time.Parse("2006-01-02", day)

	store := infra.NewStore(conn)
	clock := &fakeClock{t: monday}
	n := 0
	svc := app.NewService(app.Deps{
		Shifts: store.Shifts(), TimeOff: store.TimeOff(), Entries: store.Entries(), Corrections: store.Corrections(),
		Periods: store.Periods(), Settings: store.Settings(), People: store.People(),
		Tx: infra.Tx{DB: conn}, Clock: clock,
		NewID: func(prefix string) string { n++; return prefix + "-test-" + string(rune('a'+n)) },
	})
	auth := oaminfra.NewDevAuthenticator(oaminfra.NewSQLiteMemberRepository(conn), oaminfra.DemoOrg)
	who := map[string]app.Principal{}
	for _, role := range []string{"owner", "supervisor", "employee", "hr-admin"} {
		p, err := auth.Authenticate(ctx, "dev:"+role)
		if err != nil {
			t.Fatalf("principal %s: %v", role, err)
		}
		who[role] = p
	}
	return fixture{svc: svc, conn: conn, clock: clock, monday: monday, who: who}
}

// at sets the clock to day (offset from Monday) at hh:mm UTC.
func (f fixture) at(day, hh, mm int) time.Time {
	f.clock.t = f.monday.AddDate(0, 0, day).Add(time.Duration(hh)*time.Hour + time.Duration(mm)*time.Minute)
	return f.clock.t
}

func shiftIDs(s []domain.Shift) []domain.ShiftID {
	out := make([]domain.ShiftID, len(s))
	for i, x := range s {
		out[i] = x.ID
	}
	return out
}

func TestSchedule_ScopeAndDrafts(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(3, 9, 0)
	q := app.ScheduleQuery{From: f.monday, To: f.monday.AddDate(0, 0, 21)}

	sam, err := f.svc.Schedule(ctx, f.who["employee"], q)
	if err != nil {
		t.Fatal(err)
	}
	ids := shiftIDs(sam.Shifts)
	if !slices.Contains(ids, "sh-sam-w1-mon") || slices.Contains(ids, "sh-sam-w2-mon") {
		t.Fatalf("employee sees published shifts only: %v", ids)
	}
	if slices.Contains(ids, "sh-jor-w0-mon") {
		t.Fatalf("employee must not see the supervisor's shifts: %v", ids)
	}
	if len(sam.TimeOff) != 1 || sam.TimeOff[0].Kind != "Vacation" {
		t.Fatalf("time off: %+v", sam.TimeOff)
	}

	jordan, err := f.svc.Schedule(ctx, f.who["supervisor"], q)
	if err != nil {
		t.Fatal(err)
	}
	if ids := shiftIDs(jordan.Shifts); !slices.Contains(ids, "sh-sam-w2-mon") || !slices.Contains(ids, "sh-jor-w0-mon") {
		t.Fatalf("supervisor sees the team, drafts included: %v", ids)
	}

	if _, err := f.svc.Shift(ctx, f.who["employee"], "sh-sam-w2-mon"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("draft shift for employee: want ErrNotFound, got %v", err)
	}
	if _, err := f.svc.Shift(ctx, f.who["employee"], "sh-jor-w0-mon"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("someone else's shift for employee: want ErrNotFound, got %v", err)
	}
	var ve domain.ValidationError
	if _, err := f.svc.Schedule(ctx, f.who["employee"], app.ScheduleQuery{From: f.monday, To: f.monday}); !errors.As(err, &ve) {
		t.Fatalf("empty range: want ValidationError, got %v", err)
	}
}

func TestClockInAndOut(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	sam := f.who["employee"]

	// Next Tuesday's shift is 16:00Z - 24:00Z; the window opens 15 minutes before.
	f.at(8, 15, 40)
	var early domain.TooEarlyError
	if _, err := f.svc.ClockIn(ctx, sam); !errors.As(err, &early) || !early.Earliest.Equal(f.monday.AddDate(0, 0, 8).Add(15*time.Hour+45*time.Minute)) {
		t.Fatalf("UC-HR-01 ext 4.a: want TooEarlyError at 15:45Z, got %v", err)
	}

	f.at(8, 15, 50)
	e, err := f.svc.ClockIn(ctx, sam)
	if err != nil || e.ShiftID != "sh-sam-w1-tue" || e.Late || e.NeedsReview || !e.Open() {
		t.Fatalf("clock in: %+v %v", e, err)
	}
	if _, err := f.svc.ClockIn(ctx, sam); !errors.Is(err, domain.ErrAlreadyClockedIn) {
		t.Fatalf("UC-HR-01 ext 2.a: want ErrAlreadyClockedIn, got %v", err)
	}
	st, err := f.svc.ClockStatus(ctx, sam)
	if err != nil || st.Open == nil || st.Shift == nil || st.Shift.ID != "sh-sam-w1-tue" || st.Period == nil {
		t.Fatalf("status while clocked in: %+v %v", st, err)
	}

	f.at(8, 23, 0)
	out, err := f.svc.ClockOut(ctx, sam)
	if err != nil || out.Open() || !out.EarlyOut || out.Hours() != 7.17 {
		t.Fatalf("UC-HR-02 ext 4.a early out: %+v hours=%v %v", out, out.Hours(), err)
	}
	if _, err := f.svc.ClockOut(ctx, sam); !errors.Is(err, domain.ErrNotClockedIn) {
		t.Fatalf("UC-HR-02 ext 2.a: want ErrNotClockedIn, got %v", err)
	}
}

func TestClockIn_LateNoShiftAndClosedPeriod(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	sam := f.who["employee"]

	f.at(10, 12, 10) // next Thursday 12:00Z shift
	e, err := f.svc.ClockIn(ctx, sam)
	if err != nil || !e.Late {
		t.Fatalf("UC-HR-01 ext 4.b late: %+v %v", e, err)
	}
	f.at(10, 20, 0)
	if _, err := f.svc.ClockOut(ctx, sam); err != nil {
		t.Fatal(err)
	}

	f.at(9, 13, 0) // next Wednesday: vacation, no shift
	e, err = f.svc.ClockIn(ctx, sam)
	if err != nil || !e.NeedsReview || e.ShiftID != "" {
		t.Fatalf("UC-HR-01 ext 2.b no shift: %+v %v", e, err)
	}
	f.at(9, 14, 0)
	if _, err := f.svc.ClockOut(ctx, sam); err != nil {
		t.Fatal(err)
	}

	f.at(-15, 13, 0) // inside the closed pay period
	if _, err := f.svc.ClockIn(ctx, sam); !errors.Is(err, domain.ErrPeriodClosed) {
		t.Fatalf("Period Lock: want ErrPeriodClosed, got %v", err)
	}
}

func TestTimecard(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(4, 23, 0)

	tc, err := f.svc.Timecard(ctx, f.who["employee"], "", "")
	if err != nil {
		t.Fatal(err)
	}
	if tc.Period.ID != "pp-now" || tc.Person.ID != "m-3" {
		t.Fatalf("period/person: %+v %+v", tc.Period, tc.Person)
	}
	if !slices.Contains(shiftIDs(tc.MissedShifts), "sh-sam-w-1-wed") {
		t.Fatalf("last Wednesday had no punch, want it missed: %v", shiftIDs(tc.MissedShifts))
	}
	if slices.Contains(shiftIDs(tc.MissedShifts), "sh-sam-w-1-thu") {
		t.Fatal("a split shift is worked, not missed")
	}
	if len(tc.Corrections) != 1 || tc.Corrections[0].Status != domain.CorrectionPending {
		t.Fatalf("pending correction: %+v", tc.Corrections)
	}
	if tc.Hours < 30 || tc.Overtime != 0 || tc.Regular != tc.Hours {
		t.Fatalf("hours %v regular %v overtime %v", tc.Hours, tc.Regular, tc.Overtime)
	}

	if _, err := f.svc.Timecard(ctx, f.who["employee"], "", "m-2"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("employee reading the supervisor's timecard: want ErrNotFound, got %v", err)
	}
	if _, err := f.svc.Timecard(ctx, f.who["supervisor"], "pp-prev", "m-3"); err != nil {
		t.Fatalf("supervisor reads the team's previous period: %v", err)
	}
}

func TestRequestCorrection_Rules(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	sam := f.who["employee"]
	f.at(4, 23, 0)
	day := func(d, hh, mm int) time.Time {
		return f.monday.AddDate(0, 0, d).Add(time.Duration(hh)*time.Hour + time.Duration(mm)*time.Minute)
	}

	var ve domain.ValidationError
	if _, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{ShiftID: "sh-sam-w-1-wed", ClockIn: day(-5, 12, 0), ClockOut: day(-5, 20, 0), Reason: "  "}); !errors.As(err, &ve) || ve.Field != "reason" {
		t.Fatalf("UC-HR-04 ext 5.a: want reason required, got %v", err)
	}
	if _, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{ShiftID: "sh-sam-w-1-wed", ClockIn: day(-5, 20, 0), ClockOut: day(-5, 12, 0), Reason: "x"}); !errors.As(err, &ve) || ve.Field != "clockOut" {
		t.Fatalf("UC-HR-04 ext 7.a: want clockOut after clockIn, got %v", err)
	}
	var overlap domain.OverlapError
	if _, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{TimeEntryID: "te-sam-w-1-thu-a", ClockIn: day(-4, 12, 0), ClockOut: day(-4, 17, 0), Reason: "Lunch started late"}); !errors.As(err, &overlap) || overlap.With.ID != "te-sam-w-1-thu-b" {
		t.Fatalf("UC-HR-04 ext 7.b: want overlap with the afternoon entry, got %v", err)
	}
	if _, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{TimeEntryID: "te-sam-w-1-fri", ClockIn: day(-3, 12, 0), ClockOut: day(-3, 20, 0), Reason: "again"}); !errors.Is(err, domain.ErrPendingExists) {
		t.Fatalf("UC-HR-04 ext 3.b: want ErrPendingExists, got %v", err)
	}
	if _, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{TimeEntryID: "te-jor-w0-mon", ClockIn: day(0, 11, 0), ClockOut: day(0, 19, 0), Reason: "x"}); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("someone else's entry: want ErrNotFound, got %v", err)
	}

	// ext 7.c: a closed period needs the employee's acknowledgement, then posts as an adjustment.
	closed := app.CorrectionInput{TimeEntryID: "te-sam-w-2-fri", ClockIn: day(-10, 11, 30), ClockOut: day(-10, 20, 0), Reason: "Came in early for the audit"}
	if _, err := f.svc.RequestCorrection(ctx, sam, closed); !errors.Is(err, domain.ErrAdjustmentNotAcked) {
		t.Fatalf("UC-HR-04 ext 7.c: want ErrAdjustmentNotAcked, got %v", err)
	}
	closed.AcknowledgeAdjustment = true
	c, err := f.svc.RequestCorrection(ctx, sam, closed)
	if err != nil || !c.Adjustment || c.AssignedToID != "m-2" {
		t.Fatalf("adjustment routed to the supervisor: %+v %v", c, err)
	}
}

func TestCorrection_ApproveRejectWithdraw(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	sam, jordan, riley := f.who["employee"], f.who["supervisor"], f.who["hr-admin"]
	f.at(4, 23, 0)
	wed := f.monday.AddDate(0, 0, -5)

	// ext 3.a: add the missing Wednesday, then the supervisor approves it.
	c, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{
		ShiftID: "sh-sam-w-1-wed", ClockIn: wed.Add(12 * time.Hour), ClockOut: wed.Add(20 * time.Hour), Reason: "Forgot to clock in, I was on Mixing all day.",
	})
	if err != nil || c.AssignedToID != "m-2" || c.TimeEntryID != "" {
		t.Fatalf("request: %+v %v", c, err)
	}
	if _, err := f.svc.ReviewCorrection(ctx, sam, c.ID, true); !errors.Is(err, domain.ErrSelfApproval) {
		t.Fatalf("No Self-Approval: want ErrSelfApproval, got %v", err)
	}
	approved, err := f.svc.ReviewCorrection(ctx, jordan, c.ID, true)
	if err != nil || approved.Status != domain.CorrectionApproved || approved.ReviewerID != "m-2" || approved.TimeEntryID == "" {
		t.Fatalf("approve: %+v %v", approved, err)
	}
	if _, err := f.svc.ReviewCorrection(ctx, jordan, c.ID, false); !errors.Is(err, domain.ErrNotPending) {
		t.Fatalf("review twice: want ErrNotPending, got %v", err)
	}
	tc, err := f.svc.Timecard(ctx, sam, "", "")
	if err != nil || slices.Contains(shiftIDs(tc.MissedShifts), "sh-sam-w-1-wed") {
		t.Fatalf("after approval Wednesday is worked: %v %v", shiftIDs(tc.MissedShifts), err)
	}

	// HR approves the seeded request: last Friday's late punch becomes 12:00Z and not late.
	fixed, err := f.svc.ReviewCorrection(ctx, riley, "tc-sam-w-1-fri", true)
	if err != nil || fixed.Status != domain.CorrectionApproved {
		t.Fatalf("hr approve: %+v %v", fixed, err)
	}
	entries, err := f.svc.Entries(ctx, sam, app.EntryQuery{From: f.monday.AddDate(0, 0, -3), To: f.monday.AddDate(0, 0, -2)})
	if err != nil || len(entries) != 1 || entries[0].Late || entries[0].Source != domain.SourceCorrection || entries[0].ClockIn.Hour() != 12 {
		t.Fatalf("corrected entry: %+v %v", entries, err)
	}

	// Withdraw: only the requester, only while pending.
	thu := f.monday.AddDate(0, 0, -4)
	w, err := f.svc.RequestCorrection(ctx, sam, app.CorrectionInput{TimeEntryID: "te-sam-w-1-thu-b", ClockIn: thu.Add(16*time.Hour + 30*time.Minute), ClockOut: thu.Add(20 * time.Hour), Reason: "Back from lunch at 11:30"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.svc.WithdrawCorrection(ctx, jordan, w.ID); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("withdraw someone else's: want ErrNotFound, got %v", err)
	}
	if got, err := f.svc.WithdrawCorrection(ctx, sam, w.ID); err != nil || got.Status != domain.CorrectionWithdrawn {
		t.Fatalf("withdraw: %+v %v", got, err)
	}
	if _, err := f.svc.ReviewCorrection(ctx, jordan, w.ID, true); !errors.Is(err, domain.ErrNotPending) {
		t.Fatalf("approve a withdrawn request: want ErrNotPending, got %v", err)
	}

	pending, err := f.svc.Corrections(ctx, jordan, app.CorrectionQuery{Status: domain.CorrectionPending, AssignedToMe: true})
	if err != nil || len(pending) != 0 {
		t.Fatalf("supervisor queue is empty now: %+v %v", pending, err)
	}
}

func TestEmployees_Filters(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	f.at(8, 15, 50)
	if _, err := f.svc.ClockIn(ctx, f.who["employee"]); err != nil {
		t.Fatal(err)
	}
	names := func(es []domain.EmployeeSummary) []string {
		out := make([]string, len(es))
		for i, e := range es {
			out[i] = e.Name
		}
		return out
	}
	hr := f.who["hr-admin"]
	yes := true

	cases := []struct {
		name string
		who  app.Principal
		q    app.EmployeeQuery
		want []string
	}{
		{"hr sees every active member", hr, app.EmployeeQuery{}, []string{"Alex Morgan", "Jordan Lee", "Riley Chen", "Sam Patel"}},
		{"search by name", hr, app.EmployeeQuery{Query: "SAM"}, []string{"Sam Patel"}},
		{"search by email", hr, app.EmployeeQuery{Query: "jordan@"}, []string{"Jordan Lee"}},
		{"by team", hr, app.EmployeeQuery{TeamID: "team-line-1"}, []string{"Jordan Lee", "Sam Patel"}},
		{"by role", hr, app.EmployeeQuery{Role: "HR Admin"}, []string{"Riley Chen"}},
		{"pending invitations", hr, app.EmployeeQuery{Status: "Pending"}, []string{"Casey Brown"}},
		{"clocked in now", hr, app.EmployeeQuery{ClockedIn: &yes}, []string{"Sam Patel"}},
		{"supervisor sees their team", f.who["supervisor"], app.EmployeeQuery{}, []string{"Jordan Lee", "Sam Patel"}},
		{"employee sees only themselves", f.who["employee"], app.EmployeeQuery{}, []string{"Sam Patel"}},
	}
	for _, tc := range cases {
		got, _, err := f.svc.Employees(ctx, tc.who, tc.q)
		if err != nil || !slices.Equal(names(got), tc.want) {
			t.Errorf("%s: got %v %v, want %v", tc.name, names(got), err, tc.want)
		}
	}

	// Next Tuesday is in a new pay period with no hours yet; look from this Friday instead.
	f.at(4, 23, 0)
	all, period, err := f.svc.Employees(ctx, hr, app.EmployeeQuery{Query: "sam"})
	if err != nil || period == nil || period.ID != "pp-now" || len(all) != 1 {
		t.Fatalf("sam: %+v %v", all, err)
	}
	if s := all[0]; s.ClockedInSince == nil || s.HoursThisPeriod <= 0 || s.PendingCorrections != 1 || s.TeamName != "Production line 1" {
		t.Fatalf("summary: %+v", s)
	}
}

var _ oamapp.Clock = (*fakeClock)(nil)
