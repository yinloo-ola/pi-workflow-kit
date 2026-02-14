export type TddViolationType = "source-before-test" | "source-during-red";

export function getTddViolationWarning(type: TddViolationType, file: string): string {
  if (type === "source-before-test") {
    return `
⚠️ TDD VIOLATION: You wrote production code (${file}) without a failing test first.

The Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Delete this code. Write the failing test first. Then implement.

Common rationalizations (all wrong):
- "Too simple to test" → Simple code breaks. Test takes 30 seconds.
- "I'll test after" → Tests passing immediately prove nothing.
- "Need to explore first" → Fine. Throw away exploration, start with TDD.
- "Deleting this work is wasteful" → Sunk cost fallacy. Keeping unverified code is debt.

Delete the production code. Write the test. Watch it fail. Then implement.
`.trim();
  }

  if (type === "source-during-red") {
    return `
⚠️ TDD VIOLATION: You wrote production code (${file}) during RED-PENDING phase.

Run your new test before editing source code.

The TDD cycle: Write test → Run it (RED) → Write code → Run it (GREEN)

You wrote a test but haven't run it yet. Run the test suite now. Watch the new test fail. THEN write the production code.
`.trim();
  }

  return `⚠️ TDD WARNING: Unexpected violation type "${type}" for ${file}`;
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
⚠️ DEBUG WARNING: This is fix attempt #${fixAttempts} for ${file}. Previous attempts failed.

When 3+ fixes fail, this is NOT a failed hypothesis — it's a wrong architecture.

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
