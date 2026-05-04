# Implementation: cat pipe grep and cat glob false blocks

`cat file | grep ...` and `cat glob* 2>/dev/null || echo "..."` are falsely blocked during brainstorm/plan phases. Manual trace of `isSafeCommand` shows both should pass. Adding regression tests and verifying runtime.

## Task 1: Add regression tests for the two reported commands

checkpoint: test

Add test cases to `tests/workflow-guard.test.ts` inside the existing `isSafeCommand` describe block:

```ts
it("allows cat piped to grep", () => {
    expect(isSafeCommand("cd /Volumes/Ext/code/personal/sttacomp && cat web/package.json | grep -E \"tailwind|postcss|smui|svetamat\"")).toBe(true);
});

it("allows cat glob with 2>/dev/null and || echo fallback", () => {
    expect(isSafeCommand("cd /Volumes/Ext/code/personal/sttacomp && cat web/tailwind.config.* 2>/dev/null || echo \"no tailwind config found\"")).toBe(true);
});
```

Run `npx vitest run tests/workflow-guard.test.ts` — both should pass. If they fail, the bug is in the logic. If they pass, the bug is likely a stale extension build.

## Task 2: Fix logic if tests fail, or document runtime cause

checkpoint: done

If tests fail: fix the pattern logic in `extensions/workflow-guard.ts` and re-run tests.
If tests pass: verify the built/loaded extension matches the source by checking how pi loads extensions (eval from source vs compiled). Document findings.
