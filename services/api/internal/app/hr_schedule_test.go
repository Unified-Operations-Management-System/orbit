package app

import (
	"encoding/json"
	"net/http"
	"slices"
	"testing"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// TestHrScheduleFollowsContract drives building the schedule (SCRUM-14) through the real
// HTTP stack: a supervisor adds a draft, employees can't, publishing shows it to the
// employee, and a published shift can be moved but not deleted.
func TestHrScheduleFollowsContract(t *testing.T) {
	c := newContractClient(t)
	decode := func(body []byte, v any) {
		t.Helper()
		if err := json.Unmarshal(body, v); err != nil {
			t.Fatalf("decode: %v\n%s", err, body)
		}
	}
	// A Wednesday four weeks out, 7 AM Toronto: always in the future and clear of the seed.
	day := time.Now().UTC().Truncate(24*time.Hour).AddDate(0, 0, 28)
	for day.Weekday() != time.Wednesday {
		day = day.AddDate(0, 0, 1)
	}
	start := day.Add(12 * time.Hour)
	body := map[string]any{"memberId": "m-3", "startsAt": start, "endsAt": start.Add(8 * time.Hour), "station": "Mixing Line 1"}

	c.token = "dev:employee"
	if code, _ := c.do(http.MethodPost, "/hr/shifts", body); code != http.StatusForbidden {
		t.Fatalf("employee schedules: want 403, got %d", code)
	}

	c.token = "dev:supervisor"
	code, raw := c.do(http.MethodPost, "/hr/shifts", body)
	var sh oapi.Shift
	decode(raw, &sh)
	if code != http.StatusCreated || sh.Published || sh.MemberName != "Sam Patel" {
		t.Fatalf("create: %d %s", code, raw)
	}
	if code, _ := c.do(http.MethodPost, "/hr/shifts", body); code != http.StatusUnprocessableEntity {
		t.Fatalf("overlap: want 422, got %d", code)
	}

	code, raw = c.do(http.MethodPost, "/hr/shifts/publish", map[string]any{"from": day.AddDate(0, 0, -int(day.Weekday())+1)})
	var pub oapi.PublishShiftsResult
	decode(raw, &pub)
	if code != http.StatusOK || pub.Published != 1 {
		t.Fatalf("publish: %d %s", code, raw)
	}

	c.token = "dev:employee"
	code, raw = c.do(http.MethodGet, "/hr/shifts?from="+day.Format(time.RFC3339)+"&to="+day.AddDate(0, 0, 1).Format(time.RFC3339), nil)
	var sched oapi.Schedule
	decode(raw, &sched)
	ids := make([]string, len(sched.Shifts))
	for i, s := range sched.Shifts {
		ids[i] = s.Id
	}
	if code != http.StatusOK || !slices.Contains(ids, sh.Id) {
		t.Fatalf("employee sees the published shift: %d %v", code, ids)
	}

	c.token = "dev:supervisor"
	if code, _ := c.do(http.MethodDelete, "/hr/shifts/"+sh.Id, nil); code != http.StatusConflict {
		t.Fatalf("delete published: want 409, got %d", code)
	}
	later := start.Add(2 * time.Hour)
	code, raw = c.do(http.MethodPatch, "/hr/shifts/"+sh.Id, map[string]any{"startsAt": later, "endsAt": later.Add(8 * time.Hour)})
	decode(raw, &sh)
	if code != http.StatusOK || sh.ChangeNote == nil || *sh.ChangeNote == "" {
		t.Fatalf("move published: %d %s", code, raw)
	}
}
