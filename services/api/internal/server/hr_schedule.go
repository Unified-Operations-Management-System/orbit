package server

import (
	"context"
	"net/http"

	hrapp "github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/hr/domain"
	oam "github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// Handlers for building the schedule (SCRUM-14). The rules live in hr/app and hr/domain;
// these only translate HTTP to use cases and errors to problem responses.

func (s *Server) CreateShift(ctx context.Context, req oapi.CreateShiftRequestObject) (oapi.CreateShiftResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.CreateShift401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	sh, err := s.hr.CreateShift(ctx, p, hrapp.ShiftInput{
		MemberID: oam.MemberID(req.Body.MemberId), StartsAt: req.Body.StartsAt, EndsAt: req.Body.EndsAt,
		Station: req.Body.Station, Notes: deref(req.Body.Notes),
	})
	if err == nil {
		return oapi.CreateShift201JSONResponse(toShift(sh)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.CreateShift403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusNotFound:
		return oapi.CreateShift404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.CreateShift409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusUnprocessableEntity:
		return oapi.CreateShift422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: oapi.ValidationFailedApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) UpdateShift(ctx context.Context, req oapi.UpdateShiftRequestObject) (oapi.UpdateShiftResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.UpdateShift401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	sh, err := s.hr.UpdateShift(ctx, p, domain.ShiftID(req.ShiftId), hrapp.ShiftChange{
		StartsAt: req.Body.StartsAt, EndsAt: req.Body.EndsAt, Station: req.Body.Station, Notes: req.Body.Notes,
	})
	if err == nil {
		return oapi.UpdateShift200JSONResponse(toShift(sh)), nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.UpdateShift403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusNotFound:
		return oapi.UpdateShift404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.UpdateShift409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusUnprocessableEntity:
		return oapi.UpdateShift422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: oapi.ValidationFailedApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) DeleteShift(ctx context.Context, req oapi.DeleteShiftRequestObject) (oapi.DeleteShiftResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.DeleteShift401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	err := s.hr.DeleteShift(ctx, p, domain.ShiftID(req.ShiftId))
	if err == nil {
		return oapi.DeleteShift204Response{}, nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.DeleteShift403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusNotFound:
		return oapi.DeleteShift404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusConflict:
		return oapi.DeleteShift409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}

func (s *Server) PublishShifts(ctx context.Context, req oapi.PublishShiftsRequestObject) (oapi.PublishShiftsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.PublishShifts401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	q := hrapp.PublishQuery{From: req.Body.From, TeamID: oam.TeamID(deref(req.Body.TeamId))}
	if req.Body.To != nil {
		q.To = *req.Body.To
	}
	n, err := s.hr.PublishShifts(ctx, p, q)
	if err == nil {
		return oapi.PublishShifts200JSONResponse{Published: n}, nil
	}
	switch status, pr := classify(err); status {
	case http.StatusForbidden:
		return oapi.PublishShifts403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(pr)}, nil
	case http.StatusUnprocessableEntity:
		return oapi.PublishShifts422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: oapi.ValidationFailedApplicationProblemPlusJSONResponse(pr)}, nil
	}
	return nil, err
}
