import { beforeEach, describe, expect, test } from "vitest";
import { createWorkflowHandler, type WorkflowHandler } from "../../../extensions/workflow-monitor/workflow-handler";

describe("WorkflowHandler", () => {
  let handler: WorkflowHandler;

  beforeEach(() => {
    handler = createWorkflowHandler();
  });

  test("detects write to source file as TDD violation", () => {
    const result = handler.handleToolCall("write", { path: "src/utils.ts", content: "code" });
    expect(result.violation).not.toBeNull();
    expect(result.violation?.type).toBe("source-before-test");
  });

  test("detects edit to source file as TDD violation", () => {
    const result = handler.handleToolCall("edit", {
      path: "src/utils.ts",
      oldText: "old",
      newText: "new",
    });
    expect(result.violation).not.toBeNull();
  });

  test("no violation for test file write", () => {
    const result = handler.handleToolCall("write", {
      path: "src/utils.test.ts",
      content: "test",
    });
    expect(result.violation).toBeNull();
  });

  test("no violation for non-write tools", () => {
    const result = handler.handleToolCall("read", { path: "src/utils.ts" });
    expect(result.violation).toBeNull();
  });

  test("handles bash test command result", () => {
    handler.handleToolCall("write", { path: "src/utils.test.ts", content: "test" });
    expect(handler.getTddPhase()).toBe("red-pending");

    handler.handleBashResult("npx vitest run", "Tests  1 passed", 0);
    expect(handler.getTddPhase()).toBe("green");
  });

  test("handles bash git commit", () => {
    handler.handleToolCall("write", { path: "src/utils.test.ts", content: "test" });
    handler.handleBashResult("git commit -m 'feat: add utils'", "", 0);
    expect(handler.getTddPhase()).toBe("idle");
  });

  test("getWidgetText returns phase when active", () => {
    handler.handleToolCall("write", { path: "src/utils.test.ts", content: "test" });
    expect(handler.getWidgetText()).toContain("RED");
  });

  test("getWidgetText returns empty when idle", () => {
    expect(handler.getWidgetText()).toBe("");
  });

  // --- Debug monitor integration ---

  test("activates debug mode on first test failure", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    expect(handler.isDebugActive()).toBe(true);
  });

  test("detects fix-without-investigation on source write after debug is active", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    const result = handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "a", newText: "b" });
    expect(result.violation?.type).toBe("fix-without-investigation");
  });

  test("no debug violation when investigated first", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    handler.handleReadOrInvestigation("read", "src/foo.ts");
    const result = handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "a", newText: "b" });
    expect(result.violation).toBeNull();
  });

  test("no debug violation when investigation bash command used", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    handler.handleBashInvestigation("grep -rn 'error' src/");
    const result = handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "a", newText: "b" });
    expect(result.violation).toBeNull();
  });

  test("tracks fix attempts across cycles", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1); // streak=1, active

    handler.handleReadOrInvestigation("read", "src/foo.ts");
    handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "a", newText: "b" });
    handler.handleBashResult("npx vitest run", "1 failing", 1); // attempt 1

    handler.handleReadOrInvestigation("read", "src/foo.ts");
    handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "b", newText: "c" });
    handler.handleBashResult("npx vitest run", "1 failing", 1); // attempt 2

    handler.handleReadOrInvestigation("read", "src/foo.ts");
    handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "c", newText: "d" });
    handler.handleBashResult("npx vitest run", "1 failing", 1); // attempt 3

    handler.handleReadOrInvestigation("read", "src/foo.ts");
    const result = handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "d", newText: "e" });
    expect(result.violation?.type).toBe("excessive-fix-attempts");
  });

  test("debug resets on test pass", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    handler.handleReadOrInvestigation("read", "src/foo.ts");
    handler.handleToolCall("edit", { path: "src/foo.ts", oldText: "a", newText: "b" });
    handler.handleBashResult("npx vitest run", "1 passing", 0); // pass
    expect(handler.isDebugActive()).toBe(false);
  });

  test("debug resets on commit", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    handler.handleBashResult("git commit -m 'fix'", "", 0);
    expect(handler.isDebugActive()).toBe(false);
  });

  test("resetState clears both debug and tdd state", () => {
    handler.handleToolCall("write", { path: "src/utils.test.ts", content: "test" });
    handler.handleBashResult("npx vitest run", "1 failing", 1); // excluded RED verification
    handler.handleBashResult("npx vitest run", "1 failing", 1); // streak 1, but TDD active (red)
    handler.handleBashResult("npx vitest run", "1 failing", 1); // streak 2, but TDD active (red)
    expect(handler.getTddPhase()).toBe("red");
    expect(handler.isDebugActive()).toBe(false);

    handler.resetState();

    expect(handler.getTddPhase()).toBe("idle");
    expect(handler.isDebugActive()).toBe(false);

    // After reset, first failure activates debug (threshold is now >= 1)
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    expect(handler.isDebugActive()).toBe(true);
  });

  test("widget shows debug state when active", () => {
    handler.handleBashResult("npx vitest run", "1 failing", 1);
    expect(handler.getWidgetText()).toContain("Debug");
  });

  describe("verification monitor", () => {
    test("returns violation on git commit without verification", () => {
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("commit-without-verification");
    });

    test("returns null on git commit after passing test run", () => {
      handler.handleBashResult("npx vitest run", "1 passed", 0);
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).toBeNull();
    });

    test("returns violation on git commit after failing test run", () => {
      handler.handleBashResult("npx vitest run", "1 failing", 1);
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("commit-without-verification");
    });

    test("returns violation on git push after failing test run", () => {
      handler.handleBashResult("npx vitest run", "1 failing", 1);
      const result = handler.checkCommitGate("git push origin main");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("push-without-verification");
    });

    test("returns violation on PR creation after failing test run", () => {
      handler.handleBashResult("npx vitest run", "1 failing", 1);
      const result = handler.checkCommitGate("gh pr create --title 'feat'");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("pr-without-verification");
    });

    test("invalidates previous verification after a later failing test run", () => {
      handler.handleBashResult("npx vitest run", "1 passed", 0);
      expect(handler.checkCommitGate("git commit -m 'feat'")).toBeNull();

      handler.handleBashResult("npx vitest run", "1 failing", 1);
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("commit-without-verification");
    });

    test("invalidates verification after source write", () => {
      handler.handleBashResult("npx vitest run", "1 passed", 0);
      handler.handleToolCall("write", { path: "src/index.ts" });
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).not.toBeNull();
    });

    test("resets verification on session reset", () => {
      handler.handleBashResult("npx vitest run", "1 passed", 0);
      handler.resetState();
      const result = handler.checkCommitGate("git commit -m 'feat'");
      expect(result).not.toBeNull();
    });
  });
});

function failOutput() {
  return "FAIL  tests/example.test.ts\n";
}

function passOutput() {
  return "1 passed\n";
}

describe("WorkflowHandler (debug threshold + TDD exclusion)", () => {
  test("activates debug on first non-TDD failing test run", () => {
    const handler = createWorkflowHandler();

    handler.handleBashResult("npx vitest run", failOutput(), 1);

    expect(handler.isDebugActive()).toBe(true);
  });

  test("debug remains active on subsequent non-TDD failing runs", () => {
    const handler = createWorkflowHandler();

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);
  });

  test("resets debug and deactivates on passing test run; re-activates on next failure", () => {
    const handler = createWorkflowHandler();

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);

    handler.handleBashResult("npx vitest run", passOutput(), 0);
    expect(handler.isDebugActive()).toBe(false);

    // After reset, first failure re-activates immediately
    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);
  });

  test("resets debug streak on git commit; activates again on next failure", () => {
    const handler = createWorkflowHandler();

    // commit resets streak
    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);

    handler.handleBashResult('git commit -m "wip"', "", 0);
    expect(handler.isDebugActive()).toBe(false);

    // After commit reset, first failure activates again
    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(true);
  });

  test("TDD exclusion: failing runs during active TDD do not activate debug", () => {
    const handler = createWorkflowHandler();

    handler.handleToolCall("write", { path: "tests/new-behavior.test.ts" });

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(false);

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(false);

    handler.handleBashResult("npx vitest run", failOutput(), 1);
    expect(handler.isDebugActive()).toBe(false);
  });
});

describe("DebugMonitor defers to TDD", () => {
  test("debug monitor does not activate on test failure when TDD is active", () => {
    const handler = createWorkflowHandler();

    handler.handleToolCall("write", { path: "tests/foo.test.ts" });
    handler.handleBashResult("npx vitest run", "FAIL tests/foo.test.ts", 1);
    handler.handleBashResult("npx vitest run", "FAIL tests/foo.test.ts", 1);
    handler.handleBashResult("npx vitest run", "FAIL tests/foo.test.ts", 1);

    expect(handler.isDebugActive()).toBe(false);
  });

  test("debug monitor activates on test failure when TDD is idle", () => {
    const handler = createWorkflowHandler();

    handler.handleBashResult("npx vitest run", "FAIL tests/foo.test.ts", 1);

    expect(handler.isDebugActive()).toBe(true);
  });
});
