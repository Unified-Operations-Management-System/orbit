package domain

import (
	"context"
	"time"
)

// AuditAction names a recorded change; the values match the web's audit filters.
type AuditAction string

// The recorded changes (BR-OAM-R10).
const (
	AuditMemberInvited      AuditAction = "member.invited"
	AuditMemberApproved     AuditAction = "member.approved"
	AuditMemberDeactivated  AuditAction = "member.deactivated"
	AuditRoleChanged        AuditAction = "role.changed"
	AuditPermissionsUpdated AuditAction = "permissions.updated"
)

// AuditEntry is one change: who did what, when.
type AuditEntry struct {
	ID        string
	OrgID     OrgID
	At        time.Time
	ActorID   MemberID
	ActorName string // filled in when reading
	Action    AuditAction
	Summary   string
}

// AuditLog records changes and lists them newest first.
type AuditLog interface {
	Record(ctx context.Context, e AuditEntry) error
	List(ctx context.Context, org OrgID, limit int) ([]AuditEntry, error)
}
