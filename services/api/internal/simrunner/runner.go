package simrunner

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"
)

type Runner struct {
	Binary  string
	WorkDir string
	Timeout time.Duration
}

type Result struct {
	TracePath   string
	SummaryPath string
}

type Failure struct {
	Code    string
	Message string
}

func (f *Failure) Error() string { return f.Code + ": " + f.Message }

var exitCodes = map[int]string{
	2: "model_error",
	3: "tick_storm",
}

func (r *Runner) Run(ctx context.Context, runID string, model []byte, seed int64) (*Result, error) {
	dir := filepath.Join(r.WorkDir, "runs", runID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("create run dir: %w", err)
	}

	modelPath := filepath.Join(dir, "model.json")
	if err := os.WriteFile(modelPath, model, 0o644); err != nil {
		return nil, fmt.Errorf("write model: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, r.Timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, r.Binary,
		"--model", modelPath,
		"--seed", strconv.FormatInt(seed, 10),
		"--out", dir,
	)
	cmd.WaitDelay = 2 * time.Second

	var stderr bytes.Buffer
	cmd.Stderr = &limitedWriter{w: &stderr, n: 16 << 10}

	err := cmd.Run()
	if err != nil {
		if errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return nil, &Failure{Code: "timeout", Message: "simulation exceeded time limit"}
		}

		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			code, ok := exitCodes[exitErr.ExitCode()]
			if !ok {
				code = "internal_error"
			}

			return nil, &Failure{Code: code, Message: stderr.String()}
		}

		return nil, fmt.Errorf("start sim: %w", err)
	}

	res := &Result{
		TracePath:   filepath.Join(dir, "trace.bin"),
		SummaryPath: filepath.Join(dir, "summary.json"),
	}

	for _, p := range []string{res.TracePath, res.SummaryPath} {
		if _, err := os.Stat(p); err != nil {
			return nil, &Failure{Code: "internal_error", Message: "sim exited 0 but did not write " + filepath.Base(p)}
		}
	}

	return res, nil
}

type limitedWriter struct {
	w *bytes.Buffer
	n int
}

func (l *limitedWriter) Write(p []byte) (int, error) {
	if room := l.n - l.w.Len(); room > 0 {
		if len(p) > room {
			l.w.Write(p[:room])
		} else {
			l.w.Write(p)
		}
	}

	return len(p), nil
}
