package server

import (
	"slices"
	"sync"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/oapi"
)

// store is an in-memory todo store. Swap it for Postgres (e.g. with sqlc) later;
// the handlers only depend on these four methods.
type store struct {
	mu     sync.Mutex
	nextID int64
	todos  []oapi.Todo
}

func newStore() *store {
	s := &store{nextID: 1}
	s.create("Read the README")
	s.create("Propose an API change in packages/api-spec")
	return s
}

func (s *store) list() []oapi.Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	return slices.Clone(s.todos)
}

func (s *store) create(title string) oapi.Todo {
	s.mu.Lock()
	defer s.mu.Unlock()
	t := oapi.Todo{Id: s.nextID, Title: title, CreatedAt: time.Now().UTC()}
	s.nextID++
	s.todos = append(s.todos, t)
	return t
}

func (s *store) setDone(id int64, done bool) (oapi.Todo, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.todos {
		if s.todos[i].Id == id {
			s.todos[i].Done = done
			return s.todos[i], true
		}
	}
	return oapi.Todo{}, false
}

func (s *store) delete(id int64) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	i := slices.IndexFunc(s.todos, func(t oapi.Todo) bool { return t.Id == id })
	if i < 0 {
		return false
	}
	s.todos = slices.Delete(s.todos, i, i+1)
	return true
}
