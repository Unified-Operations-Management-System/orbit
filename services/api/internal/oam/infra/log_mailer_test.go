package infra_test

import (
	"context"
	"log/slog"
	"testing"

	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/domain"
	"github.com/Unified-Operations-Management-System/orbit/services/api/internal/oam/infra"
)

func TestLogMailerSendInvite(t *testing.T) {
	mailer := infra.NewLogMailer(slog.New(slog.DiscardHandler))
	err := mailer.SendInvite(context.Background(), domain.Member{
		ID: "m-1", Email: "alex@example.com",
	})
	if err != nil {
		t.Fatalf("SendInvite: %v", err)
	}
}
