package server

import (
	"context"
	"errors"
	"net/http"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"

	hrapp "github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// HR Management operations. Each handler takes the caller from the context, delegates to
// hrapp.Service and maps domain errors to problem responses; no business rules live here.

// classify maps an HR error to its HTTP status and problem body; 0 means unexpected.
func classify(err error) (int, oapi.Problem) {
	var (
		ve      domain.ValidationError
		early   domain.TooEarlyError
		overlap domain.OverlapError
	)
	field := func(loc, msg string) oapi.Problem {
		p := problem(http.StatusUnprocessableEntity, errors.New("validation failed"))
		p.Errors = &[]oapi.FieldError{{Location: loc, Message: msg}}
		return p
	}
	switch {
	case errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, problem(http.StatusNotFound, err)
	case errors.Is(err, domain.ErrForbidden), errors.Is(err, domain.ErrSelfApproval):
		return http.StatusForbidden, problem(http.StatusForbidden, err)
	case errors.As(err, &early), errors.Is(err, domain.ErrAlreadyClockedIn), errors.Is(err, domain.ErrNotClockedIn),
		errors.Is(err, domain.ErrPeriodClosed), errors.Is(err, domain.ErrPendingExists), errors.Is(err, domain.ErrNotPending):
		return http.StatusConflict, problem(http.StatusConflict, err)
	case errors.As(err, &ve):
		return http.StatusUnprocessableEntity, field("body."+ve.Field, ve.Message)
	case errors.As(err, &overlap):
		return http.StatusUnprocessableEntity, field("body.clockIn", overlap.Error())
	case errors.Is(err, domain.ErrAdjustmentNotAcked):
		return http.StatusUnprocessableEntity, field("body.acknowledgeAdjustment", err.Error())
	}
	return 0, oapi.Problem{}
}

func (s *Server) GetClockStatus(ctx context.Context, _ oapi.GetClockStatusRequestObject) (oapi.GetClockStatusResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.GetClockStatus401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	st, err := s.hr.ClockStatus(ctx, p)
	if err != nil {
		return nil, err
	}
	out := oapi.ClockStatus{
		Now: st.Now, ClockedIn: st.Open != nil, MissedClockOut: st.MissedClockOut, EarliestClockIn: st.EarliestClockIn,
		HoursThisWeek: float32(st.HoursThisWeek), HoursThisPeriod: float32(st.HoursThisPeriod), Settings: toSettings(st.Settings),
	}
	if st.Open != nil {
		e := toEntry(*st.Open)
		out.OpenEntry = &e
	}
	if st.Shift != nil {
		sh := toShift(*st.Shift)
		out.Shift = &sh
	}
	if st.Period != nil {
		pp := toPeriod(*st.Period)
		out.PayPeriod = &pp
	}
	return oapi.GetClockStatus200JSONResponse(out), nil
}

func (s *Server) ClockIn(ctx context.Context, _ oapi.ClockInRequestObject) (oapi.ClockInResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ClockIn401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	e, err := s.hr.ClockIn(ctx, p)
	if err == nil {
		return oapi.ClockIn201JSONResponse(toEntry(e)), nil
	}
	if status, pr := classify(err); status == http.StatusConflict {
		return oapi.ClockIn409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) ClockOut(ctx context.Context, _ oapi.ClockOutRequestObject) (oapi.ClockOutResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ClockOut401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	e, err := s.hr.ClockOut(ctx, p)
	if err == nil {
		return oapi.ClockOut200JSONResponse(toEntry(e)), nil
	}
	if status, pr := classify(err); status == http.StatusConflict {
		return oapi.ClockOut409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) ListShifts(ctx context.Context, req oapi.ListShiftsRequestObject) (oapi.ListShiftsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListShifts401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	q := hrapp.ScheduleQuery{From: deref(req.Params.From), To: deref(req.Params.To),
		MemberID: oam.MemberID(deref(req.Params.MemberId)), TeamID: oam.TeamID(deref(req.Params.TeamId))}
	sched, err := s.hr.Schedule(ctx, p, q)
	if err != nil {
		if status, pr := classify(err); status == http.StatusUnprocessableEntity {
			return oapi.ListShifts422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: oapi.ValidationFailedApplicationProblemPlusJSONResponse(pr)}, nil
		}
		return nil, err
	}
	out := oapi.Schedule{From: sched.From, To: sched.To, Shifts: make([]oapi.Shift, len(sched.Shifts)), TimeOff: make([]oapi.TimeOff, len(sched.TimeOff))}
	for i, sh := range sched.Shifts {
		out.Shifts[i] = toShift(sh)
	}
	for i, t := range sched.TimeOff {
		out.TimeOff[i] = oapi.TimeOff{Id: string(t.ID), MemberId: string(t.MemberID), StartsAt: t.StartsAt, EndsAt: t.EndsAt,
			Kind: oapi.TimeOffKind(t.Kind), Status: oapi.TimeOffStatus(t.Status), Note: t.Note}
	}
	return oapi.ListShifts200JSONResponse(out), nil
}

func (s *Server) GetShift(ctx context.Context, req oapi.GetShiftRequestObject) (oapi.GetShiftResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.GetShift401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	sh, err := s.hr.Shift(ctx, p, domain.ShiftID(req.ShiftId))
	if err == nil {
		return oapi.GetShift200JSONResponse(toShift(sh)), nil
	}
	if status, pr := classify(err); status == http.StatusNotFound {
		return oapi.GetShift404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) GetTimecard(ctx context.Context, req oapi.GetTimecardRequestObject) (oapi.GetTimecardResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.GetTimecard401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	tc, err := s.hr.Timecard(ctx, p, domain.PeriodID(deref(req.Params.PayPeriodId)), oam.MemberID(deref(req.Params.MemberId)))
	if err != nil {
		if status, pr := classify(err); status == http.StatusNotFound {
			return oapi.GetTimecard404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
		}
		return nil, err
	}
	out := oapi.Timecard{
		Member:    toEmployee(domain.EmployeeSummary{Person: tc.Person}),
		PayPeriod: toPeriod(tc.Period), Hours: float32(tc.Hours), RegularHours: float32(tc.Regular), OvertimeHours: float32(tc.Overtime),
		Entries: make([]oapi.TimeEntry, len(tc.Entries)), MissedShifts: make([]oapi.Shift, len(tc.MissedShifts)),
		Corrections: make([]oapi.TimeCorrection, len(tc.Corrections)),
	}
	for i, e := range tc.Entries {
		out.Entries[i] = toEntry(e)
	}
	for i, sh := range tc.MissedShifts {
		out.MissedShifts[i] = toShift(sh)
	}
	for i, c := range tc.Corrections {
		out.Corrections[i] = toCorrection(c)
	}
	return oapi.GetTimecard200JSONResponse(out), nil
}

func (s *Server) ListPayPeriods(ctx context.Context, _ oapi.ListPayPeriodsRequestObject) (oapi.ListPayPeriodsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListPayPeriods401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	ps, err := s.hr.PayPeriods(ctx, p)
	if err != nil {
		return nil, err
	}
	out := make(oapi.ListPayPeriods200JSONResponse, len(ps))
	for i, pp := range ps {
		out[i] = toPeriod(pp)
	}
	return out, nil
}

func (s *Server) ListTimeCorrections(ctx context.Context, req oapi.ListTimeCorrectionsRequestObject) (oapi.ListTimeCorrectionsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListTimeCorrections401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	cs, err := s.hr.Corrections(ctx, p, hrapp.CorrectionQuery{
		Status: domain.CorrectionStatus(deref(req.Params.Status)), MemberID: oam.MemberID(deref(req.Params.MemberId)),
		AssignedToMe: deref(req.Params.AssignedToMe),
	})
	if err != nil {
		return nil, err
	}
	out := make(oapi.ListTimeCorrections200JSONResponse, len(cs))
	for i, c := range cs {
		out[i] = toCorrection(c)
	}
	return out, nil
}

func (s *Server) RequestTimeCorrection(ctx context.Context, req oapi.RequestTimeCorrectionRequestObject) (oapi.RequestTimeCorrectionResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.RequestTimeCorrection401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	c, err := s.hr.RequestCorrection(ctx, p, hrapp.CorrectionInput{
		TimeEntryID: domain.EntryID(deref(req.Body.TimeEntryId)), ShiftID: domain.ShiftID(deref(req.Body.ShiftId)),
		ClockIn: req.Body.ClockIn, ClockOut: req.Body.ClockOut, Reason: req.Body.Reason,
		AcknowledgeAdjustment: deref(req.Body.AcknowledgeAdjustment),
	})
	if err == nil {
		return oapi.RequestTimeCorrection201JSONResponse(toCorrection(c)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusNotFound:
		return oapi.RequestTimeCorrection404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.RequestTimeCorrection409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusUnprocessableEntity:
		return oapi.RequestTimeCorrection422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: oapi.ValidationFailedApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) WithdrawTimeCorrection(ctx context.Context, req oapi.WithdrawTimeCorrectionRequestObject) (oapi.WithdrawTimeCorrectionResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.WithdrawTimeCorrection401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	c, err := s.hr.WithdrawCorrection(ctx, p, domain.CorrectionID(req.CorrectionId))
	if err == nil {
		return oapi.WithdrawTimeCorrection200JSONResponse(toCorrection(c)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusNotFound:
		return oapi.WithdrawTimeCorrection404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.WithdrawTimeCorrection409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) ApproveTimeCorrection(ctx context.Context, req oapi.ApproveTimeCorrectionRequestObject) (oapi.ApproveTimeCorrectionResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ApproveTimeCorrection401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	c, err := s.hr.ReviewCorrection(ctx, p, domain.CorrectionID(req.CorrectionId), true)
	if err == nil {
		return oapi.ApproveTimeCorrection200JSONResponse(toCorrection(c)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.ApproveTimeCorrection403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusNotFound:
		return oapi.ApproveTimeCorrection404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.ApproveTimeCorrection409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) RejectTimeCorrection(ctx context.Context, req oapi.RejectTimeCorrectionRequestObject) (oapi.RejectTimeCorrectionResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.RejectTimeCorrection401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	c, err := s.hr.ReviewCorrection(ctx, p, domain.CorrectionID(req.CorrectionId), false)
	if err == nil {
		return oapi.RejectTimeCorrection200JSONResponse(toCorrection(c)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.RejectTimeCorrection403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusNotFound:
		return oapi.RejectTimeCorrection404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.RejectTimeCorrection409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) ListHrEmployees(ctx context.Context, req oapi.ListHrEmployeesRequestObject) (oapi.ListHrEmployeesResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListHrEmployees401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	es, period, err := s.hr.Employees(ctx, p, hrapp.EmployeeQuery{
		TeamID: oam.TeamID(deref(req.Params.TeamId)), Status: oam.Status(deref(req.Params.Status)),
		Role: oam.Role(deref(req.Params.Role)), Query: deref(req.Params.Q), ClockedIn: req.Params.ClockedIn,
	})
	if err != nil {
		return nil, err
	}
	out := oapi.HrEmployeeList{Employees: make([]oapi.HrEmployee, len(es))}
	for i, e := range es {
		out.Employees[i] = toEmployee(e)
	}
	if period != nil {
		pp := toPeriod(*period)
		out.PayPeriod = &pp
	}
	return oapi.ListHrEmployees200JSONResponse(out), nil
}

// ---------- mapping ----------

func deref[T any](p *T) T {
	var zero T
	if p == nil {
		return zero
	}
	return *p
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toShift(sh domain.Shift) oapi.Shift {
	return oapi.Shift{
		Id: string(sh.ID), MemberId: string(sh.MemberID), MemberName: sh.MemberName, TeamId: optional(string(sh.TeamID)),
		StartsAt: sh.StartsAt, EndsAt: sh.EndsAt, Station: sh.Station, Notes: sh.Notes, Published: sh.Published(),
		ChangeNote: optional(sh.ChangeNote), Hours: float32(sh.Hours()),
	}
}

func toEntry(e domain.TimeEntry) oapi.TimeEntry {
	return oapi.TimeEntry{
		Id: string(e.ID), MemberId: string(e.MemberID), ShiftId: optional(string(e.ShiftID)), ClockIn: e.ClockIn, ClockOut: e.ClockOut,
		Late: e.Late, EarlyOut: e.EarlyOut, NeedsReview: e.NeedsReview, Source: oapi.TimeEntrySource(e.Source), Hours: float32(e.Hours()),
	}
}

func toPeriod(p domain.PayPeriod) oapi.PayPeriod {
	d, _ := time.Parse("2006-01-02", p.PayDate)
	return oapi.PayPeriod{Id: string(p.ID), StartsAt: p.StartsAt, EndsAt: p.EndsAt, PayDate: openapi_types.Date{Time: d}, Status: oapi.PayPeriodStatus(p.Status)}
}

func toSettings(s domain.Settings) oapi.HrSettings {
	return oapi.HrSettings{
		Timezone: s.Timezone.String(), ClockInWindowMinutes: int(s.ClockInWindow / time.Minute),
		OvertimeWeeklyHours: float32(s.OvertimeWeeklyHours), MaxShiftHours: float32(s.MaxShift.Hours()),
	}
}

func toCorrection(c domain.Correction) oapi.TimeCorrection {
	return oapi.TimeCorrection{
		Id: string(c.ID), MemberId: string(c.MemberID), MemberName: c.MemberName, TimeEntryId: optional(string(c.TimeEntryID)),
		ShiftId: optional(string(c.ShiftID)), ClockIn: c.ClockIn, ClockOut: c.ClockOut, Reason: c.Reason,
		Status: oapi.TimeCorrectionStatus(c.Status), Adjustment: c.Adjustment, AssignedToId: optional(string(c.AssignedToID)),
		ReviewerId: optional(string(c.ReviewerID)), SubmittedAt: c.SubmittedAt, ReviewedAt: c.ReviewedAt,
	}
}

func toEmployee(e domain.EmployeeSummary) oapi.HrEmployee {
	return oapi.HrEmployee{
		Id: string(e.ID), Name: e.Name, Email: openapi_types.Email(e.Email), Role: oapi.MemberRole(e.Role), Status: oapi.MemberStatus(e.Status),
		TeamId: optional(string(e.TeamID)), TeamName: optional(e.TeamName), ClockedInSince: e.ClockedInSince,
		HoursThisPeriod: float32(e.HoursThisPeriod), PendingCorrections: e.PendingCorrections,
	}
}
