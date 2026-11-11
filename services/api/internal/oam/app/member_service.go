package app

import (
	"context"
	"errors"
	"fmt"

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

// MemberService implements the OAM member use cases.
type MemberService struct {
	repo   domain.MemberRepository
	mailer Mailer
	clock  Clock
	newID  IDGenerator
}

// NewMemberService wires a MemberService from its collaborators.
func NewMemberService(repo domain.MemberRepository, mailer Mailer, clock Clock, newID IDGenerator) *MemberService {
	return &MemberService{repo: repo, mailer: mailer, clock: clock, newID: newID}
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

// ListMembers returns every member of the caller's organization.
func (s *MemberService) ListMembers(ctx context.Context, p Principal) ([]domain.Member, error) {
	if err := domain.Can(p.Role, domain.ActionListMembers); err != nil {
		return nil, err
	}
	return s.repo.ListByOrg(ctx, p.OrgID)
}

// InviteMember invites a new member to the caller's organization. The member is
// saved before the invitation email is sent; a mail failure is returned wrapped
// and leaves the saved member in place.
func (s *MemberService) InviteMember(ctx context.Context, p Principal, in InviteInput) (domain.Member, error) {
	if err := domain.Can(p.Role, domain.ActionInviteMember); err != nil {
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
	if err := s.repo.Save(ctx, m); err != nil {
		return domain.Member{}, err
	}
	if err := s.mailer.SendInvite(ctx, m); err != nil {
		return domain.Member{}, fmt.Errorf("send invitation email: %w", err)
	}
	return m, nil
}

// ApproveMember activates a pending member of the caller's organization.
func (s *MemberService) ApproveMember(ctx context.Context, p Principal, id domain.MemberID) (domain.Member, error) {
	if err := domain.Can(p.Role, domain.ActionApproveMember); err != nil {
		return domain.Member{}, err
	}
	m, err := s.repo.GetByID(ctx, p.OrgID, id)
	if err != nil {
		return domain.Member{}, err
	}
	if err := m.Approve(s.clock.Now()); err != nil {
		return domain.Member{}, err
	}
	if err := s.repo.Save(ctx, m); err != nil {
		return domain.Member{}, err
	}
	return m, nil
}

// DeactivateMember deactivates a member of the caller's organization.
func (s *MemberService) DeactivateMember(ctx context.Context, p Principal, id domain.MemberID) (domain.Member, error) {
	if err := domain.Can(p.Role, domain.ActionDeactivateMember); err != nil {
		return domain.Member{}, err
	}
	m, err := s.repo.GetByID(ctx, p.OrgID, id)
	if err != nil {
		return domain.Member{}, err
	}
	if err := m.Deactivate(); err != nil {
		return domain.Member{}, err
	}
	if err := s.repo.Save(ctx, m); err != nil {
		return domain.Member{}, err
	}
	return m, nil
}
