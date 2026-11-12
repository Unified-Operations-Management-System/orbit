package app

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// IDGenerator produces new member IDs.
type IDGenerator func() domain.MemberID

// InviteInput is a request to invite a member, as submitted by a caller.
type InviteInput struct {
	Name  string
	Email string
	Role  string
}

// MemberService implements the OAM use cases: sign-in session, members, roles,
// the permission matrix and the audit history.
type MemberService struct {
	repo   domain.MemberRepository
	perms  domain.PermissionRepository
	audit  domain.AuditLog
	tx     TxRunner
	mailer Mailer
	clock  Clock
	newID  IDGenerator
}

// Deps are MemberService's collaborators.
type Deps struct {
	Members     domain.MemberRepository
	Permissions domain.PermissionRepository
	Audit       domain.AuditLog
	Tx          TxRunner
	Mailer      Mailer
	Clock       Clock
	NewID       IDGenerator
}

// NewMemberService wires a MemberService from its collaborators.
func NewMemberService(d Deps) *MemberService {
	return &MemberService{repo: d.Members, perms: d.Permissions, audit: d.Audit, tx: d.Tx, mailer: d.Mailer, clock: d.Clock, newID: d.NewID}
}

// can checks p against the company's current permission matrix.
func (s *MemberService) can(ctx context.Context, p Principal, a domain.Action) error {
	m, err := s.perms.Get(ctx, p.OrgID)
	if err != nil {
		return err
	}
	return m.Can(p.Role, a)
}

// saveAndRecord saves m and its audit entry in one transaction.
func (s *MemberService) saveAndRecord(ctx context.Context, p Principal, m domain.Member, action domain.AuditAction, summary string) error {
	return s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.repo.Save(ctx, m); err != nil {
			return err
		}
		return s.record(ctx, p, action, summary)
	})
}

func (s *MemberService) record(ctx context.Context, p Principal, action domain.AuditAction, summary string) error {
	return s.audit.Record(ctx, domain.AuditEntry{
		ID: "a-" + strings.TrimPrefix(string(s.newID()), "m-"), OrgID: p.OrgID, At: s.clock.Now(),
		ActorID: p.MemberID, Action: action, Summary: summary,
	})
}

// Session returns the caller's own membership. A membership that is not Active
// yields ErrUnauthenticated.
func (s *MemberService) Session(ctx context.Context, p Principal) (domain.Member, error) {
	m, err := s.repo.GetByID(ctx, p.OrgID, p.MemberID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return domain.Member{}, ErrUnauthenticated
		}
		return domain.Member{}, err
	}
	if m.Status != domain.StatusActive {
		return domain.Member{}, ErrUnauthenticated
	}
	return m, nil
}

// ListMembers returns the members of the caller's organization that the
// caller's role may see (BR-OAM-R09).
func (s *MemberService) ListMembers(ctx context.Context, p Principal) ([]domain.Member, error) {
	if err := s.can(ctx, p, domain.ActionListMembers); err != nil {
		return nil, err
	}
	all, err := s.repo.ListByOrg(ctx, p.OrgID)
	if err != nil {
		return nil, err
	}
	visible := make([]domain.Member, 0, len(all))
	for _, m := range all {
		if domain.CanSee(p.Role, p.MemberID, p.TeamID, m) {
			visible = append(visible, m)
		}
	}
	return visible, nil
}

// InviteMember invites a new member to the caller's organization. The member is
// saved before the invitation email is sent; a mail failure is returned wrapped
// and leaves the saved member in place.
func (s *MemberService) InviteMember(ctx context.Context, p Principal, in InviteInput) (domain.Member, error) {
	if err := s.can(ctx, p, domain.ActionInviteMember); err != nil {
		return domain.Member{}, err
	}
	email, err := domain.ParseEmail(in.Email)
	if err != nil {
		return domain.Member{}, err
	}
	role, err := domain.ParseRole(in.Role)
	if err != nil {
		return domain.Member{}, err
	}
	if _, err := s.repo.GetByEmail(ctx, p.OrgID, email); err == nil {
		return domain.Member{}, domain.ErrDuplicateEmail
	} else if !errors.Is(err, domain.ErrNotFound) {
		return domain.Member{}, err
	}
	m, err := domain.NewInvitedMember(s.newID(), p.OrgID, in.Name, email, role, s.clock.Now())
	if err != nil {
		return domain.Member{}, err
	}
	if err := s.saveAndRecord(ctx, p, m, domain.AuditMemberInvited, fmt.Sprintf("Invited %s as %s", m.Email, m.Role)); err != nil {
		return domain.Member{}, err
	}
	if err := s.mailer.SendInvite(ctx, m); err != nil {
		return domain.Member{}, fmt.Errorf("send invitation email: %w", err)
	}
	return m, nil
}

// ApproveMember activates a pending member of the caller's organization.
func (s *MemberService) ApproveMember(ctx context.Context, p Principal, id domain.MemberID) (domain.Member, error) {
	if err := s.can(ctx, p, domain.ActionApproveMember); err != nil {
		return domain.Member{}, err
	}
	m, err := s.repo.GetByID(ctx, p.OrgID, id)
	if err != nil {
		return domain.Member{}, err
	}
	if err := m.Approve(s.clock.Now()); err != nil {
		return domain.Member{}, err
	}
	if err := s.saveAndRecord(ctx, p, m, domain.AuditMemberApproved, fmt.Sprintf("Approved %s's membership", m.Name)); err != nil {
		return domain.Member{}, err
	}
	return m, nil
}

// DeactivateMember deactivates a member of the caller's organization.
func (s *MemberService) DeactivateMember(ctx context.Context, p Principal, id domain.MemberID) (domain.Member, error) {
	if err := s.can(ctx, p, domain.ActionDeactivateMember); err != nil {
		return domain.Member{}, err
	}
	m, err := s.repo.GetByID(ctx, p.OrgID, id)
	if err != nil {
		return domain.Member{}, err
	}
	if err := m.Deactivate(); err != nil {
		return domain.Member{}, err
	}
	if err := s.saveAndRecord(ctx, p, m, domain.AuditMemberDeactivated, fmt.Sprintf("Deactivated %s", m.Name)); err != nil {
		return domain.Member{}, err
	}
	return m, nil
}

// ChangeRole gives a member a new role (UC-OAM-06). Who may do it comes from the
// company's matrix; nobody becomes Owner and the owner's role can't change.
func (s *MemberService) ChangeRole(ctx context.Context, p Principal, id domain.MemberID, role string) (domain.Member, error) {
	if err := s.can(ctx, p, domain.ActionAssignRoles); err != nil {
		return domain.Member{}, err
	}
	r, err := domain.ParseRole(role)
	if err != nil {
		return domain.Member{}, err
	}
	m, err := s.repo.GetByID(ctx, p.OrgID, id)
	if err != nil {
		return domain.Member{}, err
	}
	if err := m.ChangeRole(r); err != nil {
		return domain.Member{}, err
	}
	if err := s.saveAndRecord(ctx, p, m, domain.AuditRoleChanged, fmt.Sprintf("Changed %s's role to %s", m.Name, m.Role)); err != nil {
		return domain.Member{}, err
	}
	return m, nil
}

// Permissions returns the company's roles matrix; every member may read it.
func (s *MemberService) Permissions(ctx context.Context, p Principal) (domain.Matrix, error) {
	return s.perms.Get(ctx, p.OrgID)
}

// UpdatePermissions replaces the matrix. Only the Owner may, whatever the matrix
// says, so nobody can grant themselves the right to edit it.
func (s *MemberService) UpdatePermissions(ctx context.Context, p Principal, m domain.Matrix) (domain.Matrix, error) {
	if p.Role != domain.RoleOwner {
		return nil, domain.ErrForbidden
	}
	if err := m.Validate(); err != nil {
		return nil, err
	}
	err := s.tx.WithinTx(ctx, func(ctx context.Context) error {
		if err := s.perms.Put(ctx, p.OrgID, m); err != nil {
			return err
		}
		return s.record(ctx, p, domain.AuditPermissionsUpdated, "Updated roles and permissions")
	})
	if err != nil {
		return nil, err
	}
	return s.perms.Get(ctx, p.OrgID)
}

// AuditHistory lists the company's recorded changes, newest first (Owner, HR Admin).
func (s *MemberService) AuditHistory(ctx context.Context, p Principal, limit int) ([]domain.AuditEntry, error) {
	if err := s.can(ctx, p, domain.ActionViewAudit); err != nil {
		return nil, err
	}
	return s.audit.List(ctx, p.OrgID, limit)
}
