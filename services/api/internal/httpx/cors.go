package httpx

import (
	"net/http"
	"slices"
	"strings"
)

// CORS allows browser origins that can't go through the Next.js /api rewrite,
// such as the Expo web dev server (http://localhost:8081). Native iOS/Android
// apps don't send Origin headers and aren't affected.
//
// Origins come from ALLOWED_ORIGINS (comma-separated). Empty = CORS disabled.
func CORS(allowedOrigins string, next http.Handler) http.Handler {
	var origins []string
	for o := range strings.SplitSeq(allowedOrigins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(origins, origin) {
			h := w.Header()
			h.Set("Access-Control-Allow-Origin", origin)
			h.Add("Vary", "Origin")
			h.Set("Access-Control-Allow-Credentials", "true")

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				h.Set("Access-Control-Allow-Headers", r.Header.Get("Access-Control-Request-Headers"))
				h.Set("Access-Control-Max-Age", "600")
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
