import { describe, it, expect, beforeEach } from "vitest";

/**
 * Tests for workflow-guard.ts
 *
 * The extension tracks a phase variable and blocks write/edit outside docs/plans/.
 * We test by importing the module and calling its exported getCurrentPhase(),
 * then simulating input/tool_call via the internal phase setter.
 *
 * Since the extension is a pi module (default export function receiving ExtensionAPI),
 * we test the exported state helpers and the blocking logic directly.
 */

// We can't easily invoke pi's event system in unit tests,
// so we test the exported getCurrentPhase and the blocking condition directly.
// The phase variable is module-level, so we need to reset it between tests.

// Import the module to access getCurrentPhase
import { getCurrentPhase, isSafeCommand } from "../extensions/workflow-guard";

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
});

describe("workflow-guard", () => {
	describe("phase detection from input text", () => {
		it("returns null initially", () => {
			expect(getCurrentPhase()).toBeNull();
		});
	});


});
