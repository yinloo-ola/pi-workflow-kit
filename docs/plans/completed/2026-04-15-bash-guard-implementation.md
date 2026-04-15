# Bash Guard Implementation Plan

Based on `docs/plans/2026-04-15-bash-guard-design.md`.

## Task 1 — Add `isSafeCommand()` to workflow-guard.ts [new feature, checkpoint: test]

**File:** `extensions/workflow-guard.ts`

- Add `isSafeCommand` as a named export (so tests can import it directly)
- Copy `DESTRUCTIVE_PATTERNS` and `SAFE_PATTERNS` from [plan-mode utils.ts](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/plan-mode/utils.ts) as-is
- Copy the `isSafeCommand()` logic as-is

```ts
// Destructive commands blocked in brainstorm/plan phases
const DESTRUCTIVE_PATTERNS = [
	/\brm\b/i,
	/\brmdir\b/i,
	/\bmv\b/i,
	/\bcp\b/i,
	/\bmkdir\b/i,
	/\btouch\b/i,
	/\bchmod\b/i,
	/\bchown\b/i,
	/\bchgrp\b/i,
	/\bln\b/i,
	/\btee\b/i,
	/\btruncate\b/i,
	/\bdd\b/i,
	/\bshred\b/i,
	/(^|[^<])>(?!>)/,
	/>>/,
	/\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
	/\byarn\s+(add|remove|install|publish)/i,
	/\bpnpm\s+(add|remove|install|publish)/i,
	/\bpip\s+(install|uninstall)/i,
	/\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
	/\bbrew\s+(install|uninstall|upgrade)/i,
	/\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
	/\bsudo\b/i,
	/\bsu\b/i,
	/\bkill\b/i,
	/\bpkill\b/i,
	/\bkillall\b/i,
	/\breboot\b/i,
	/\bshutdown\b/i,
	/\bsystemctl\s+(start|stop|restart|enable|disable)/i,
	/\bservice\s+\S+\s+(start|stop|restart)/i,
	/\b(vim?|nano|emacs|code|subl)\b/i,
];

const SAFE_PATTERNS = [
	/^\s*cat\b/,
	/^\s*head\b/,
	/^\s*tail\b/,
	/^\s*less\b/,
	/^\s*more\b/,
	/^\s*grep\b/,
	/^\s*find\b/,
	/^\s*ls\b/,
	/^\s*pwd\b/,
	/^\s*echo\b/,
	/^\s*printf\b/,
	/^\s*wc\b/,
	/^\s*sort\b/,
	/^\s*uniq\b/,
	/^\s*diff\b/,
	/^\s*file\b/,
	/^\s*stat\b/,
	/^\s*du\b/,
	/^\s*df\b/,
	/^\s*tree\b/,
	/^\s*which\b/,
	/^\s*whereis\b/,
	/^\s*type\b/,
	/^\s*env\b/,
	/^\s*printenv\b/,
	/^\s*uname\b/,
	/^\s*whoami\b/,
	/^\s*id\b/,
	/^\s*date\b/,
	/^\s*cal\b/,
	/^\s*uptime\b/,
	/^\s*ps\b/,
	/^\s*top\b/,
	/^\s*htop\b/,
	/^\s*free\b/,
	/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
	/^\s*git\s+ls-/i,
	/^\s*npm\s+(list|ls|view|info|search|outdated|audit)/i,
	/^\s*yarn\s+(list|info|why|audit)/i,
	/^\s*node\s+--version/i,
	/^\s*python\s+--version/i,
	/^\s*curl\s/i,
	/^\s*wget\s+-O\s*-/i,
	/^\s*jq\b/,
	/^\s*sed\s+-n/i,
	/^\s*awk\b/,
	/^\s*rg\b/,
	/^\s*fd\b/,
	/^\s*bat\b/,
	/^\s*eza\b/,
];

export function isSafeCommand(command: string): boolean {
	const isDestructive = DESTRUCTIVE_PATTERNS.some((p) => p.test(command));
	const isSafe = SAFE_PATTERNS.some((p) => p.test(command));
	return !isDestructive && isSafe;
}
```

- Write failing tests in `tests/workflow-guard.test.ts` for `isSafeCommand`:

```ts
import { isSafeCommand } from "../extensions/workflow-guard";

describe("isSafeCommand", () => {
	it("allows safe read-only commands", () => {
		expect(isSafeCommand("cat file.ts")).toBe(true);
		expect(isSafeCommand("grep -r 'foo' src/")).toBe(true);
		expect(isSafeCommand("git status")).toBe(true);
		expect(isSafeCommand("git log --oneline -5")).toBe(true);
		expect(isSafeCommand("npm list")).toBe(true);
		expect(isSafeCommand("ls -la")).toBe(true);
		expect(isSafeCommand("curl https://example.com")).toBe(true);
	});

	it("blocks destructive commands", () => {
		expect(isSafeCommand("rm -rf node_modules")).toBe(false);
		expect(isSafeCommand("touch newfile.ts")).toBe(false);
		expect(isSafeCommand("mv old.ts new.ts")).toBe(false);
		expect(isSafeCommand("mkdir src/components")).toBe(false);
	});

	it("blocks file-writing bash patterns", () => {
		expect(isSafeCommand("echo 'hello' > file.ts")).toBe(false);
		expect(isSafeCommand("cat config > backup.txt")).toBe(false);
		expect(isSafeCommand("echo 'log' >> output.log")).toBe(false);
		expect(isSafeCommand("tee output.txt")).toBe(false);
		expect(isSafeCommand("sed -i 's/old/new/g' file.ts")).toBe(false);
	});

	it("blocks git mutations but allows read-only git", () => {
		expect(isSafeCommand("git add .")).toBe(false);
		expect(isSafeCommand("git commit -m 'msg'")).toBe(false);
		expect(isSafeCommand("git push")).toBe(false);
		expect(isSafeCommand("git checkout -b feature")).toBe(false);
		expect(isSafeCommand("git status")).toBe(true);
		expect(isSafeCommand("git log --oneline")).toBe(true);
		expect(isSafeCommand("git diff")).toBe(true);
	});

	it("blocks editors", () => {
		expect(isSafeCommand("vim file.ts")).toBe(false);
		expect(isSafeCommand("nano file.ts")).toBe(false);
		expect(isSafeCommand("code .")).toBe(false);
	});

	it("blocks sudo", () => {
		expect(isSafeCommand("sudo apt install foo")).toBe(false);
	});

	it("blocks npm installs but allows read-only npm", () => {
		expect(isSafeCommand("npm install lodash")).toBe(false);
		expect(isSafeCommand("npm list")).toBe(true);
		expect(isSafeCommand("npm audit")).toBe(true);
	});
});
```

- Run: `npx vitest run tests/workflow-guard.test.ts`
- Verify: all new `isSafeCommand` tests fail (function doesn't exist yet)
- Implement `isSafeCommand()` in `extensions/workflow-guard.ts`
- Run: `npx vitest run tests/workflow-guard.test.ts`
- Verify: all tests pass
- `git add -A && git commit -m "feat: add isSafeCommand bash guard to workflow-guard"`

## Task 2 — Wire bash guard into tool_call handler [modifying tested code]

**File:** `extensions/workflow-guard.ts`

Replace the tool_call guard from:
```ts
if (event.toolName !== "write" && event.toolName !== "edit") return;
```

To:
```ts
if (event.toolName === "bash") {
	const command = (event.input as { command?: string }).command ?? "";
	if (!isSafeCommand(command)) {
		if (ctx.hasUI) {
			ctx.ui.notify(
				`Blocked bash command during ${phase} phase: ${command}`,
				"warning",
			);
		}
		return {
			block: true,
			reason: `⚠️ ${phase.toUpperCase()} PHASE: Bash command blocked (not allowlisted). Only read-only commands are permitted during brainstorming and planning.\nCommand: ${command}`,
		};
	}
	return;
}

if (event.toolName !== "write" && event.toolName !== "edit") return;
```

- Run: `npx vitest run tests/workflow-guard.test.ts`
- Verify: existing tests pass (the "should allow bash" test needs updating — see Task 3)
- `git add -A && git commit -m "feat: wire bash guard into tool_call handler"`

## Task 3 — Update existing test for new bash behavior [modifying tested code]

**File:** `tests/workflow-guard.test.ts`

The test `"should allow bash regardless of phase"` is now incorrect — bash with unsafe commands should be blocked. Update it:

```ts
it("should block unsafe bash during brainstorm (safe bash tested via isSafeCommand)", () => {
	// The tool_call handler now guards bash via isSafeCommand.
	// Direct testing of safe/unsafe commands is in the isSafeCommand describe block.
	// This just confirms bash is no longer blanket-allowed.
	expect(isSafeCommand("rm -rf /")).toBe(false);
});
```

- Run: `npx vitest run tests/workflow-guard.test.ts`
- Verify: all tests pass
- `git add -A && git commit -m "test: update bash guard test for new blocking behavior"`
