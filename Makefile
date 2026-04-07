.PHONY: help setup build dev start test lint clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies
	npm install

build: ## Compile TypeScript to dist/
	npm run build

dev: ## Run server directly via tsx (no build needed)
	npm run dev

start: ## Run compiled server from dist/
	npm start

test: ## Run manual test runner (makes real API calls)
	npm run test

lint: ## Type-check without emitting output
	npx tsc --noEmit

clean: ## Remove dist/ and logs/
	npx rimraf dist logs
