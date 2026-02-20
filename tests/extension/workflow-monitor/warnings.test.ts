import { describe, expect, test } from "vitest";
import {
  getDebugViolationWarning,
  getTddViolationWarning,
  getVerificationViolationWarning,
} from "../../../extensions/workflow-monitor/warnings";

describe("getTddViolationWarning", () => {
  test("returns warning for source-before-test violation", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).toContain("⚠️ TDD");
    expect(warning).toContain("src/utils.ts");
    expect(warning).toContain("without a failing test");
  });

  test("mentions that existing tests may already cover the change", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).toContain("existing tests");
  });

  test("uses same wording regardless of phase", () => {
    const withVerify = getTddViolationWarning("source-before-test", "src/utils.ts", "verify");
    const withImplement = getTddViolationWarning("source-before-test", "src/utils.ts", "implement");
    const withNone = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(withVerify).toEqual(withImplement);
    expect(withVerify).toEqual(withNone);
  });

  test("does not include Delete directive or Iron Law language", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).not.toContain("Delete");
    expect(warning).not.toContain("Iron Law");
  });

  test("uses standard wording when no phase provided", () => {
    const warning = getTddViolationWarning("source-before-test", "src/utils.ts");
    expect(warning).toContain("without a failing test");
  });

  test("returns source-during-red warning", () => {
    const warning = getTddViolationWarning("source-during-red", "src/utils.ts");
    expect(warning).toContain("before running your new test");
    expect(warning).toContain("Run the test suite");
  });

  test("source-during-red warning mentions running the test first", () => {
    const warning = getTddViolationWarning("source-during-red", "src/foo.ts");
    expect(warning).toContain("before running your new test");
    expect(warning).toContain("src/foo.ts");
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
    expect(warning).toContain("3 failed fix attempts");
    expect(warning).toContain("architecture");
    expect(warning).toContain("human partner");
  });

  test("returns excessive-fix-attempts warning with higher count", () => {
    const warning = getDebugViolationWarning("excessive-fix-attempts", "src/foo.ts", 5);
    expect(warning).toContain("5 failed fix attempts");
  });

  test("excessive-fix-attempts warning shows correct attempt count", () => {
    const warning = getDebugViolationWarning("excessive-fix-attempts", "src/foo.ts", 3);
    expect(warning).toContain("3 failed fix attempts");
    expect(warning).not.toContain("fix attempt #3");
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
