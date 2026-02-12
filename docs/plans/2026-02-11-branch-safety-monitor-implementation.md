# Branch Safety Monitor Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Make the `workflow-monitor` extension automatically surface the current git branch at session start and warn on the first write/edit of a session, plus add a finish-phase reminder about docs + learnings.

**Architecture:** Add a small `getCurrentGitRef()` helper (branch name, or short SHA for detached HEAD, or `null` outside a git repo). In `extensions/workflow-monitor.ts`, track per-session flags (`branchNoticeShown`, `branchConfirmed`) and key per-call pending messages by `toolCallId` (to avoid cross-call leakage); inject the branch notice into the first `tool_result` of a session and inject the first-write gate into the first `write`/`edit` tool result. Injection must **preserve non-text tool output** by prepending a text block rather than rebuilding content from text only. Extend the existing boundary prompting logic to prefill a “docs + learnings” reminder when transitioning into the `finish` phase.

**Tech Stack:** TypeScript, Node.js (`node:child_process`), Vitest.

---

### Task 1: Add a git ref helper (branch or short SHA)

**Files:**
- Create: `extensions/workflow-monitor/git.ts`
- Create: `tests/extension/workflow-monitor/git.test.ts`

**Step 1: Write the failing test**

Create `tests/extension/workflow-monitor/git.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { getCurrentGitRef } from "../../../extensions/workflow-monitor/git";

const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  execSyncMock.mockReset();
});

describe("getCurrentGitRef", () => {
  test("returns branch name when on a branch", () => {
    execSyncMock.mockReturnValueOnce(Buffer.from("feature/xyz\n"));

    expect(getCurrentGitRef()).toBe("feature/xyz");
  });

  test("returns short SHA when detached HEAD (branch name empty)", () => {
    execSyncMock.mockReturnValueOnce(Buffer.from("\n"));
    execSyncMock.mockReturnValueOnce(Buffer.from("abc123\n"));

    expect(getCurrentGitRef()).toBe("abc123");
  });

  test("returns null when not in a git repo (exec throws)", () => {
    execSyncMock.mockImplementation(() => {
      throw new Error("not a git repo");
    });

    expect(getCurrentGitRef()).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/extension/workflow-monitor/git.test.ts
```

Expected: FAIL with something like `Cannot find module '../../../extensions/workflow-monitor/git'`.

**Step 3: Write minimal implementation**

Create `extensions/workflow-monitor/git.ts`:

```ts
import { execSync } from "node:child_process";

/**
 * Returns the current git branch name, or (if detached) the short HEAD SHA.
 * Returns null if the current working directory is not in a git repo.
 */
export function getCurrentGitRef(cwd: string = process.cwd()): string | null {
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (branch) return branch;

    const sha = execSync("git rev-parse --short HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    return sha || null;
  } catch {
    return null;
  }
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/extension/workflow-monitor/git.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/git.ts tests/extension/workflow-monitor/git.test.ts
git commit -m "feat(workflow-monitor): add git ref helper"
```

---

### Task 2: Inject a “current branch” notice on the first tool result of a session

**Files:**
- Modify: `extensions/workflow-monitor.ts`
- Create: `tests/extension/workflow-monitor/branch-safety.test.ts`

**Step 1: Write the failing test**

Create `tests/extension/workflow-monitor/branch-safety.test.ts`:

```ts
import { describe, test, expect, vi, beforeEach } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

type Handler = (event: any, ctx: any) => any;

vi.mock("node:child_process", () => ({ execSync: vi.fn() }));
import { execSync } from "node:child_process";
const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>;

function createFakePi() {
  const handlers = new Map<string, Handler[]>();

  return {
    handlers,
    api: {
      on(event: string, handler: Handler) {
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
      },
      registerTool() {},
      registerCommand() {},
      appendEntry() {},
    },
  };
}

function getSingleHandler(handlers: Map<string, Handler[]>, event: string): Handler {
  const list = handlers.get(event) ?? [];
  expect(list.length).toBeGreaterThan(0);
  return list[0]!;
}

beforeEach(() => {
  execSyncMock.mockReset();
});

describe("branch safety monitor", () => {
  test("prepends current branch notice on the first tool_result of a session", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("my-branch\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const res = await onToolResult(
      {
        toolName: "bash",
        input: { command: "echo hi" },
        content: [{ type: "text", text: "hi" }],
        details: { exitCode: 0 },
      },
      ctx
    );

    expect(res?.content?.[0]?.type).toBe("text");
    const text = res.content[0].text as string;
    expect(text).toContain("📌 Current branch: `my-branch`");
    expect(text).toContain("hi");
  });
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "prepends current branch notice"
```

Expected: FAIL because the extension does not yet inject the notice.

**Step 3: Write minimal implementation**

Modify `extensions/workflow-monitor.ts`:

1) Add import:

```ts
import { getCurrentGitRef } from "./workflow-monitor/git";
```

2) Add module-local state near `pendingViolation`:

```ts
let branchNoticeShown = false;
let branchConfirmed = false;
let pendingBranchGate: string | null = null;
```

3) Reset the flags in the existing session event loop (same place `pendingViolation` is reset):

```ts
branchNoticeShown = false;
branchConfirmed = false;
pendingBranchGate = null;
```

4) In `pi.on("tool_result", ...)`, before returning, implement “Layer 1”:

- If `!branchNoticeShown`, call `getCurrentGitRef()`.
- If it returns a string, prepend `📌 Current branch: \`<ref>\`` to the tool result’s text.
- If it returns `null`, mark both `branchNoticeShown = true` and `branchConfirmed = true` so we silently skip in non-git repos.

(Implementation note: don’t `return` early just to inject the branch notice; it must compose with existing warning injections.)

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "prepends current branch notice"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/branch-safety.test.ts
git commit -m "feat(workflow-monitor): show current branch at session start"
```

---

### Task 3: Inject a first-write gate warning on the first write/edit of a session

**Files:**
- Modify: `extensions/workflow-monitor.ts`
- Modify: `tests/extension/workflow-monitor/branch-safety.test.ts`

**Step 1: Write the failing test**

Append to `tests/extension/workflow-monitor/branch-safety.test.ts`:

```ts
test("injects a first-write gate warning on the first write tool_result", async () => {
  execSyncMock.mockImplementation((cmd: string) => {
    if (cmd.startsWith("git branch")) return Buffer.from("topic/branch\n");
    throw new Error("unexpected command");
  });

  const fake = createFakePi();
  workflowMonitorExtension(fake.api as any);

  const onToolCall = getSingleHandler(fake.handlers, "tool_call");
  const onToolResult = getSingleHandler(fake.handlers, "tool_result");

  const ctx = {
    hasUI: false,
    sessionManager: { getBranch: () => [] },
    ui: { setWidget: () => {} },
  };

  await onToolCall({ toolName: "write", input: { path: "README.md", content: "x" } }, ctx);

  const res = await onToolResult(
    {
      toolName: "write",
      input: { path: "README.md", content: "x" },
      content: [{ type: "text", text: "ok" }],
      details: {},
    },
    ctx
  );

  const text = res.content[0].text as string;
  expect(text).toContain("⚠️ First write of this session.");
  expect(text).toContain("topic/branch");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "first-write gate"
```

Expected: FAIL (warning not injected yet).

**Step 3: Write minimal implementation**

Modify `extensions/workflow-monitor.ts`:

1) In `pi.on("tool_call", ...)`, when `event.toolName` is `"write"` or `"edit"`:

```ts
if ((event.toolName === "write" || event.toolName === "edit") && !branchConfirmed) {
  const ref = getCurrentGitRef();
  branchConfirmed = true;

  if (ref) {
    pendingBranchGate =
      `⚠️ First write of this session. You're on branch \`${ref}\`.\n` +
      `Confirm with the user this is the correct branch before continuing, or create a new branch/worktree.`;
  } else {
    // Not a git repo: disable branch messages silently.
    branchNoticeShown = true;
  }
}
```

2) In `pi.on("tool_result", ...)`, when the tool is `write` or `edit`, append `pendingBranchGate` (if set) to the returned text (and clear it).

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "first write tool_result"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/branch-safety.test.ts
git commit -m "feat(workflow-monitor): warn on first write per session"
```

---

### Task 4: Ensure branch safety state resets on session events

**Files:**
- Modify: `tests/extension/workflow-monitor/branch-safety.test.ts`
- Modify: `extensions/workflow-monitor.ts`

**Step 1: Write the failing test**

Append to `tests/extension/workflow-monitor/branch-safety.test.ts`:

```ts
test("branch notice is shown again after session_switch resets state", async () => {
  execSyncMock.mockImplementation((cmd: string) => {
    if (cmd.startsWith("git branch")) return Buffer.from("branch-a\n");
    throw new Error("unexpected command");
  });

  const fake = createFakePi();
  workflowMonitorExtension(fake.api as any);

  const onToolResult = getSingleHandler(fake.handlers, "tool_result");
  const onSessionSwitch = getSingleHandler(fake.handlers, "session_switch");

  const ctx = {
    hasUI: false,
    sessionManager: { getBranch: () => [] },
    ui: { setWidget: () => {} },
  };

  const res1 = await onToolResult(
    {
      toolName: "bash",
      input: { command: "echo 1" },
      content: [{ type: "text", text: "one" }],
      details: { exitCode: 0 },
    },
    ctx
  );
  expect((res1.content[0].text as string)).toContain("branch-a");

  await onSessionSwitch({}, ctx);

  execSyncMock.mockImplementation((cmd: string) => {
    if (cmd.startsWith("git branch")) return Buffer.from("branch-b\n");
    throw new Error("unexpected command");
  });

  const res2 = await onToolResult(
    {
      toolName: "bash",
      input: { command: "echo 2" },
      content: [{ type: "text", text: "two" }],
      details: { exitCode: 0 },
    },
    ctx
  );

  expect((res2.content[0].text as string)).toContain("branch-b");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "session_switch resets state"
```

Expected: FAIL until the session reset handler resets the new flags.

**Step 3: Write minimal implementation**

Modify `extensions/workflow-monitor.ts` session-event reset block to ensure it resets *all* branch-safety state:

```ts
branchNoticeShown = false;
branchConfirmed = false;
pendingBranchGate = null;
```

(If you already added this in Task 2, this step should be a no-op and the test will pass.)

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/extension/workflow-monitor/branch-safety.test.ts -t "session_switch resets state"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/branch-safety.test.ts
git commit -m "fix(workflow-monitor): reset branch-safety flags on session change"
```

---

### Task 5: Add a finish-phase reminder (docs + learnings) when transitioning into `finish`

**Files:**
- Modify: `extensions/workflow-monitor.ts`
- Modify: `tests/extension/workflow-monitor/transition-prompt.test.ts`

**Step 1: Write the failing test**

Append to `tests/extension/workflow-monitor/transition-prompt.test.ts`:

```ts
test("finish transition pre-fills docs + learnings reminder", async () => {
  const fake = createFakePi();
  workflowMonitorExtension(fake.api as any);

  const onInput = getSingleHandler(fake.handlers, "input");
  const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

  const editorTexts: string[] = [];

  const ctx = {
    hasUI: true,
    sessionManager: { getBranch: () => [] },
    ui: {
      setWidget: () => {},
      select: async () => "next",
      setEditorText: (text: string) => editorTexts.push(text),
      notify: () => {},
    },
  };

  // Advance workflow all the way into finish so that review is marked complete,
  // which makes computeBoundaryToPrompt() return "review_complete".
  await onInput({ source: "user", input: "/skill:brainstorming" }, ctx);
  await onInput({ source: "user", input: "/skill:writing-plans" }, ctx);
  await onInput({ source: "user", input: "/skill:executing-plans" }, ctx);
  await onInput({ source: "user", input: "/skill:verification-before-completion" }, ctx);
  await onInput({ source: "user", input: "/skill:requesting-code-review" }, ctx);
  await onInput({ source: "user", input: "/skill:finishing-a-development-branch" }, ctx);

  await onAgentEnd({}, ctx);

  const text = editorTexts.at(-1) ?? "";
  expect(text).toContain("Before finishing:");
  expect(text).toContain("documentation updates");
  expect(text).toContain("What was learned");
  expect(text).toContain("/skill:finishing-a-development-branch");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/extension/workflow-monitor/transition-prompt.test.ts -t "finish transition pre-fills"
```

Expected: FAIL (editor text currently only contains the skill invocation).

**Step 3: Write minimal implementation**

Modify `extensions/workflow-monitor.ts` inside the `pi.on("agent_end", ...)` handler.

When the selected option is `"next"` (and also when it is `"fresh"`), and when `prompt.nextPhase === "finish"`, set editor text to include the reminder plus the command, e.g.:

```ts
const finishReminder =
  "Before finishing:\n" +
  "- Does this work require documentation updates? (README, CHANGELOG, API docs, inline docs)\n" +
  "- What was learned during this implementation? (surprises, codebase knowledge, things to do differently)\n\n";

if (selected === "next") {
  ctx.ui.setEditorText(
    prompt.nextPhase === "finish" ? finishReminder + nextInSession : nextInSession
  );
} else if (selected === "fresh") {
  ctx.ui.setEditorText(
    prompt.nextPhase === "finish" ? finishReminder + fresh : fresh
  );
}
```

**Step 4: Run test to verify it passes**

Run:

```bash
npm test -- tests/extension/workflow-monitor/transition-prompt.test.ts -t "finish transition pre-fills"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/transition-prompt.test.ts
git commit -m "feat(workflow-monitor): remind about docs + learnings before finish"
```

---

### Task 6: Full verification

**Files:**
- (No file changes expected)

**Step 1: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS (exit code 0).

**Step 2: Smoke-check type errors (optional)**

If your environment has `tsc` available, run:

```bash
npx tsc -p . --noEmit
```

Expected: no type errors.

**Step 3: Commit (only if you made incidental fixes)**

```bash
git status
# If clean: do nothing
# If not clean:
git add -A
git commit -m "chore: fix branch-safety monitor test/typing issues"
```
