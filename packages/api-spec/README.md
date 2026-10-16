# API contract (`@orbit/api-spec`)

This package is the **source of truth** for the API between the Go backend, the
Next.js web app and the Expo mobile app. Nobody hand-writes request or response
types anywhere else; they are all generated from here.

```
src/**/*.yaml  (hand-written, split by domain)
     │  redocly bundle
     ▼
dist/openapi.yaml  (committed)
     ├──► oapi-codegen      → apps/api/internal/oapi/oapi.gen.go   (Go server interface + models)
     ├──► openapi-typescript → packages/api-client/src/schema.gen.ts (TS types for web + mobile)
     ├──► Prism              → mock server on :4010
     └──► oasdiff            → breaking-change check in CI
```

## Layout

```
src/
├── openapi.yaml                  root: info, tags, path index
├── paths/<domain>/*.yaml         one file per path, grouped by owning team
└── components/
    ├── schemas/<domain>/*.yaml   request/response models
    ├── schemas/common/           Problem, FieldError (shared error format)
    ├── parameters/
    └── responses/                NotFound, ValidationFailed, UnexpectedError
```

Add a new domain as `paths/<domain>/` + `components/schemas/<domain>/`, reference it
from `src/openapi.yaml`, and add the owning team to `.github/CODEOWNERS`.

## Changing the API

1. **Edit the spec** on a branch. Run `pnpm gen` (bundles, then regenerates Go and TS)
   and `pnpm lint` (Redocly rules in `redocly.yaml`).
2. **Open a contract PR** with only the spec and generated files. The Go build will
   fail until handlers exist for new operations, so either implement them in the same
   PR or stub them returning `501` and implement in a follow-up.
3. **Review**: API reviewers + the owning domain team (enforced by CODEOWNERS).
   CI runs the breaking-change check against `main`.
4. **Build in parallel** once merged:
   - Backend implements the generated `StrictServerInterface` methods. The compiler
     lists anything missing; the contract tests check responses match the spec.
   - Web and mobile build against the typed client, using the mock until the
     backend lands: `pnpm mock`, then
     `API_URL=http://localhost:4010 pnpm --filter web dev` or
     `EXPO_PUBLIC_API_PORT=4010 pnpm --filter mobile dev`.

## Breaking changes

Mobile app versions stay installed for months, so **the API must stay backward
compatible**. CI runs `oasdiff breaking` on every PR and fails on anything that would
break an existing client: removing or renaming an endpoint or field, making an
optional request field required, narrowing a type, adding a required parameter, etc.

Additive changes are always fine: new endpoints, new optional request fields, new
response fields.

To remove or rename something:

1. Add the replacement, and mark the old field or operation `deprecated: true`.
2. Ship web and mobile releases that use the replacement.
3. Once usage of old mobile versions is low enough, remove it in a PR labelled
   `api-breaking-change` (needs API reviewer approval).

Check locally before pushing:

```bash
pnpm api:breaking    # fails on breaking changes vs origin/main
pnpm api:changelog   # human-readable list of every change vs origin/main
```

## Commands

| Command | What it does |
|---|---|
| `pnpm gen` (repo root) | Bundle the spec and regenerate Go + TS |
| `pnpm --filter @orbit/api-spec lint` | Lint the spec with Redocly |
| `pnpm mock` (repo root) | Prism mock server on :4010, answering from the spec's examples |
| `pnpm api:breaking` | Breaking-change check vs `origin/main` (needs Go) |

The mock is stateless: creates and deletes return valid responses but don't change
what `GET` returns. Invalid requests get the spec's `422` example, so error UIs can
be built against it too.
