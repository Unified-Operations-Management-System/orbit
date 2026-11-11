// Package infra provides adapters for the OAM domain and application ports.
package infra

import (
	"context"
	"sort"
	"sync"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// MemoryMemberRepository is an in-memory domain.MemberRepository used for the
// Architectural Release; a PostgreSQL implementation will replace it behind the
// same interface.
type MemoryMemberRepository struct {
	mu      sync.RWMutex
	members map[domain.MemberID]domain.Member
}

var _ domain.MemberRepository = (*MemoryMemberRepository)(nil)

// NewMemoryMemberRepository returns a repository seeded with members.
func NewMemoryMemberRepository(seed ...domain.Member) *MemoryMemberRepository {
	r := &MemoryMemberRepository{members: make(map[domain.MemberID]domain.Member, len(seed))}
	for _, m := range seed {
		r.members[m.ID] = m
	}
	return r
}

// ListByOrg returns copies of org's members sorted by InvitedAt, then Name.
func (r *MemoryMemberRepository) ListByOrg(_ context.Context, org domain.OrgID) ([]domain.Member, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]domain.Member, 0, len(r.members))
	for _, m := range r.members {
		if m.OrgID == org {
			out = append(out, m)
		}
	}
	sort.Slice(out, func(i, j int) bool {
		if !out[i].InvitedAt.Equal(out[j].InvitedAt) {
			return out[i].InvitedAt.Before(out[j].InvitedAt)
		}
		return out[i].Name < out[j].Name
	})
	return out, nil
}

// GetByID returns a copy of the member of org with id, or ErrNotFound.
func (r *MemoryMemberRepository) GetByID(_ context.Context, org domain.OrgID, id domain.MemberID) (domain.Member, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	m, ok := r.members[id]
	if !ok || m.OrgID != org {
		return domain.Member{}, domain.ErrNotFound
	}
	return m, nil
}

// GetByEmail returns a copy of the member of org whose email is e, or ErrNotFound.
func (r *MemoryMemberRepository) GetByEmail(_ context.Context, org domain.OrgID, e domain.Email) (domain.Member, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, m := range r.members {
		if m.OrgID == org && m.Email == e {
			return m, nil
		}
	}
	return domain.Member{}, domain.ErrNotFound
}

// Save inserts or updates m by ID.
func (r *MemoryMemberRepository) Save(_ context.Context, m domain.Member) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.members[m.ID] = m
	return nil
}
