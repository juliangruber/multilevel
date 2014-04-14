
BIN=node_modules/.bin

test:
	@$(BIN)/tape test/*.js test/node/*.js

test-browser:
	@echo "open http://localhost:9000/"
	@$(BIN)/browserify test/*.js | $(BIN)/browser-run --port 9000"

.PHONY: test test-browser

