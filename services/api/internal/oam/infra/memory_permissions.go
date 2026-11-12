package infra

import (
	"context"
	"maps"
	"slices"
	"sync"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// MemoryPermissionRepository keeps matrices in memory, for unit tests.
type MemoryPermissionRepository struct {
	mu sync.Mutex
	m  map[domain.OrgID]domain.Matrix
}

// NewMemoryPermissionRepository starts every company on the default matrix.
func NewMemoryPermissionRepository() *MemoryPermissionRepository {
	return &MemoryPermissionRepository{m: map[domain.OrgID]domain.Matrix{}}
}

func (r *MemoryPermissionRepository) Get(_ context.Context, org domain.OrgID) (domain.Matrix, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if m, ok := r.m[org]; ok {
		return clone(m), nil
	}
	return domain.DefaultMatrix(), nil
}

func (r *MemoryPermissionRepository) Put(_ context.Context, org domain.OrgID, m domain.Matrix) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.m[org] = clone(m)
	return nil
}

func clone(m domain.Matrix) domain.Matrix {
	out := maps.Clone(m)
	for a, roles := range out {
		out[a] = slices.Clone(roles)
	}
	return out
}

// MemoryAuditLog keeps entries in memory, for unit tests.
type MemoryAuditLog struct {
	mu      sync.Mutex
	Entries []domain.AuditEntry
}

func (l *MemoryAuditLog) Record(_ context.Context, e domain.AuditEntry) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.Entries = append(l.Entries, e)
	return nil
}

func (l *MemoryAuditLog) List(_ context.Context, org domain.OrgID, limit int) ([]domain.AuditEntry, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	var out []domain.AuditEntry
	for i := len(l.Entries) - 1; i >= 0 && len(out) < limit; i-- {
		if l.Entries[i].OrgID == org {
			out = append(out, l.Entries[i])
		}
	}
	return out, nil
}
