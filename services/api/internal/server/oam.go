package server

import (
	"context"
	"errors"
	"net/http"
	"slices"

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
	var team *string
	if m.TeamID != "" {
		t := string(m.TeamID)
		team = &t
	}
	return oapi.Member{
		TeamId:    team,
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

func (s *Server) ChangeMemberRole(ctx context.Context, req oapi.ChangeMemberRoleRequestObject) (oapi.ChangeMemberRoleResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ChangeMemberRole401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.ChangeRole(ctx, p, domain.MemberID(req.MemberId), string(req.Body.Role))
	var ve domain.ValidationError
	switch {
	case err == nil:
		return oapi.ChangeMemberRole200JSONResponse(toMember(m)), nil
	case errors.Is(err, domain.ErrForbidden):
		return oapi.ChangeMemberRole403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	case errors.Is(err, domain.ErrNotFound):
		return oapi.ChangeMemberRole404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: oapi.NotFoundApplicationProblemPlusJSONResponse(problem(http.StatusNotFound, err))}, nil
	case errors.Is(err, domain.ErrOwnerProtected), errors.Is(err, domain.ErrInvalidTransition):
		return oapi.ChangeMemberRole409ApplicationProblemPlusJSONResponse{ConflictApplicationProblemPlusJSONResponse: oapi.ConflictApplicationProblemPlusJSONResponse(problem(http.StatusConflict, err))}, nil
	case errors.As(err, &ve):
		return oapi.ChangeMemberRole422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: validation(ve)}, nil
	default:
		return nil, err
	}
}

func (s *Server) GetPermissions(ctx context.Context, _ oapi.GetPermissionsRequestObject) (oapi.GetPermissionsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.GetPermissions401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	m, err := s.members.Permissions(ctx, p)
	if err != nil {
		return nil, err
	}
	return oapi.GetPermissions200JSONResponse(toMatrix(m)), nil
}

func (s *Server) UpdatePermissions(ctx context.Context, req oapi.UpdatePermissionsRequestObject) (oapi.UpdatePermissionsResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.UpdatePermissions401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	in := domain.Matrix{}
	for _, row := range req.Body.Rows {
		roles := make([]domain.Role, len(row.Allowed))
		for i, r := range row.Allowed {
			roles[i] = domain.Role(r)
		}
		in[domain.Action(row.Action)] = roles
	}
	m, err := s.members.UpdatePermissions(ctx, p, in)
	var ve domain.ValidationError
	switch {
	case err == nil:
		return oapi.UpdatePermissions200JSONResponse(toMatrix(m)), nil
	case errors.Is(err, domain.ErrForbidden):
		return oapi.UpdatePermissions403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	case errors.As(err, &ve):
		return oapi.UpdatePermissions422ApplicationProblemPlusJSONResponse{ValidationFailedApplicationProblemPlusJSONResponse: validation(ve)}, nil
	default:
		return nil, err
	}
}

func (s *Server) ListAuditEntries(ctx context.Context, req oapi.ListAuditEntriesRequestObject) (oapi.ListAuditEntriesResponseObject, error) {
	p, ok := PrincipalFrom(ctx)
	if !ok {
		return oapi.ListAuditEntries401ApplicationProblemPlusJSONResponse{UnauthorizedApplicationProblemPlusJSONResponse: unauthorized()}, nil
	}
	limit := 200
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}
	entries, err := s.members.AuditHistory(ctx, p, limit)
	if errors.Is(err, domain.ErrForbidden) {
		return oapi.ListAuditEntries403ApplicationProblemPlusJSONResponse{ForbiddenApplicationProblemPlusJSONResponse: oapi.ForbiddenApplicationProblemPlusJSONResponse(problem(http.StatusForbidden, err))}, nil
	}
	if err != nil {
		return nil, err
	}
	out := make(oapi.ListAuditEntries200JSONResponse, len(entries))
	for i, e := range entries {
		actorID := string(e.ActorID)
		out[i] = oapi.AuditEntry{Id: e.ID, At: e.At, ActorId: &actorID, Actor: e.ActorName, Action: oapi.AuditAction(e.Action), Summary: e.Summary}
	}
	return out, nil
}

// toMatrix lists every action in display order, with the owner-locked flag.
func toMatrix(m domain.Matrix) oapi.PermissionMatrix {
	rows := make([]oapi.PermissionRow, 0, len(domain.MatrixActions))
	for _, a := range domain.MatrixActions {
		allowed := make([]oapi.MemberRole, 0, len(m[a]))
		for _, r := range m[a] {
			allowed = append(allowed, oapi.MemberRole(r))
		}
		locked := slices.Contains(domain.OwnerLocked, a)
		rows = append(rows, oapi.PermissionRow{Action: oapi.PermissionAction(a), Allowed: allowed, OwnerLocked: &locked})
	}
	return oapi.PermissionMatrix{Rows: rows}
}
