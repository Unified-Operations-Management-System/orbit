package infra

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// DemoOrg is the organization seeded for the demo.
const DemoOrg domain.OrgID = "org-invex"

// DemoMembers returns the demo organization's six members. Invitations are a
// day apart and the most recent is at now; each expires InviteTTL after it was
// sent.
func DemoMembers(now time.Time) []domain.Member {
	const day = 24 * time.Hour
	invited := func(daysAgo int) time.Time { return now.Add(-time.Duration(daysAgo) * day) }
	members := []domain.Member{
		{ID: "m-1", OrgID: DemoOrg, Name: "Alex Morgan", Email: "alex@example.com", Role: domain.RoleOwner, Status: domain.StatusActive, InvitedAt: invited(5)},
		{ID: "m-2", OrgID: DemoOrg, Name: "Jordan Lee", Email: "jordan@example.com", Role: domain.RoleSupervisor, Status: domain.StatusActive, InvitedAt: invited(4)},
		{ID: "m-3", OrgID: DemoOrg, Name: "Sam Patel", Email: "sam@example.com", Role: domain.RoleEmployee, Status: domain.StatusActive, InvitedAt: invited(3)},
		{ID: "m-4", OrgID: DemoOrg, Name: "Riley Chen", Email: "riley@example.com", Role: domain.RoleHRAdmin, Status: domain.StatusActive, InvitedAt: invited(2)},
		{ID: "m-5", OrgID: DemoOrg, Name: "Casey Brown", Email: "casey@example.com", Role: domain.RoleEmployee, Status: domain.StatusPending, InvitedAt: invited(1)},
		{ID: "m-6", OrgID: DemoOrg, Name: "Taylor Kim", Email: "taylor@example.com", Role: domain.RoleEmployee, Status: domain.StatusDeactivated, InvitedAt: invited(0)},
	}
	for i := range members {
		members[i].ExpiresAt = members[i].InvitedAt.Add(domain.InviteTTL)
	}
	return members
}

// NewIDGenerator returns an app.IDGenerator producing "m-" followed by 12
// random hex characters. It panics if the system entropy source fails, which is
// unrecoverable.
func NewIDGenerator() app.IDGenerator {
	return func() domain.MemberID {
		var b [6]byte
		if _, err := rand.Read(b[:]); err != nil {
			panic("infra: reading random bytes: " + err.Error())
		}
		return domain.MemberID("m-" + hex.EncodeToString(b[:]))
	}
}
