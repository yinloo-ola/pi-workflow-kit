export type TddViolationType = "source-before-test" | "source-during-red";

export function getTddViolationWarning(type: TddViolationType, file: string, _phase?: string): string {
  if (type === "source-before-test") {
    return `⚠️ TDD: Writing source code (${file}) without a failing test. Consider whether this change needs a test first, or if existing tests already cover it.`;
  }

  if (type === "source-during-red") {
    return `⚠️ TDD: Writing source code (${file}) before running your new test. Run the test suite to verify your test fails, then implement.`;
  }

  return `⚠️ TDD: Unexpected violation type "${type}" for ${file}`;
}

export type DebugViolationType = "fix-without-investigation" | "excessive-fix-attempts";

export type VerificationViolationType =
  | "commit-without-verification"
  | "push-without-verification"
  | "pr-without-verification";

export function getDebugViolationWarning(type: DebugViolationType, file: string, fixAttempts: number): string {
  if (type === "fix-without-investigation") {
    return `
⚠️ DEBUG VIOLATION: You edited production code (${file}) without investigating first.

The Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

Before editing code, you must:
1. Read the error messages and stack traces carefully
2. Read the relevant source files to understand the code
3. Trace the data flow to find where the bad value originates

You're treating symptoms, not causes. Symptom fixes create new bugs.

Stop. Read. Understand. Then fix.
`.trim();
  }

  if (type === "excessive-fix-attempts") {
    return `
⚠️ DEBUG WARNING: ${fixAttempts} failed fix attempts on ${file}.

${fixAttempts} fix attempts haven't resolved the issue. Consider stepping back to investigate root cause.

Pattern indicating architectural problem:
- Each fix reveals new problems in different places
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

STOP and question fundamentals:
- Is this pattern fundamentally sound?
- Are we sticking with it through sheer inertia?
- Should we refactor architecture vs. continue fixing symptoms?

Discuss with your human partner before attempting more fixes.
`.trim();
  }

  return `⚠️ DEBUG WARNING: Unexpected violation type "${type}" for ${file}`;
}

export function getVerificationViolationWarning(type: VerificationViolationType, command: string): string {
  const action =
    type === "commit-without-verification" ? "commit" : type === "push-without-verification" ? "push" : "create a PR";

  return `
⚠️ VERIFICATION REQUIRED: You're about to ${action} without running verification.

Command: ${command}

Run the test/build/lint command FIRST. Read the output. Confirm it passes.
THEN ${action}.

Evidence before claims. No shortcuts.
`.trim();
}
