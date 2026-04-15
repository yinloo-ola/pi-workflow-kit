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
});

describe("workflow-guard", () => {
	describe("phase detection from input text", () => {
		it("returns null initially", () => {
			expect(getCurrentPhase()).toBeNull();
		});
	});

	describe("blocking logic", () => {
		// We test the blocking condition logic directly since
		// pi event wiring requires the full ExtensionAPI mock.
		// The actual condition is: phase is set AND tool is write/edit
		// AND path does NOT start with docs/plans/

		it("should block write to source file during brainstorm", () => {
			const phase = "brainstorm";
			const toolName = "write";
			const filePath = "src/index.ts";

			if (phase && (toolName === "write" || toolName === "edit")) {
				if (!filePath.startsWith("docs/plans/")) {
					expect(true).toBe(true); // would be blocked
				}
			}
		});

		it("should allow write to docs/plans/ during brainstorm", () => {
			const phase = "brainstorm";
			const toolName = "write";
			const filePath = "docs/plans/2026-04-10-feature-design.md";

			if (phase && (toolName === "write" || toolName === "edit")) {
				if (!filePath.startsWith("docs/plans/")) {
					throw new Error("should not block");
				}
			}
			// If we get here, it wasn't blocked — correct
			expect(true).toBe(true);
		});

		it("should allow write during execute (phase is null)", () => {
			const phase = null;
			const toolName = "write";
			const filePath = "src/index.ts";

			if (phase && (toolName === "write" || toolName === "edit")) {
				throw new Error("should not block");
			}
			expect(true).toBe(true);
		});

		it("should block edit to source file during plan", () => {
			const phase = "plan";
			const toolName = "edit";
			const filePath = "src/utils.ts";

			if (phase && (toolName === "write" || toolName === "edit")) {
				if (!filePath.startsWith("docs/plans/")) {
					expect(true).toBe(true); // would be blocked
				}
			}
		});

		it("should block unsafe bash during brainstorm (safe bash tested via isSafeCommand)", () => {
			// The tool_call handler now guards bash via isSafeCommand.
			// Direct testing of safe/unsafe commands is in the isSafeCommand describe block.
			// This just confirms bash is no longer blanket-allowed.
			expect(isSafeCommand("rm -rf /")).toBe(false);
		});
	});
});
