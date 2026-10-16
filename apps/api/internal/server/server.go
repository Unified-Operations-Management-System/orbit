// Package server implements the handlers declared by the OpenAPI contract.
//
// The method set is generated (oapi.StrictServerInterface): when someone adds an
// operation to packages/api-spec and regenerates, this package stops compiling
// until the new handler exists. Request bodies and params arrive already
// validated against the spec (see internal/httpx.RequestValidator).
package server

import (
	"context"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/oapi"
)

type Server struct {
	store *store
}

// Compile-time check that every operation in the spec is implemented.
var _ oapi.StrictServerInterface = (*Server)(nil)

func New() *Server {
	return &Server{store: newStore()}
}

func (s *Server) GetHealth(ctx context.Context, _ oapi.GetHealthRequestObject) (oapi.GetHealthResponseObject, error) {
	return oapi.GetHealth200JSONResponse{Status: oapi.Ok}, nil
}

func (s *Server) ListTodos(ctx context.Context, _ oapi.ListTodosRequestObject) (oapi.ListTodosResponseObject, error) {
	return oapi.ListTodos200JSONResponse(s.store.list()), nil
}

func (s *Server) CreateTodo(ctx context.Context, req oapi.CreateTodoRequestObject) (oapi.CreateTodoResponseObject, error) {
	return oapi.CreateTodo201JSONResponse(s.store.create(req.Body.Title)), nil
}

func (s *Server) UpdateTodo(ctx context.Context, req oapi.UpdateTodoRequestObject) (oapi.UpdateTodoResponseObject, error) {
	todo, ok := s.store.setDone(req.Id, req.Body.Done)
	if !ok {
		return oapi.UpdateTodo404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: notFound()}, nil
	}
	return oapi.UpdateTodo200JSONResponse(todo), nil
}

func (s *Server) DeleteTodo(ctx context.Context, req oapi.DeleteTodoRequestObject) (oapi.DeleteTodoResponseObject, error) {
	if !s.store.delete(req.Id) {
		return oapi.DeleteTodo404ApplicationProblemPlusJSONResponse{NotFoundApplicationProblemPlusJSONResponse: notFound()}, nil
	}
	return oapi.DeleteTodo204Response{}, nil
}

func notFound() oapi.NotFoundApplicationProblemPlusJSONResponse {
	detail := "todo not found"
	return oapi.NotFoundApplicationProblemPlusJSONResponse{Title: "Not Found", Status: 404, Detail: &detail}
}
