package domain

import "context"

// MemberRepository persists members, scoped per organization.
type MemberRepository interface {
	// ListByOrg returns every member of org sorted by InvitedAt, then Name.
	ListByOrg(ctx context.Context, org OrgID) ([]Member, error)
	// GetByID returns the member of org with id, or ErrNotFound.
	GetByID(ctx context.Context, org OrgID, id MemberID) (Member, error)
	// GetByEmail returns the member of org whose email is e, or ErrNotFound.
	GetByEmail(ctx context.Context, org OrgID, e Email) (Member, error)
	// Save inserts or updates m by ID.
	Save(ctx context.Context, m Member) error
}
