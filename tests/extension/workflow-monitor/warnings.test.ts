import { describe, expect, test } from "vitest";
import {
  getDebugViolationWarning,
  getTddViolationWarning,
  getVerificationViolationWarning,
} from "../../../extensions/workflow-monitor/warnings";

describe("getTddViolationWarning", () => {
  test("returns warning for source-before-test violation", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).toContain("TDD VIOLATION");
    expect(warning).toContain("src/utils.ts");
    expect(warning).toContain("Delete");
    expect(warning).toContain("failing test");
  });

  test("includes anti-rationalization content", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).toContain("Too simple to test");
    expect(warning).toContain("I'll test after");
  });

  test("returns source-during-red warning", () => {
    const warning = getTddViolationWarning("source-during-red", "src/utils.ts");
    expect(warning).toContain("RED-PENDING phase");
    expect(warning).toContain("Run the test suite now");
  });

  test("source-during-red warning mentions running the test first", () => {
    const warning = getTddViolationWarning("source-during-red", "src/foo.ts");
    expect(warning).toContain("Run your new test before editing source code");
  });

  test("warning is concise (under 15 lines)", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    const lines = warning.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeLessThanOrEqual(15);
  });
});

describe("getDebugViolationWarning", () => {
  test("returns fix-without-investigation warning", () => {
    const warning = getDebugViolationWarning("fix-without-investigation", "src/foo.ts", 0);
    expect(warning).toContain("DEBUG VIOLATION");
    expect(warning).toContain("src/foo.ts");
    expect(warning).toContain("investigating");
  });

  test("returns excessive-fix-attempts warning with count", () => {
    const warning = getDebugViolationWarning("excessive-fix-attempts", "src/foo.ts", 3);
    expect(warning).toContain("fix attempt #3");
    expect(warning).toContain("architecture");
    expect(warning).toContain("human partner");
  });

  test("returns excessive-fix-attempts warning with higher count", () => {
    const warning = getDebugViolationWarning("excessive-fix-attempts", "src/foo.ts", 5);
    expect(warning).toContain("fix attempt #5");
  });
});

describe("getVerificationViolationWarning", () => {
  test("warns about commit without verification", () => {
    const msg = getVerificationViolationWarning("commit-without-verification", "git commit -m 'feat'");
    expect(msg).toContain("VERIFICATION");
    expect(msg).toContain("git commit");
    expect(msg).toContain("Run the test");
  });

  test("warns about push without verification", () => {
    const msg = getVerificationViolationWarning("push-without-verification", "git push");
    expect(msg).toContain("push");
  });

  test("warns about PR without verification", () => {
    const msg = getVerificationViolationWarning("pr-without-verification", "gh pr create");
    expect(msg).toContain("PR");
  });
});
