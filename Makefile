SPEC_DIR   := packages/api-spec
SPEC_ENTRY := src/openapi.yaml
BUNDLE     := $(SPEC_DIR)/dist/openapi.yaml

.PHONY: spec-lint spec-bundle gen-go gen-ts gen clean help

help:
	@echo "spec-lint    lint the split OpenAPI spec"
	@echo "spec-bundle  lint, then bundle into $(BUNDLE)"
	@echo "gen-go       generate the Go server code from the bundle"
	@echo "gen-ts       generate the TypeScript client from the bundle"
	@echo "gen          run everything"
	@echo "clean        remove local build output"

spec-lint:
	pnpm --filter @orbit/api-spec lint

spec-bundle:
	pnpm --filter @orbit/api-spec generate

gen-go: spec-bundle
	pnpm --filter api generate

gen-ts: spec-bundle
	pnpm --filter @orbit/api-client generate

gen: gen-go gen-ts

clean:
	rm -rf services/api/bin services/sim/build
