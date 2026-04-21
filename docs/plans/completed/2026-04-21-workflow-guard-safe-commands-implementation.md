# Workflow Guard: Safe Commands Expansion — Implementation Plan

**Design:** `docs/plans/2026-04-21-workflow-guard-safe-commands-design.md`
**Date:** 2026-04-21

---

## Task 1: Add `stripHarmlessRedirects` helper and wire it into `isSafeCommand`

**Scenario:** Modifying tested code
**File:** `extensions/workflow-guard.ts`

1. Run existing tests to confirm baseline:
   ```bash
   npx vitest run tests/workflow-guard.test.ts
   ```
   Expected: all pass.

2. Add `stripHarmlessRedirects` function above `isSafeCommand`:
   ```ts
   /** Strip stderr redirects that are purely cosmetic (no side effects). */
   function stripHarmlessRedirects(cmd: string): string {
   	return cmd.replace(/\s*2\s*>\s*(\/dev\/null|&1)\b/g, "");
   }
   ```

3. Wire it into `isSafeCommand` — apply `stripHarmlessRedirects` to each part before pattern matching:
   ```ts
   export function isSafeCommand(command: string): boolean {
   	const parts = splitCompoundCommand(command);
   	return parts.every((part) => {
   		const cleaned = stripHarmlessRedirects(part);
   		const isDestructive = DESTRUCTIVE_PATTERNS.some((p) => p.test(cleaned));
   		const isSafe = SAFE_PATTERNS.some((p) => p.test(cleaned));
   		return !isDestructive && isSafe;
   	});
   }
   ```

4. Run tests:
   ```bash
   npx vitest run tests/workflow-guard.test.ts
   ```
   Expected: all existing tests still pass (no behavior change yet since no new SAFE_PATTERNS).

5. Commit:
   ```bash
   git add extensions/workflow-guard.ts
   git commit -m "feat(workflow-guard): add stripHarmlessRedirects helper"
   ```

---

## Task 2: Add new SAFE_PATTERNS entries

**Scenario:** Modifying tested code
**File:** `extensions/workflow-guard.ts`

1. Add the following entries to the `SAFE_PATTERNS` array (after the existing `gh`-related area or at end):

   ```ts
   /^\s*cd\b/,
   /^\s*gh\s+pr\s+(view|list|diff|checks|status)\b/i,
   /^\s*gh\s+issue\s+(view|list)\b/i,
   /^\s*gh\s+repo\s+(view|fork|list)\b/i,
   /^\s*gh\s+release\s+(view|list|download)\b/i,
   /^\s*gh\s+run\s+(view|list)\b/i,
   /^\s*git\s+blame\b/,
   /^\s*git\s+shortlog\b/,
   /^\s*git\s+stash\s+list\b/i,
   /^\s*git\s+tag\s+(-l|--list)\b/i,
   /^\s*git\s+describe\b/,
   ```

2. Run tests:
   ```bash
   npx vitest run tests/workflow-guard.test.ts
   ```
   Expected: all existing tests pass.

3. Commit:
   ```bash
   git add extensions/workflow-guard.ts
   git commit -m "feat(workflow-guard): add safe patterns for cd, gh, and git read-only subcommands"
   ```

---

## Task 3: Add tests for `cd`, `gh`, git new subcommands, and redirect stripping

**Scenario:** New feature (test-first)
**File:** `tests/workflow-guard.test.ts`

**checkpoint: test** — pause after writing failing tests, before implementation.

> Note: Implementation was already done in Tasks 1–2. These tests should all pass immediately. The checkpoint label is kept for review purposes in case the user wants to verify test design.

1. Add the following test blocks inside the `describe("isSafeCommand", ...)` block, after the existing tests:

   ```ts
   it("allows cd", () => {
   	expect(isSafeCommand("cd /some/path")).toBe(true);
   	expect(isSafeCommand("cd src && ls")).toBe(true);
   });

   it("allows gh read-only subcommands", () => {
   	expect(isSafeCommand("gh pr view 1564 --json title,body")).toBe(true);
   	expect(isSafeCommand("gh pr list --repo owner/repo")).toBe(true);
   	expect(isSafeCommand("gh pr diff 1564")).toBe(true);
   	expect(isSafeCommand("gh issue view 42")).toBe(true);
   	expect(isSafeCommand("gh issue list --label bug")).toBe(true);
   	expect(isSafeCommand("gh repo view owner/repo")).toBe(true);
   	expect(isSafeCommand("gh run view 12345")).toBe(true);
   });

   it("blocks gh write subcommands", () => {
   	expect(isSafeCommand("gh pr create --title 'fix'")).toBe(false);
   	expect(isSafeCommand("gh pr merge 1564")).toBe(false);
   	expect(isSafeCommand("gh issue close 42")).toBe(false);
   	expect(isSafeCommand("gh release create v1.0")).toBe(false);
   });

   it("allows git read-only subcommands (new additions)", () => {
   	expect(isSafeCommand("git blame src/index.ts")).toBe(true);
   	expect(isSafeCommand("git shortlog -sn")).toBe(true);
   	expect(isSafeCommand("git stash list")).toBe(true);
   	expect(isSafeCommand("git tag -l")).toBe(true);
   	expect(isSafeCommand("git tag --list 'v*'")).toBe(true);
   	expect(isSafeCommand("git describe --tags")).toBe(true);
   });

   it("still blocks git stash mutations", () => {
   	expect(isSafeCommand("git stash push -m 'wip'")).toBe(false);
   	expect(isSafeCommand("git stash pop")).toBe(false);
   });

   it("allows 2>/dev/null on safe commands", () => {
   	expect(isSafeCommand("git remote -v 2>/dev/null")).toBe(true);
   	expect(isSafeCommand("gh pr view 1564 2>/dev/null")).toBe(true);
   	expect(isSafeCommand("npm list 2>/dev/null")).toBe(true);
   });

   it("allows 2>&1 on safe commands", () => {
   	expect(isSafeCommand("git log 2>&1")).toBe(true);
   });

   it("still blocks stdout redirects even with stderr redirect present", () => {
   	expect(isSafeCommand("echo 'hello' > file.ts 2>/dev/null")).toBe(false);
   	expect(isSafeCommand("cat config > backup.txt 2>/dev/null")).toBe(false);
   });

   it("allows the exact user-reported blocked commands", () => {
   	expect(isSafeCommand("cd /Users/u/partying/pt-room && git remote -v 2>/dev/null; echo '---'; ls")).toBe(true);
   	expect(isSafeCommand("gh pr view 1564 --repo olachat/pt-partying --json title,body,files,additions,deletions 2>/dev/null || echo 'gh failed'")).toBe(true);
   });
   ```

2. Run tests:
   ```bash
   npx vitest run tests/workflow-guard.test.ts
   ```
   Expected: all tests pass (including new ones).

3. Commit:
   ```bash
   git add tests/workflow-guard.test.ts
   git commit -m "test(workflow-guard): add tests for cd, gh, git read-only subcommands, and redirect stripping"
   ```
