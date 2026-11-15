package app

import (
	"encoding/json"
	"net/http"
	"slices"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// TestHrFollowsContract drives the HR endpoints through the real HTTP stack (contract
// validation, dev auth, handlers, use cases, SQLite with the dev seed). Every response is
// checked against packages/api-spec by contractClient. The seed is relative to today, so
// these assertions only use facts that hold on any day of the week.
func TestHrFollowsContract(t *testing.T) {
	c := newContractClient(t)
	decode := func(body []byte, v any) {
		t.Helper()
		if err := json.Unmarshal(body, v); err != nil {
			t.Fatalf("decode: %v\n%s", err, body)
		}
	}

	if code, _ := c.do(http.MethodGet, "/hr/clock", nil); code != http.StatusUnauthorized {
		t.Fatalf("no token: want 401, got %d", code)
	}

	// Employee: clock status, schedule, timecard.
	c.token = "dev:employee"
	code, body := c.do(http.MethodGet, "/hr/clock", nil)
	var st oapi.ClockStatus
	decode(body, &st)
	if code != http.StatusOK || st.Settings.Timezone != "America/Toronto" || st.PayPeriod == nil || st.PayPeriod.Id != "pp-now" {
		t.Fatalf("clock status: %d %+v", code, st)
	}

	code, body = c.do(http.MethodGet, "/hr/shifts", nil)
	var sched oapi.Schedule
	decode(body, &sched)
	ids := make([]string, len(sched.Shifts))
	for i, s := range sched.Shifts {
		ids[i] = s.Id
	}
	if code != http.StatusOK || !slices.Contains(ids, "sh-sam-w0-mon") || !slices.Contains(ids, "sh-sam-w1-mon") || len(sched.TimeOff) != 1 {
		t.Fatalf("schedule: %d %v %+v", code, ids, sched.TimeOff)
	}
	if code, _ := c.do(http.MethodGet, "/hr/shifts?from=2026-01-10T00:00:00Z&to=2026-01-01T00:00:00Z", nil); code != http.StatusUnprocessableEntity {
		t.Fatalf("backwards range: want 422, got %d", code)
	}
	if code, _ := c.do(http.MethodGet, "/hr/shifts/sh-jor-w0-mon", nil); code != http.StatusNotFound {
		t.Fatalf("supervisor's shift as employee: want 404, got %d", code)
	}

	code, body = c.do(http.MethodGet, "/hr/timecard", nil)
	var tc oapi.Timecard
	decode(body, &tc)
	missed := slices.ContainsFunc(tc.MissedShifts, func(s oapi.Shift) bool { return s.Id == "sh-sam-w-1-wed" })
	if code != http.StatusOK || tc.Member.Id != "m-3" || !missed || len(tc.Corrections) != 1 {
		t.Fatalf("timecard: %d member=%s missed=%v corrections=%d", code, tc.Member.Id, missed, len(tc.Corrections))
	}

	// Employee: request a missing entry for last Wednesday.
	wed := tc.PayPeriod.StartsAt.Add(-5*time.Hour).AddDate(0, 0, 2) // period starts at local midnight last Monday
	req := map[string]any{"shiftId": "sh-sam-w-1-wed", "clockIn": wed.Add(12 * time.Hour), "clockOut": wed.Add(20 * time.Hour), "reason": ""}
	if code, _ := c.do(http.MethodPost, "/hr/time-corrections", req); code != http.StatusUnprocessableEntity {
		t.Fatalf("empty reason: want 422, got %d", code)
	}
	req["reason"] = "Forgot to clock in, I was on Mixing all day."
	code, body = c.do(http.MethodPost, "/hr/time-corrections", req)
	var corr oapi.TimeCorrection
	decode(body, &corr)
	if code != http.StatusCreated || corr.Status != oapi.CorrectionPending || corr.AssignedToId == nil || *corr.AssignedToId != "m-2" {
		t.Fatalf("request correction: %d %+v", code, corr)
	}
	if code, _ := c.do(http.MethodPost, "/hr/time-corrections/"+corr.Id+"/approve", nil); code != http.StatusForbidden {
		t.Fatalf("self-approval: want 403, got %d", code)
	}

	// Supervisor: the queue, then approve.
	c.token = "dev:supervisor"
	code, body = c.do(http.MethodGet, "/hr/time-corrections?status=Pending&assignedToMe=true", nil)
	var queue []oapi.TimeCorrection
	decode(body, &queue)
	if code != http.StatusOK || len(queue) != 2 {
		t.Fatalf("supervisor queue: %d %d", code, len(queue))
	}
	// Reviewers see the punch and shift next to the request: the seeded late Friday punch,
	// and only the shift for the missing Wednesday.
	for _, q := range queue {
		switch q.Id {
		case "tc-sam-w-1-fri":
			if q.PunchClockIn == nil || q.PunchClockOut == nil || q.ShiftStartsAt == nil || !q.PunchClockIn.After(*q.ShiftStartsAt) {
				t.Fatalf("punch context for late Friday: %+v", q)
			}
		case corr.Id:
			if q.PunchClockIn != nil || q.ShiftStartsAt == nil || q.ShiftEndsAt == nil {
				t.Fatalf("shift context for missing Wednesday: %+v", q)
			}
		}
	}
	code, body = c.do(http.MethodPost, "/hr/time-corrections/"+corr.Id+"/approve", nil)
	decode(body, &corr)
	if code != http.StatusOK || corr.Status != oapi.CorrectionApproved || corr.TimeEntryId == nil {
		t.Fatalf("approve: %d %+v", code, corr)
	}
	if code, _ := c.do(http.MethodPost, "/hr/time-corrections/"+corr.Id+"/reject", nil); code != http.StatusConflict {
		t.Fatalf("reject after approve: want 409, got %d", code)
	}

	// HR Admin: employee list with filters.
	c.token = "dev:hr-admin"
	list := func(query string) []string {
		t.Helper()
		code, body := c.do(http.MethodGet, "/hr/employees"+query, nil)
		var l oapi.HrEmployeeList
		decode(body, &l)
		if code != http.StatusOK {
			t.Fatalf("employees%s: %d", query, code)
		}
		out := make([]string, len(l.Employees))
		for i, e := range l.Employees {
			out[i] = e.Name
		}
		return out
	}
	if got := list(""); !slices.Equal(got, []string{"Alex Morgan", "Jordan Lee", "Riley Chen", "Sam Patel"}) {
		t.Fatalf("all active: %v", got)
	}
	if got := list("?teamId=team-line-1&q=sam"); !slices.Equal(got, []string{"Sam Patel"}) {
		t.Fatalf("team + search: %v", got)
	}
	if got := list("?status=Pending"); !slices.Equal(got, []string{"Casey Brown"}) {
		t.Fatalf("pending: %v", got)
	}
	if got := list("?role=HR%20Admin"); !slices.Equal(got, []string{"Riley Chen"}) {
		t.Fatalf("role: %v", got)
	}

	// Employee: clock in and out against the real clock. Whether there is a shift right
	// now depends on the day, so only check the contract and the state machine.
	c.token = "dev:employee"
	code, _ = c.do(http.MethodPost, "/hr/clock/in", nil)
	switch code {
	case http.StatusCreated:
		if code, _ := c.do(http.MethodPost, "/hr/clock/in", nil); code != http.StatusConflict {
			t.Fatalf("second clock in: want 409, got %d", code)
		}
		code, body = c.do(http.MethodGet, "/hr/clock", nil)
		decode(body, &st)
		if !st.ClockedIn || st.OpenEntry == nil {
			t.Fatalf("status after clock in: %+v", st)
		}
		if code, _ := c.do(http.MethodPost, "/hr/clock/out", nil); code != http.StatusOK {
			t.Fatalf("clock out: %d", code)
		}
	case http.StatusConflict: // too early for today's shift
	default:
		t.Fatalf("clock in: %d", code)
	}
	if code, _ := c.do(http.MethodPost, "/hr/clock/out", nil); code != http.StatusConflict {
		t.Fatalf("clock out when not clocked in: want 409, got %d", code)
	}
	if code, _ := c.do(http.MethodGet, "/hr/pay-periods", nil); code != http.StatusOK {
		t.Fatalf("pay periods: %d", code)
	}
}
