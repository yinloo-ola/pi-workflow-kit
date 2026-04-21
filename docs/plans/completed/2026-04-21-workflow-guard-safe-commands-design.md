# Workflow Guard: Safe Commands Expansion

**Date:** 2026-04-21
**Status:** Draft

## Problem

The workflow guard blocks several read-only bash commands that are genuinely needed during brainstorm and plan phases. Two specific user reports:

1. `cd /path && git remote -v 2>/dev/null; echo "---"; ls` — blocked due to `cd` not being allowlisted and `2>/dev/null` caught by the stdout-redirect pattern.
2. `gh pr view 1564 --json ... 2>/dev/null || echo "gh failed"` — blocked because `gh` is not allowlisted at all.

Additionally, `git status --short` is blocked because the safe regex only allows `git status` without flags.

## Design

### 1. Harmless redirect stripping

Add a `stripHarmlessRedirects(cmd)` helper that removes `2>/dev/null` and `2>&1` before pattern matching. These are purely cosmetic (suppress stderr noise) and have no side effects.

```ts
function stripHarmlessRedirects(cmd: string): string {
  return cmd.replace(/\s*2\s*>\s*(\/dev\/null|&1)\b/g, "");
}
```

Apply it inside `isSafeCommand` on each sub-command before checking DESTRUCTIVE and SAFE patterns. This fixes `2>/dev/null` without loosening the redirect catch (which still blocks real writes).

### 2. New SAFE_PATTERNS entries

| Pattern | Rationale |
|---------|-----------|
| `/^\s*cd\b/` | Directory navigation — zero side effects |
| `/^\s*gh\s+pr\s+(view\|list\|diff\|checks\|status)\b/i` | Read-only PR inspection |
| `/^\s*gh\s+issue\s+(view\|list)\b/i` | Read-only issue inspection |
| `/^\s*gh\s+repo\s+(view\|fork\|list)\b/i` | Read-only repo metadata |
| `/^\s*gh\s+release\s+(view\|list\|download)\b/i` | Read-only release inspection |
| `/^\s*gh\s+run\s+(view\|list)\b/i` | Read-only CI run inspection |
| `/^\s*git\s+blame\b/` | Read-only file annotation |
| `/^\s*git\s+shortlog\b/` | Read-only commit summary |
| `/^\s*git\s+stash\s+list\b/i` | Read-only stash listing |
| `/^\s*git\s+tag\s+(-l\|--list)\b/i` | Read-only tag listing |
| `/^\s*git\s+describe\b/` | Read-only version info |

### 3. Fix: `git status` flag handling

Current regex `/^\s*git\s+(status|log|...)/i` doesn't allow common flags like `--short`, `--oneline`, `--format=...`. Refine all git safe patterns to optionally accept trailing flags and args:

```ts
/^\s*git\s+status\b/i,
/^\s*git\s+log\b/i,
/^\s*git\s+diff\b/i,
/^\s*git\s+show\b/i,
/^\s*git\s+blame\b/i,
// etc.
```

The existing patterns already anchor to `^\s*git\s+<subcommand>` — the issue was that `git status --short` didn't match because some patterns had more restrictive anchoring. Reviewing the code: the patterns use `\b` word boundaries which should allow flags. The actual issue with `git status --short && git log --oneline -5` is that the `git log --oneline -5` part is safe, but `git status --short` — let me verify: `/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i` — `git status` has a `\b` after the group? No, there's no trailing `\b`. So `git status --short` **should** match since the pattern doesn't require end-of-string. The real blocker for that compound command was the `&&` splitting — `git log --oneline -5` — `-5` shouldn't be an issue either.

**Conclusion on item 3:** The `git status --short` case was a false alarm caused by compound command parsing combined with the `2>/dev/null` redirect in the user's actual commands, not a pattern bug. No change needed here beyond the redirect fix.

### 4. What we're NOT adding (YAGNI)

- `sed -i` (in-place editing) — correctly destructive
- `gh pr create/merge/close` — write operations
- `curl -o file` (output to file) — the redirect catch blocks this
- `cut`, `tr`, `column`, `base64` — rarely needed; can add later on demand
- `gh api` — too broad; can be used for mutations. Require specific subcommands.

## Data flow

No new data flow. The changes are purely additive to the pattern-matching logic in `isSafeCommand`.

## Error handling

No new error paths. The existing block-and-warn behavior remains unchanged.

## Testing

Manual verification with the exact commands that were blocked:

1. `cd /some/path && git remote -v 2>/dev/null; echo "---"; ls` → allowed
2. `gh pr view 1564 --repo owner/repo --json title,body,files 2>/dev/null || echo "gh failed"` → allowed
3. `git stash list` → allowed
4. `git tag -l` → allowed
5. `rm -rf /` → still blocked ✓
6. `git push origin main` → still blocked ✓

## Tests

Add the following test cases to the existing `tests/workflow-guard.test.ts` `isSafeCommand` describe block:

### New: `cd` navigation
```ts
it("allows cd", () => {
	expect(isSafeCommand("cd /some/path")).toBe(true);
	expect(isSafeCommand("cd src && ls")).toBe(true);
});
```

### New: GitHub CLI read-only subcommands
```ts
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
```

### New: Git read-only subcommands
```ts
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
```

### New: Harmless stderr redirect stripping
```ts
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
```

### New: Compound commands from real user scenarios
```ts
it("allows the exact user-reported blocked commands", () => {
	// Scenario 1: directory navigation + git remote + ls
	expect(isSafeCommand("cd /Users/u/partying/pt-room && git remote -v 2>/dev/null; echo '---'; ls")).toBe(true);
	// Scenario 2: gh pr view with fallback
	expect(isSafeCommand("gh pr view 1564 --repo olachat/pt-partying --json title,body,files,additions,deletions 2>/dev/null || echo 'gh failed'")).toBe(true);
});
```

## Summary

| Change | Location | Size |
|--------|----------|------|
| Add `stripHarmlessRedirects()` | Above `isSafeCommand` | ~3 lines |
| Call it in `isSafeCommand` loop body | Inside `isSafeCommand` | 1 line changed |
| Add 10 new SAFE_PATTERNS entries | `SAFE_PATTERNS` array | ~10 lines |
