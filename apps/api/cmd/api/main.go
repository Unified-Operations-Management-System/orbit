// Command api runs the HTTP server.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/app"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Browser origins allowed to call the API directly (the Expo web dev server by default).
	// Set ALLOWED_ORIGINS="" in production to disable, or list your real origins.
	origins, ok := os.LookupEnv("ALLOWED_ORIGINS")
	if !ok {
		origins = "http://localhost:8081"
	}

	handler, err := app.NewHandler(origins)
	if err != nil {
		slog.Error("startup failed", "err", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.Info("api listening", "addr", srv.Addr, "docs", "http://localhost:"+port+"/docs")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	slog.Info("api stopped")
}
