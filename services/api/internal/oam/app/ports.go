package app

import (
	"context"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
)

// Mailer delivers invitation emails.
type Mailer interface {
	SendInvite(ctx context.Context, m domain.Member) error
}

// Clock supplies the current time; tests substitute a fake.
type Clock interface {
	Now() time.Time
}

// SystemClock is the production Clock.
type SystemClock struct{}

// Now returns the current time in UTC.
func (SystemClock) Now() time.Time { return time.Now().UTC() }

var _ Clock = SystemClock{}
