SPEC_DIR     := api-spec
SPEC_ENTRY   := openapi.yaml
BUNDLE_DIR   := dist
BUNDLE       := $(BUNDLE_DIR)/openapi.bundled.yaml
OAPI_CONFIG  := services/api/oapi-codegen.yaml

SPEC_FILES := $(shell find $(SPEC_DIR) -name '*.yaml')

.PHONY: spec-lint spec-bundle gen-go gen clean help

help:
	@echo "spec-lint    lint the split OpenAPI spec"
	@echo "spec-bundle  lint, then bundle into $(BUNDLE)"
	@echo "gen-go       generate Go server code from the bundle"
	@echo "gen          run everything"
	@echo "clean        remove $(BUNDLE_DIR)"

spec-lint:
	cd $(SPEC_DIR) && npx redocly lint $(SPEC_ENTRY)

$(BUNDLE): $(SPEC_FILES)
	@mkdir -p $(BUNDLE_DIR)
	cd $(SPEC_DIR) && npx redocly lint $(SPEC_ENTRY)
	cd $(SPEC_DIR) && npx redocly bundle $(SPEC_ENTRY) -o ../$(BUNDLE)

spec-bundle: $(BUNDLE)

gen-go: $(BUNDLE)
	oapi-codegen -config $(OAPI_CONFIG) $(BUNDLE)

gen: gen-go

clean:
	rm -rf $(BUNDLE_DIR)
