package server

import (
	"context"
	"errors"
	"net/http"

	openapi_types "github.com/oapi-codegen/runtime/types"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oapi"
)

// Organization and Access Management operations. Each handler takes the caller
// from the context, delegates to app.MemberService and maps domain errors to
// problem responses; no business rules live here.

func (s *Server) GetSession(ctx context.Context, _ oapi.GetSessionRequestObject) (oapi.GetSessionResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.GetSession401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.Session(ctx, p)
	if errors.Is(err, app.ErrUnauthenticated) {
		return oapi.GetSession401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	if err != nil {
		return nil, err
	}
	return oapi.GetSession200JSONResponse(toMember(m)), nil
}

func (s *Server) ListMembers(ctx context.Context, _ oapi.ListMembersRequestObject) (oapi.ListMembersResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListMembers401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	ms, err := s.members.ListMembers(ctx, p)
	if errors.Is(err, domain.ErrForbidden) {
		return oapi.ListMembers403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	}
	if err != nil {
		return nil, err
	}
	out := make(oapi.ListMembers200JSONResponse, len(ms))
	for i, m := range ms {
		out[i] = toMember(m)
	}
	return out, nil
}

func (s *Server) InviteMember(ctx context.Context, req oapi.InviteMemberRequestObject) (oapi.InviteMemberResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.InviteMember401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.InviteMember(ctx, p, app.InviteInput{
		Name:  req.Body.Name,
		Email: string(req.Body.Email),
		Role:  string(req.Body.Role),
	})
	var ve domain.ValidationError
	switch {
	case err == nil:
		return oapi.InviteMember201JSONResponse(toMember(m)), nil
	case errors.Is(err, domain.ErrForbidden):
		return oapi.InviteMember403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	case errors.Is(err, domain.ErrDuplicateEmail):
		return oapi.InviteMember409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(problem(http.StatusConflict, err))}, nil
	case errors.As(err, &ve):
		return oapi.InviteMember422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: validation(ve)}, nil
	default:
		return nil, err
	}
}

func (s *Server) ApproveMember(ctx context.Context, req oapi.ApproveMemberRequestObject) (oapi.ApproveMemberResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ApproveMember401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.ApproveMember(ctx, p, domain.MemberID(req.MemberId))
	switch {
	case err == nil:
		return oapi.ApproveMember200JSONResponse(toMember(m)), nil
	case errors.Is(err, domain.ErrForbidden):
		return oapi.ApproveMember403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	case errors.Is(err, domain.ErrNotFound):
		return oapi.ApproveMember404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(problem(http.StatusNotFound, err))}, nil
	case errors.Is(err, domain.ErrInviteExpired), errors.Is(err, domain.ErrInvalidTransition):
		return oapi.ApproveMember409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(problem(http.StatusConflict, err))}, nil
	default:
		return nil, err
	}
}

func (s *Server) DeactivateMember(ctx context.Context, req oapi.DeactivateMemberRequestObject) (oapi.DeactivateMemberResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.DeactivateMember401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.DeactivateMember(ctx, p, domain.MemberID(req.MemberId))
	switch {
	case err == nil:
		return oapi.DeactivateMember200JSONResponse(toMember(m)), nil
	case errors.Is(err, domain.ErrForbidden):
		return oapi.DeactivateMember403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	case errors.Is(err, domain.ErrNotFound):
		return oapi.DeactivateMember404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(problem(http.StatusNotFound, err))}, nil
	case errors.Is(err, domain.ErrOwnerProtected), errors.Is(err, domain.ErrInvalidTransition):
		return oapi.DeactivateMember409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(problem(http.StatusConflict, err))}, nil
	default:
		return nil, err
	}
}

func toMember(m domain.Member) oapi.Member {
	return oapi.Member{
		Id:        string(m.ID),
		Name:      m.Name,
		Email:     openapi_types.Email(m.Email),
		Role:      oapi.MemberRole(m.Role),
		Status:    oapi.MemberStatus(m.Status),
		InvitedAt: m.InvitedAt,
		ExpiresAt: m.ExpiresAt,
	}
}

func problem(status int, err error) oapi.Problem {
	detail := err.Error()
	return oapi.Problem{Title: http.StatusText(status), Status: status, Detail: &detail}
}

func unauthorized() oapi.UnauthorizedApplicationProblemPlusJSONResponse {
	return oapi.UnauthorizedApplicationProblemPlusJSONResponse(problem(http.StatusUnauthorized, app.ErrUnauthenticated))
}

func validation(ve domain.ValidationError) oapi.ValidationFailedApplicationProblemPlusJSONResponse {
	p := problem(http.StatusUnprocessableEntity, errors.New("validation failed"))
	p.Errors = &[]oapi.FieldError{{Location: "body." + ve.Field, Message: ve.Message}}
	return oapi.ValidationFailedApplicationProblemPlusJSONResponse(p)
}
