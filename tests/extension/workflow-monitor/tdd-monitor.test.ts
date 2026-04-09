import { beforeEach, describe, expect, test } from "vitest";
import { TddMonitor } from "../../../extensions/workflow-monitor/tdd-monitor";

describe("TddMonitor", () => {
  let monitor: TddMonitor;

  beforeEach(() => {
    monitor = new TddMonitor();
  });

  test("starts in idle phase", () => {
    expect(monitor.getPhase()).toBe("idle");
  });

  test("transitions to red-pending when test file is written", () => {
    monitor.onFileWritten("src/utils.test.ts");
    expect(monitor.getPhase()).toBe("red-pending");
  });

  test("stays idle when source file is written (no test context)", () => {
    monitor.onFileWritten("src/utils.ts");
    expect(monitor.getPhase()).toBe("idle");
  });

  test("records violation when source written without prior test", () => {
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("source-before-test");
  });

  test("warns with Scenario 2 violation when corresponding test exists on disk but tests not yet run", () => {
    const monitorWithDiskTests = new TddMonitor(
      (candidatePath) => candidatePath === "src/utils.test.ts" || candidatePath === "tests/utils.test.ts",
    );

    const violation = monitorWithDiskTests.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("existing-tests-not-run-before-change");
  });

  test("no violation when corresponding test exists on disk AND tests were run first", () => {
    const monitorWithDiskTests = new TddMonitor(
      (candidatePath) => candidatePath === "src/utils.test.ts" || candidatePath === "tests/utils.test.ts",
    );

    monitorWithDiskTests.onTestResult(true); // run tests first
    const violation = monitorWithDiskTests.onFileWritten("src/utils.ts");
    expect(violation).toBeNull();
  });

  test("still warns when no corresponding test file exists on disk", () => {
    const monitorWithoutDiskTests = new TddMonitor(() => false);

    const violation = monitorWithoutDiskTests.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("source-before-test");
  });

  test("no violation when test file written", () => {
    const violation = monitor.onFileWritten("src/utils.test.ts");
    expect(violation).toBeNull();
  });

  test("no violation when source written after test in green phase", () => {
    monitor.onFileWritten("src/utils.test.ts");
    monitor.onTestResult(true); // → GREEN
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).toBeNull();
  });

  test("returns source-during-red violation when source written in red-pending phase", () => {
    monitor.onFileWritten("src/utils.test.ts"); // → red-pending
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("source-during-red");
  });

  test("transitions to green when tests pass after red-pending", () => {
    monitor.onFileWritten("src/utils.test.ts");
    expect(monitor.getPhase()).toBe("red-pending");
    monitor.onTestResult(true);
    expect(monitor.getPhase()).toBe("green");
  });

  test("stays red when tests fail", () => {
    monitor.onFileWritten("src/utils.test.ts");
    monitor.onTestResult(false);
    expect(monitor.getPhase()).toBe("red");
  });

  test("transitions to refactor after green + source edit", () => {
    monitor.onFileWritten("src/utils.test.ts");
    monitor.onTestResult(true);
    expect(monitor.getPhase()).toBe("green");
    monitor.onFileWritten("src/utils.ts");
    expect(monitor.getPhase()).toBe("refactor");
  });

  test("resets cycle on commit", () => {
    monitor.onFileWritten("src/utils.test.ts");
    monitor.onTestResult(true);
    monitor.onCommit();
    expect(monitor.getPhase()).toBe("idle");
  });

  test("resets tracked files on commit", () => {
    monitor.onFileWritten("src/utils.test.ts");
    monitor.onCommit();
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
  });

  test("ignores non-source non-test files", () => {
    const violation = monitor.onFileWritten("README.md");
    expect(violation).toBeNull();
    expect(monitor.getPhase()).toBe("idle");
  });

  test("ignores config files", () => {
    const violation = monitor.onFileWritten("vitest.config.ts");
    expect(violation).toBeNull();
    expect(monitor.getPhase()).toBe("idle");
  });
});

describe("TddMonitor (red-pending phase)", () => {
  let tdd: TddMonitor;

  beforeEach(() => {
    tdd = new TddMonitor();
  });

  test("transitions to red-pending (not red) when test file is written", () => {
    tdd.onFileWritten("src/utils.test.ts");
    expect(tdd.getPhase()).toBe("red-pending");
  });

  test("transitions from red-pending to red on first test run (fail)", () => {
    tdd.onFileWritten("src/utils.test.ts");
    tdd.onTestResult(false);
    expect(tdd.getPhase()).toBe("red");
  });

  test("transitions from red-pending to green on first test run (pass)", () => {
    tdd.onFileWritten("src/utils.test.ts");
    tdd.onTestResult(true);
    expect(tdd.getPhase()).toBe("green");
  });

  test("source edit in red-pending returns source-during-red violation", () => {
    tdd.onFileWritten("src/utils.test.ts");
    const violation = tdd.onFileWritten("src/utils.ts");
    expect(violation?.type).toBe("source-during-red");
  });

  test("source edit in red (after test run) is allowed", () => {
    tdd.onFileWritten("src/utils.test.ts");
    tdd.onTestResult(false);
    const violation = tdd.onFileWritten("src/utils.ts");
    expect(violation).toBeNull();
  });

  test("source edit in red stays in red", () => {
    tdd.onFileWritten("src/utils.test.ts");
    tdd.onTestResult(false);
    tdd.onFileWritten("src/utils.ts");
    expect(tdd.getPhase()).toBe("red");
  });

  test("new test file during red re-enters red-pending", () => {
    tdd.onFileWritten("tests/first.test.ts");
    tdd.onTestResult(false);
    tdd.onFileWritten("tests/second.test.ts");
    expect(tdd.getPhase()).toBe("red-pending");
    const violation = tdd.onFileWritten("src/utils.ts");
    expect(violation?.type).toBe("source-during-red");
  });
});

describe("TddMonitor (RED verification semantics)", () => {
  let tdd: TddMonitor;

  beforeEach(() => {
    tdd = new TddMonitor();
  });

  test("violates source-during-red when a test was written but tests have not been run yet", () => {
    expect(tdd.onFileWritten("tests/foo.test.ts")).toBeNull();

    const violation = tdd.onFileWritten("extensions/workflow-monitor/foo.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("source-during-red");
  });

  test("does NOT violate source-during-red after tests have been run once (even if they fail)", () => {
    expect(tdd.onFileWritten("tests/foo.test.ts")).toBeNull();

    tdd.onTestResult(false);

    const violation = tdd.onFileWritten("extensions/workflow-monitor/foo.ts");
    expect(violation).toBeNull();
  });

  test("re-enters RED verification when a new test is written in a later cycle", () => {
    expect(tdd.onFileWritten("tests/first.test.ts")).toBeNull();
    tdd.onTestResult(true);
    expect(tdd.getPhase()).toBe("green");

    expect(tdd.onFileWritten("tests/second.test.ts")).toBeNull();
    expect(tdd.getPhase()).toBe("red-pending");

    const violation = tdd.onFileWritten("extensions/workflow-monitor/foo.ts");
    expect(violation?.type).toBe("source-during-red");
  });
});

describe("TddMonitor (non-code mode)", () => {
  test("suppresses all violations when non-code mode is active", () => {
    const monitor = new TddMonitor(() => false);
    monitor.setNonCodeMode(true);

    // Would normally be source-before-test violation
    const violation = monitor.onFileWritten("src/config.ts");
    expect(violation).toBeNull();
  });

  test("returns to normal violation reporting when non-code mode is disabled", () => {
    const monitor = new TddMonitor(() => false);
    monitor.setNonCodeMode(true);
    monitor.setNonCodeMode(false);

    const violation = monitor.onFileWritten("src/config.ts");
    expect(violation?.type).toBe("source-before-test");
  });

  test("non-code mode is persisted in getState and restored via setState", () => {
    const monitor = new TddMonitor(() => false);
    monitor.setNonCodeMode(true);

    const state = monitor.getState();
    expect(state.nonCodeMode).toBe(true);

    const monitor2 = new TddMonitor(() => false);
    monitor2.setState(state.phase, state.testFiles, state.sourceFiles, state.redVerificationPending, state.nonCodeMode);
    const violation = monitor2.onFileWritten("src/foo.ts");
    expect(violation).toBeNull();
  });
});

describe("TddMonitor (Scenario 2: existing tests not run before change)", () => {
  test("returns existing-tests-not-run-before-change when existing test found but no test run yet", () => {
    // disk has the test file
    const monitor = new TddMonitor((p) => p === "src/utils.test.ts" || p === "tests/utils.test.ts");

    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).not.toBeNull();
    expect(violation?.type).toBe("existing-tests-not-run-before-change");
  });

  test("no violation when tests were run before source change", () => {
    const monitor = new TddMonitor((p) => p === "src/utils.test.ts" || p === "tests/utils.test.ts");

    monitor.onTestResult(true); // tests run before change
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).toBeNull();
  });

  test("violation resets after each source write (next write requires tests run again)", () => {
    const monitor = new TddMonitor((p) => p.includes(".test.ts"));

    monitor.onTestResult(true); // tests run
    monitor.onFileWritten("src/utils.ts"); // no violation, testsRunBeforeLastWrite resets

    // Second source write without running tests again
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation?.type).toBe("existing-tests-not-run-before-change");
  });

  test("no Scenario 2 violation in non-code mode", () => {
    const monitor = new TddMonitor((p) => p.includes(".test.ts"));
    monitor.setNonCodeMode(true);

    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation).toBeNull();
  });

  test("onCommit resets testsRunBeforeLastWrite state", () => {
    const monitor = new TddMonitor((p) => p.includes(".test.ts"));

    monitor.onTestResult(true);
    monitor.onCommit();

    // After commit, testsRunBeforeLastWrite is reset — next write needs tests run again
    const violation = monitor.onFileWritten("src/utils.ts");
    expect(violation?.type).toBe("existing-tests-not-run-before-change");
  });
});
