package infra

import (
	"context"
	"log/slog"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/app"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// LogMailer is a Mailer that logs instead of sending. It stands in until an
// email provider is wired up.
type LogMailer struct {
	log *slog.Logger
}

var _ app.Mailer = (*LogMailer)(nil)

// NewLogMailer wraps l.
func NewLogMailer(l *slog.Logger) *LogMailer {
	return &LogMailer{log: l}
}

// SendInvite logs the invitation at Info level.
func (m *LogMailer) SendInvite(ctx context.Context, member domain.Member) error {
	m.log.InfoContext(ctx, "invitation email (not sent: no provider yet)",
		"member_id", member.ID,
		"email", member.Email,
		"expires_at", member.ExpiresAt,
	)
	return nil
}
