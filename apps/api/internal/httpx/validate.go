package httpx

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	middleware "github.com/oapi-codegen/nethttp-middleware"

	"github.com/Unified-Operations-Management-System/orbit/apps/api/internal/oapi"
)

// RequestValidator rejects any request that doesn't match the OpenAPI contract
// (unknown route, bad path param, body that breaks a schema rule) before it
// reaches a handler. Errors are returned as 422 problem details with one entry
// per invalid field, matching the ValidationFailed response in the spec.
func RequestValidator(spec *openapi3.T) func(http.Handler) http.Handler {
	// Servers in the spec describe where clients connect; don't enforce them on
	// the Host header (phones on the LAN, Docker service names, etc.).
	spec.Servers = nil

	return middleware.OapiRequestValidatorWithOptions(spec, &middleware.Options{
		Options: openapi3filter.Options{
			MultiError:         true,
			AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
		},
		DoNotValidateServers: true,
		ErrorHandlerWithOpts: func(_ context.Context, err error, w http.ResponseWriter, _ *http.Request, opts middleware.ErrorHandlerOpts) {
			switch {
			case errors.Is(err, routers.ErrPathNotFound):
				WriteProblem(w, http.StatusNotFound, "no such route", nil)
			case errors.Is(err, routers.ErrMethodNotAllowed):
				WriteProblem(w, http.StatusMethodNotAllowed, "method not allowed", nil)
			default:
				WriteProblem(w, http.StatusUnprocessableEntity, "validation failed", fieldErrors(err))
			}
		},
	})
}

// fieldErrors flattens kin-openapi's error tree into the contract's FieldError list.
// It uses direct type switches (not errors.As) so a RequestError is never skipped
// in favour of the MultiError it wraps; the RequestError says which param/body failed.
func fieldErrors(err error) []oapi.FieldError {
	switch e := err.(type) {
	case openapi3.MultiError:
		var out []oapi.FieldError
		for _, inner := range e {
			out = append(out, fieldErrors(inner)...)
		}
		return out
	case *openapi3filter.RequestError:
		return requestFieldErrors(e)
	default:
		return []oapi.FieldError{{Location: "request", Message: err.Error()}}
	}
}

func requestFieldErrors(reqErr *openapi3filter.RequestError) []oapi.FieldError {
	base := "body"
	if reqErr.Parameter != nil {
		base = reqErr.Parameter.In + "." + reqErr.Parameter.Name
	}

	var parseErr *openapi3filter.ParseError
	if errors.As(reqErr.Err, &parseErr) {
		if p := reqErr.Parameter; p != nil {
			kind := "value"
			if p.Schema != nil && p.Schema.Value != nil && p.Schema.Value.Type != nil {
				if types := p.Schema.Value.Type.Slice(); len(types) > 0 {
					kind = types[0]
				}
			}
			return []oapi.FieldError{{Location: base, Message: "must be a valid " + kind}}
		}
		return []oapi.FieldError{{Location: base, Message: "must be valid JSON"}}
	}

	var schemaErrs []*openapi3.SchemaError
	collectSchemaErrors(reqErr.Err, &schemaErrs)
	if len(schemaErrs) == 0 {
		msg := reqErr.Reason
		if msg == "" && reqErr.Err != nil {
			msg = reqErr.Err.Error()
		}
		return []oapi.FieldError{{Location: base, Message: msg}}
	}

	out := make([]oapi.FieldError, 0, len(schemaErrs))
	for _, se := range schemaErrs {
		loc := base
		if ptr := se.JSONPointer(); len(ptr) > 0 && reqErr.Parameter == nil {
			loc += "." + strings.Join(ptr, ".")
		}
		field, msg := humanize(cleanReason(se.Reason))
		if field != "" {
			loc += "." + field
		}
		out = append(out, oapi.FieldError{Location: loc, Message: msg})
	}
	return out
}

var reasonPrefix = regexp.MustCompile(`^(error at "[^"]*": |at '[^']*': )+`)

// cleanReason drops the validator's location prefixes, since the location is
// reported separately.
func cleanReason(reason string) string {
	return reasonPrefix.ReplaceAllString(reason, "")
}

var (
	reMinLength = regexp.MustCompile(`^minLength: got \d+, want (\d+)$`)
	reMaxLength = regexp.MustCompile(`^maxLength: got \d+, want (\d+)$`)
	reMinimum   = regexp.MustCompile(`^minimum: got \S+, want (\S+)$`)
	reMaximum   = regexp.MustCompile(`^maximum: got \S+, want (\S+)$`)
	reType      = regexp.MustCompile(`^got \w+, want (\w+)$`)
	reMissing   = regexp.MustCompile(`^missing propert(?:y|ies) '([^']+)'$`)
	reExtra     = regexp.MustCompile(`^additional properties '([^']+)' not allowed$`)
)

// humanize turns JSON Schema validator messages into short messages a UI can
// show next to a field. It returns a sub-field when the message names one.
func humanize(msg string) (field, out string) {
	plural := func(n string) string {
		if n == "1" {
			return n + " character"
		}
		return n + " characters"
	}
	switch {
	case reMinLength.MatchString(msg):
		return "", "must be at least " + plural(reMinLength.FindStringSubmatch(msg)[1])
	case reMaxLength.MatchString(msg):
		return "", "must be at most " + plural(reMaxLength.FindStringSubmatch(msg)[1])
	case reMinimum.MatchString(msg):
		return "", "must be at least " + reMinimum.FindStringSubmatch(msg)[1]
	case reMaximum.MatchString(msg):
		return "", "must be at most " + reMaximum.FindStringSubmatch(msg)[1]
	case reType.MatchString(msg):
		t := reType.FindStringSubmatch(msg)[1]
		article := "a "
		if strings.ContainsRune("aeiou", rune(t[0])) {
			article = "an "
		}
		return "", "must be " + article + t
	case reMissing.MatchString(msg):
		return reMissing.FindStringSubmatch(msg)[1], "is required"
	case reExtra.MatchString(msg):
		return reExtra.FindStringSubmatch(msg)[1], "is not allowed"
	}
	return "", msg
}

func collectSchemaErrors(err error, out *[]*openapi3.SchemaError) {
	var multi openapi3.MultiError
	if errors.As(err, &multi) {
		for _, e := range multi {
			collectSchemaErrors(e, out)
		}
		return
	}
	var se *openapi3.SchemaError
	if errors.As(err, &se) {
		*out = append(*out, se)
	}
}
