# Add Go read-only commands to workflow-guard safe list

## Context

Go toolchain read-only commands (`go doc`, `go list`, `go version`, `go env`) are blocked during brainstorm/plan phases because they're not in `SAFE_PATTERNS`. These are purely read-only with no side effects and are commonly needed during code exploration.

## Tasks

### 1 — Add Go safe patterns [Modifying tested code]

**File:** `extensions/workflow-guard.ts`

Add four entries to `SAFE_PATTERNS`, after the `git describe` entry:

```ts
/^\s*go\s+doc\b/,
/^\s*go\s+list\b/,
/^\s*go\s+version\b/,
/^\s*go\s+env\b/,
```

**Verify:** run `npx vitest run tests/workflow-guard.test.ts` — all existing tests should pass.

**Commit:** `feat(workflow-guard): add Go read-only commands to safe list`

### 2 — Add tests for Go safe commands [New feature]

**File:** `tests/workflow-guard.test.ts`

Add a new `it` block inside the `describe("isSafeCommand", ...)` suite:

```ts
it("allows go read-only subcommands", () => {
	expect(isSafeCommand("go doc go.opentelemetry.io/otel/label")).toBe(true);
	expect(isSafeCommand("go doc go.opentelemetry.io/otel/codes 2>&1 | head -20")).toBe(true);
	expect(isSafeCommand("go list -m -versions go.opentelemetry.io/otel 2>&1 | tr ' ' '\\n' | grep -E '^v1\\\\.(2[89]|[3-9][0-9])' | head -20")).toBe(true);
	expect(isSafeCommand("go version")).toBe(true);
	expect(isSafeCommand("go env GOOS GOARCH")).toBe(true);
});
```

Also add a `go build` block test to ensure write-oriented Go commands stay blocked:

```ts
it("blocks go write subcommands", () => {
	expect(isSafeCommand("go build ./...")).toBe(false);
	expect(isSafeCommand("go install golang.org/x/tools/gopls@latest")).toBe(false);
	expect(isSafeCommand("go mod tidy")).toBe(false);
});
```

**Verify:** run `npx vitest run tests/workflow-guard.test.ts` — all tests pass.

**Commit:** `test(workflow-guard): add tests for Go read-only safe commands`
