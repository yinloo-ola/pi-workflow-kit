# Workflow Tracker Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Add an informational (non-enforcing) workflow tracker to the existing workflow-monitor extension that (1) shows the current workflow phase in the TUI widget, (2) prompts once at natural boundaries with consistent next-step options, and (3) supports a “fresh session” handoff via a `/workflow-next` command.

**Architecture:** Add a `WorkflowTracker` state machine (`extensions/workflow-monitor/workflow-tracker.ts`) plus a small prompt-definition module (`workflow-transitions.ts`). Wire the tracker into `extensions/workflow-monitor.ts` via existing `input`, `tool_call`, `tool_result`, and `agent_end` hooks. Persist tracker state by appending `custom` session entries (`pi.appendEntry`) and reconstructing state on session lifecycle events by scanning `ctx.sessionManager.getBranch()`.

**Tech Stack:** TypeScript, pi extension API (events, widgets, commands, appendEntry), Vitest.

**Primary reference (approved design):** `docs/plans/2026-02-10-workflow-tracker-design.md`

**pi extension API references (examples to copy patterns from):**
- Command + new session: `/home/pi/.npm-global/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/handoff.ts`
- Input event interception: `/home/pi/.npm-global/lib/node_modules/@mariozechner/pi-coding-agent/examples/extensions/input-transform.ts`
- Session state reconstruction pattern: `extensions/plan-tracker.ts`

---

## Definitions (keep these consistent)

**Workflow phases (fixed order):**

```ts
export const WORKFLOW_PHASES = [
  "brainstorm",
  "plan",
  "execute",
  "verify",
  "review",
  "finish",
] as const;
export type Phase = (typeof WORKFLOW_PHASES)[number];
```

**Phase status:**

```ts
export type PhaseStatus = "pending" | "active" | "complete" | "skipped";
```

**State shape:**

```ts
export interface WorkflowTrackerState {
  phases: Record<Phase, PhaseStatus>;
  currentPhase: Phase | null;
  artifacts: Record<Phase, string | null>; // file paths
  prompted: Record<Phase, boolean>;        // “prompt for NEXT step after completing this phase”
}
```

**Persistence:** append a session custom entry every time the tracker state changes:

```ts
export const WORKFLOW_TRACKER_ENTRY_TYPE = "workflow_tracker_state";
// pi.appendEntry(WORKFLOW_TRACKER_ENTRY_TYPE, state)
```

---

### Task 1: Create `WorkflowTracker` state machine (phase transitions + skipping)

**Files:**
- Create: `extensions/workflow-monitor/workflow-tracker.ts`
- Test: `tests/extension/workflow-monitor/workflow-tracker.test.ts`

**Step 1: Write the failing tests**

```ts
// tests/extension/workflow-monitor/workflow-tracker.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { WorkflowTracker, type Phase, WORKFLOW_PHASES } from "../../../extensions/workflow-monitor/workflow-tracker";

describe("WorkflowTracker", () => {
  let tracker: WorkflowTracker;

  beforeEach(() => {
    tracker = new WorkflowTracker();
  });

  test("starts idle with all phases pending", () => {
    const s = tracker.getState();
    expect(s.currentPhase).toBeNull();
    for (const p of WORKFLOW_PHASES) expect(s.phases[p]).toBe("pending");
  });

  test("advancing to a later phase marks earlier pending phases as skipped", () => {
    tracker.advanceTo("execute");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("execute");
    expect(s.phases.brainstorm).toBe("skipped");
    expect(s.phases.plan).toBe("skipped");
    expect(s.phases.execute).toBe("active");
  });

  test("advanceTo is forward-only (no-op when going backwards)", () => {
    tracker.advanceTo("plan");
    tracker.advanceTo("brainstorm");
    expect(tracker.getState().currentPhase).toBe("plan");
  });

  test("completeCurrent marks current phase complete and keeps it as current until next advance", () => {
    tracker.advanceTo("plan");
    tracker.completeCurrent();
    const s = tracker.getState();
    expect(s.phases.plan).toBe("complete");
    expect(s.currentPhase).toBe("plan");
  });

  test("records artifacts per phase", () => {
    tracker.recordArtifact("brainstorm", "docs/plans/2026-02-10-x-design.md");
    expect(tracker.getState().artifacts.brainstorm).toBe("docs/plans/2026-02-10-x-design.md");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: FAIL with “Cannot find module …/workflow-tracker”

**Step 3: Write minimal implementation**

```ts
// extensions/workflow-monitor/workflow-tracker.ts

export const WORKFLOW_PHASES = [
  "brainstorm",
  "plan",
  "execute",
  "verify",
  "review",
  "finish",
] as const;

export type Phase = (typeof WORKFLOW_PHASES)[number];
export type PhaseStatus = "pending" | "active" | "complete" | "skipped";

export interface WorkflowTrackerState {
  phases: Record<Phase, PhaseStatus>;
  currentPhase: Phase | null;
  artifacts: Record<Phase, string | null>;
  prompted: Record<Phase, boolean>;
}

function emptyState(): WorkflowTrackerState {
  const phases = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, "pending"])) as Record<Phase, PhaseStatus>;
  const artifacts = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, null])) as Record<Phase, string | null>;
  const prompted = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, false])) as Record<Phase, boolean>;
  return { phases, currentPhase: null, artifacts, prompted };
}

export class WorkflowTracker {
  private state: WorkflowTrackerState = emptyState();

  getState(): WorkflowTrackerState {
    // defensive copy (tests rely on immutability)
    return JSON.parse(JSON.stringify(this.state)) as WorkflowTrackerState;
  }

  setState(state: WorkflowTrackerState) {
    this.state = JSON.parse(JSON.stringify(state)) as WorkflowTrackerState;
  }

  advanceTo(phase: Phase): boolean {
    const current = this.state.currentPhase;
    if (current) {
      const curIdx = WORKFLOW_PHASES.indexOf(current);
      const nextIdx = WORKFLOW_PHASES.indexOf(phase);
      if (nextIdx <= curIdx) return false;
      // Mark the old current complete only if it was active
      if (this.state.phases[current] === "active") this.state.phases[current] = "complete";
    }

    const targetIdx = WORKFLOW_PHASES.indexOf(phase);
    for (let i = 0; i < targetIdx; i++) {
      const p = WORKFLOW_PHASES[i];
      if (this.state.phases[p] === "pending") this.state.phases[p] = "skipped";
    }

    // Clear any other active phase
    for (const p of WORKFLOW_PHASES) {
      if (this.state.phases[p] === "active") this.state.phases[p] = "complete";
    }

    this.state.currentPhase = phase;
    if (this.state.phases[phase] === "pending") this.state.phases[phase] = "active";
    return true;
  }

  completeCurrent(): boolean {
    const p = this.state.currentPhase;
    if (!p) return false;
    if (this.state.phases[p] === "complete") return false;
    this.state.phases[p] = "complete";
    return true;
  }

  recordArtifact(phase: Phase, path: string): boolean {
    if (this.state.artifacts[phase] === path) return false;
    this.state.artifacts[phase] = path;
    return true;
  }

  markPrompted(phase: Phase): boolean {
    if (this.state.prompted[phase]) return false;
    this.state.prompted[phase] = true;
    return true;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-tracker.ts tests/extension/workflow-monitor/workflow-tracker.test.ts
git commit -m "feat(workflow-tracker): add core state machine"
```

---

### Task 2: Add detection helpers (skill input + artifact write + plan_tracker init)

**Files:**
- Modify: `extensions/workflow-monitor/workflow-tracker.ts`
- Test: `tests/extension/workflow-monitor/workflow-tracker.test.ts`

**Step 1: Write failing tests for detection**

```ts
// append to tests/extension/workflow-monitor/workflow-tracker.test.ts

describe("WorkflowTracker detection helpers", () => {
  test("detects /skill:brainstorming and advances to brainstorm", () => {
    const tracker = new WorkflowTracker();
    const changed = tracker.onInputText("/skill:brainstorming");
    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("brainstorm");
  });

  test("detects writing a design doc artifact and advances to brainstorm", () => {
    const tracker = new WorkflowTracker();
    tracker.onFileWritten("docs/plans/2026-02-10-foo-design.md");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("brainstorm");
    expect(s.artifacts.brainstorm).toBe("docs/plans/2026-02-10-foo-design.md");
  });

  test("detects writing an implementation plan artifact and advances to plan", () => {
    const tracker = new WorkflowTracker();
    tracker.onFileWritten("docs/plans/2026-02-11-foo-implementation.md");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("plan");
    expect(s.artifacts.plan).toBe("docs/plans/2026-02-11-foo-implementation.md");
  });

  test("detects plan_tracker init and advances to execute", () => {
    const tracker = new WorkflowTracker();
    tracker.onPlanTrackerInit();
    expect(tracker.getState().currentPhase).toBe("execute");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: FAIL with “onInputText is not a function”

**Step 3: Implement minimal detection helpers**

```ts
// extensions/workflow-monitor/workflow-tracker.ts (additions)

const PLANS_DIR_RE = /^docs\/plans\//;
const DESIGN_RE = /-design\.md$/;
const IMPLEMENTATION_RE = /-implementation\.md$/;

export class WorkflowTracker {
  // ...existing code...

  onInputText(text: string): boolean {
    const t = text.trim();
    if (t.startsWith("/skill:")) {
      const skill = t.slice("/skill:".length).split(/\s+/)[0];
      if (skill === "brainstorming") return this.advanceTo("brainstorm");
      if (skill === "writing-plans") return this.advanceTo("plan");
      if (skill === "executing-plans" || skill === "subagent-driven-development") return this.advanceTo("execute");
      if (skill === "verification-before-completion") return this.advanceTo("verify");
      if (skill === "requesting-code-review") return this.advanceTo("review");
      if (skill === "finishing-a-development-branch") return this.advanceTo("finish");
    }
    return false;
  }

  onFileWritten(path: string): boolean {
    if (!PLANS_DIR_RE.test(path)) return false;

    if (DESIGN_RE.test(path)) {
      const a = this.recordArtifact("brainstorm", path);
      const b = this.advanceTo("brainstorm");
      return a || b;
    }

    if (IMPLEMENTATION_RE.test(path)) {
      const a = this.recordArtifact("plan", path);
      const b = this.advanceTo("plan");
      return a || b;
    }

    return false;
  }

  onPlanTrackerInit(): boolean {
    return this.advanceTo("execute");
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-tracker.ts tests/extension/workflow-monitor/workflow-tracker.test.ts
git commit -m "feat(workflow-tracker): detect skills, artifacts, and plan execution"
```

---

### Task 3: Persist/reconstruct tracker state using custom session entries

**Files:**
- Modify: `extensions/workflow-monitor/workflow-tracker.ts`
- Test: `tests/extension/workflow-monitor/workflow-tracker.test.ts`

**Step 1: Write failing tests for reconstruction**

```ts
import type { SessionEntry } from "@mariozechner/pi-coding-agent";

function custom(data: any): SessionEntry {
  return {
    type: "custom",
    id: "x",
    parentId: null,
    timestamp: Date.now(),
    customType: "workflow_tracker_state",
    data,
  } as any;
}

test("reconstructFromBranch returns last saved state", () => {
  const tracker = new WorkflowTracker();
  tracker.advanceTo("plan");
  const s1 = tracker.getState();

  tracker.advanceTo("execute");
  const s2 = tracker.getState();

  const reconstructed = WorkflowTracker.reconstructFromBranch([
    custom(s1),
    { type: "message" } as any,
    custom(s2),
  ] as any);

  expect(reconstructed.currentPhase).toBe("execute");
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: FAIL — `reconstructFromBranch` not defined

**Step 3: Implement reconstruction helper**

```ts
// extensions/workflow-monitor/workflow-tracker.ts
import type { SessionEntry } from "@mariozechner/pi-coding-agent";

export const WORKFLOW_TRACKER_ENTRY_TYPE = "workflow_tracker_state";

export class WorkflowTracker {
  // ...

  static reconstructFromBranch(branch: SessionEntry[]): WorkflowTrackerState | null {
    let last: WorkflowTrackerState | null = null;
    for (const entry of branch) {
      if (entry.type !== "custom") continue;
      if ((entry as any).customType !== WORKFLOW_TRACKER_ENTRY_TYPE) continue;
      const data = (entry as any).data as WorkflowTrackerState | undefined;
      if (data && typeof data === "object") last = data;
    }
    return last;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-tracker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-tracker.ts tests/extension/workflow-monitor/workflow-tracker.test.ts
git commit -m "feat(workflow-tracker): persist state via custom session entries"
```

---

### Task 4: Define transition prompts (copy/paste-safe text + option mapping)

**Files:**
- Create: `extensions/workflow-monitor/workflow-transitions.ts`
- Test: `tests/extension/workflow-monitor/workflow-transitions.test.ts`

**Step 1: Write failing tests**

```ts
// tests/extension/workflow-monitor/workflow-transitions.test.ts
import { describe, test, expect } from "vitest";
import { getTransitionPrompt } from "../../../extensions/workflow-monitor/workflow-transitions";

describe("workflow transitions", () => {
  test("design-committed prompt targets plan", () => {
    const p = getTransitionPrompt("design_committed", "docs/plans/x-design.md");
    expect(p.title).toMatch(/Design committed/i);
    expect(p.nextPhase).toBe("plan");
    expect(p.options).toHaveLength(4);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-transitions.test.ts`
Expected: FAIL — module not found

**Step 3: Implement minimal transition definitions**

```ts
// extensions/workflow-monitor/workflow-transitions.ts
import type { Phase } from "./workflow-tracker";

export type TransitionBoundary =
  | "design_committed"
  | "plan_ready"
  | "execution_complete"
  | "verification_passed"
  | "review_complete";

export type TransitionChoice = "next" | "fresh" | "skip" | "discuss";

export interface TransitionPrompt {
  boundary: TransitionBoundary;
  title: string;
  nextPhase: Phase;
  artifactPath: string | null;
  options: { choice: TransitionChoice; label: string }[];
}

const BASE_OPTIONS: TransitionPrompt["options"] = [
  { choice: "next", label: "Next step (this session)" },
  { choice: "fresh", label: "Fresh session → next step" },
  { choice: "skip", label: "Skip" },
  { choice: "discuss", label: "Discuss" },
];

export function getTransitionPrompt(boundary: TransitionBoundary, artifactPath: string | null): TransitionPrompt {
  switch (boundary) {
    case "design_committed":
      return { boundary, title: "Design committed. What next?", nextPhase: "plan", artifactPath, options: BASE_OPTIONS };
    case "plan_ready":
      return { boundary, title: "Plan ready. What next?", nextPhase: "execute", artifactPath, options: BASE_OPTIONS };
    case "execution_complete":
      return { boundary, title: "Execution complete. What next?", nextPhase: "verify", artifactPath, options: BASE_OPTIONS };
    case "verification_passed":
      return { boundary, title: "Verification passed. What next?", nextPhase: "review", artifactPath, options: BASE_OPTIONS };
    case "review_complete":
      return { boundary, title: "Review complete. What next?", nextPhase: "finish", artifactPath, options: BASE_OPTIONS };
    default:
      return { boundary, title: "What next?", nextPhase: "plan", artifactPath, options: BASE_OPTIONS };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-transitions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-transitions.ts tests/extension/workflow-monitor/workflow-transitions.test.ts
git commit -m "feat(workflow-tracker): add transition prompt definitions"
```

---

### Task 5: Integrate tracker into `WorkflowHandler` (state access for widget + extension)

**Files:**
- Modify: `extensions/workflow-monitor/workflow-handler.ts:1-130` (add tracker instance + pass-through methods)
- Test: `tests/extension/workflow-monitor/workflow-handler-tracker.test.ts`

**Step 1: Write failing tests**

```ts
// tests/extension/workflow-monitor/workflow-handler-tracker.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { createWorkflowHandler, type WorkflowHandler } from "../../../extensions/workflow-monitor/workflow-handler";

describe("WorkflowHandler workflow-tracker integration", () => {
  let handler: WorkflowHandler;

  beforeEach(() => {
    handler = createWorkflowHandler();
  });

  test("input /skill:writing-plans activates plan phase", () => {
    handler.handleInputText("/skill:writing-plans");
    expect(handler.getWorkflowState()!.currentPhase).toBe("plan");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-handler-tracker.test.ts`
Expected: FAIL — methods not found

**Step 3: Implement minimal handler wiring**

```ts
// extensions/workflow-monitor/workflow-handler.ts
import { WorkflowTracker, type WorkflowTrackerState, WORKFLOW_TRACKER_ENTRY_TYPE } from "./workflow-tracker";
import type { SessionEntry } from "@mariozechner/pi-coding-agent";

export interface WorkflowHandler {
  // ...existing...
  handleInputText(text: string): boolean;
  handleFileWritten(path: string): boolean;
  handlePlanTrackerToolCall(input: Record<string, any>): boolean;
  getWorkflowState(): WorkflowTrackerState | null;
  restoreWorkflowStateFromBranch(branch: SessionEntry[]): void;
}

export function createWorkflowHandler(): WorkflowHandler {
  // ...existing...
  const tracker = new WorkflowTracker();

  return {
    // ...existing...

    handleInputText(text: string) {
      return tracker.onInputText(text);
    },

    handleFileWritten(path: string) {
      return tracker.onFileWritten(path);
    },

    handlePlanTrackerToolCall(input: Record<string, any>) {
      if (input.action === "init") return tracker.onPlanTrackerInit();
      return false;
    },

    getWorkflowState() {
      return tracker.getState();
    },

    restoreWorkflowStateFromBranch(branch: SessionEntry[]) {
      const state = WorkflowTracker.reconstructFromBranch(branch);
      if (state) tracker.setState(state);
    },

    resetState() {
      // keep existing resets, but also reset tracker
      debugFailStreak = 0;
      tdd.onCommit();
      debug.onCommit();
      verification.reset();
      tracker.setState((new WorkflowTracker() as any).getState());
    },
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-handler-tracker.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor/workflow-handler.ts tests/extension/workflow-monitor/workflow-handler-tracker.test.ts
git commit -m "feat(workflow-monitor): wire workflow tracker into workflow handler"
```

---

### Task 6: Wire tracker into `extensions/workflow-monitor.ts` (events + persistence + widget)

**Files:**
- Modify: `extensions/workflow-monitor.ts:20-190`
- Modify: `tests/extension/workflow-monitor/extension-lifecycle.test.ts` (fake pi must support registerCommand)
- Create: `tests/extension/workflow-monitor/workflow-widget.test.ts` (lightweight widget formatting test)

**Step 1: Add a failing test that extension registers the new handlers/command**

```ts
// tests/extension/workflow-monitor/extension-lifecycle.test.ts (additions)

test("registers /workflow-next command", () => {
  const fake = createFakePi();
  workflowMonitorExtension(fake.api as any);
  expect(fake.registeredCommands).toContain("workflow-next");
});
```

Update the fake pi helper:

```ts
function createFakePi() {
  const handlers = new Map<string, Handler[]>();
  const registeredCommands: string[] = [];

  return {
    handlers,
    registeredCommands,
    api: {
      on(event: string, handler: Handler) {
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
      },
      registerTool() {},
      registerCommand(name: string) {
        registeredCommands.push(name);
      },
      appendEntry() {},
    },
  };
}
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/extension/workflow-monitor/extension-lifecycle.test.ts`
Expected: FAIL — command not registered

**Step 3: Implement event wiring + persistence**

Apply the following changes in `extensions/workflow-monitor.ts`:

1) **On session events**, reconstruct workflow tracker state from branch and refresh widget.

2) **On input events**, pass the raw input text to `handler.handleInputText()` (skip when `event.source === "extension"`). If it changes state, append a custom entry:

```ts
pi.appendEntry("workflow_tracker_state", handler.getWorkflowState());
```

3) **On tool_call**, detect:
- `write/edit` paths: `handler.handleFileWritten(path)`
- `plan_tracker` tool calls: `handler.handlePlanTrackerToolCall(event.input)`

When any of these change tracker state, append entry as above.

4) **Widget rendering**: extend `updateWidget()` (currently around `extensions/workflow-monitor.ts:129`) to include a workflow phase strip *before* the existing `TDD:` and `Debug:` segments.

Minimal formatting function (inline in `updateWidget` for now):

```ts
function formatPhaseStrip(state: any, theme: any): string {
  if (!state?.currentPhase) return "";

  const arrow = theme.fg("dim", " → ");
  return ["brainstorm", "plan", "execute", "verify", "review", "finish"]
    .map((p) => {
      const status = state.phases[p];
      const label = p;
      if (state.currentPhase === p) return theme.fg("accent", `[${label}]`);
      if (status === "complete") return theme.fg("success", `✓${label}`);
      if (status === "skipped") return theme.fg("dim", `–${label}`);
      return theme.fg("dim", label);
    })
    .join(arrow);
}
```

Then, in the widget `parts` array, push it first when non-empty.

**Step 4: Run the whole workflow-monitor test suite**

Run: `npx vitest run tests/extension/workflow-monitor`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/extension-lifecycle.test.ts
git commit -m "feat(workflow-monitor): show workflow phase strip and persist state"
```

---

### Task 7: Add boundary prompting at `agent_end` (prompt once, do not nag)

**Files:**
- Modify: `extensions/workflow-monitor.ts:40-210`
- Modify: `extensions/workflow-monitor/workflow-handler.ts` (expose enough signals)
- Test: `tests/extension/workflow-monitor/transition-prompt.test.ts`

**Step 1: Write failing test (prompt decision is pure function)**

To keep this testable without TUI, implement a pure helper:

```ts
// extensions/workflow-monitor/workflow-tracker.ts (new export)
export type TransitionBoundary = "design_committed" | "plan_ready" | "execution_complete" | "verification_passed" | "review_complete";
export function computeBoundaryToPrompt(state: WorkflowTrackerState): TransitionBoundary | null {
  // minimal v1 rules:
  // - if brainstorm is complete and not prompted yet → design_committed
  // - if plan is complete and not prompted yet → plan_ready
  // - if execute is complete and not prompted yet → execution_complete
  // - if verify is complete and not prompted yet → verification_passed
  // - if review is complete and not prompted yet → review_complete
  return null;
}
```

Test:

```ts
// tests/extension/workflow-monitor/transition-prompt.test.ts
import { describe, test, expect } from "vitest";
import { WorkflowTracker, computeBoundaryToPrompt } from "../../../extensions/workflow-monitor/workflow-tracker";

describe("boundary prompting", () => {
  test("prompts after brainstorm complete", () => {
    const t = new WorkflowTracker();
    t.advanceTo("brainstorm");
    t.completeCurrent();
    const boundary = computeBoundaryToPrompt(t.getState());
    expect(boundary).toBe("design_committed");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/extension/workflow-monitor/transition-prompt.test.ts`
Expected: FAIL — boundary logic not implemented

**Step 3: Implement minimal boundary computation + agent_end UI**

1) Implement `computeBoundaryToPrompt()` in `workflow-tracker.ts`.
2) In `extensions/workflow-monitor.ts`, add an `agent_end` handler:
   - If `!ctx.hasUI` → return
   - Ask tracker for boundary to prompt
   - Use `ctx.ui.select(title, options)` based on `getTransitionPrompt(boundary, artifact)`
   - Record prompted via tracker/handler and persist via `pi.appendEntry`
   - For user choice:
     - **Next**: set editor text to the recommended next skill invocation (e.g. `/skill:writing-plans`)
     - **Fresh session**: set editor text to `/workflow-next <nextPhase> <artifactPath>`
     - **Skip**: set editor text to `/skill:<next-skill>` but also mark skipped in state (add `skipTo(nextPhase)` helper if needed)
     - **Discuss**: do nothing (user continues chatting)

**Step 4: Run tests**

Run: `npx vitest run tests/extension/workflow-monitor`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts extensions/workflow-monitor/workflow-tracker.ts tests/extension/workflow-monitor/transition-prompt.test.ts
git commit -m "feat(workflow-tracker): prompt once at phase boundaries"
```

---

### Task 8: Implement `/workflow-next` command (fresh session handoff with artifact reference)

**Files:**
- Modify: `extensions/workflow-monitor.ts` (register command)
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts`

**Step 1: Write failing test (command handler sets editor text)**

Use a fake ctx that tracks `newSession()` and `ui.setEditorText()` calls.

```ts
// tests/extension/workflow-monitor/workflow-next-command.test.ts
import { describe, test, expect } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

test("/workflow-next creates new session and prefills kickoff message", async () => {
  let handler: any;
  const fakePi: any = {
    on() {},
    registerTool() {},
    appendEntry() {},
    registerCommand(_name: string, opts: any) { handler = opts.handler; },
  };

  workflowMonitorExtension(fakePi);

  const calls: any[] = [];
  const ctx: any = {
    hasUI: true,
    sessionManager: { getSessionFile: () => "/tmp/session.jsonl" },
    ui: {
      setEditorText: (t: string) => calls.push(["setEditorText", t]),
      notify: () => {},
    },
    newSession: async () => ({ cancelled: false }),
  };

  await handler("plan docs/plans/2026-02-10-x-design.md", ctx);

  expect(calls[0][0]).toBe("setEditorText");
  expect(calls[0][1]).toMatch(/Continue from design: docs\/plans\/2026-02-10-x-design\.md/);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: FAIL — command not implemented

**Step 3: Implement the command (copy the pattern from handoff example)**

```ts
// extensions/workflow-monitor.ts (near top-level in default export)
pi.registerCommand("workflow-next", {
  description: "Start a fresh session for the next workflow phase (optionally referencing an artifact path)",
  handler: async (args, ctx) => {
    if (!ctx.hasUI) {
      ctx.ui.notify("workflow-next requires interactive mode", "error");
      return;
    }

    const [phase, artifact] = args.trim().split(/\s+/, 2);
    if (!phase) {
      ctx.ui.notify("Usage: /workflow-next <phase> [artifact-path]", "error");
      return;
    }

    const parentSession = ctx.sessionManager.getSessionFile();
    const res = await ctx.newSession({ parentSession });
    if (res.cancelled) return;

    const lines: string[] = [];
    if (artifact) lines.push(`Continue from artifact: ${artifact}`);

    if (phase === "plan") lines.push("Use /skill:writing-plans to create the implementation plan.");
    else if (phase === "execute") lines.push("Use /skill:executing-plans (or /skill:subagent-driven-development) to execute the plan.");
    else if (phase === "verify") lines.push("Use /skill:verification-before-completion to verify before finishing.");
    else if (phase === "review") lines.push("Use /skill:requesting-code-review to get review.");
    else if (phase === "finish") lines.push("Use /skill:finishing-a-development-branch to integrate/ship.");

    ctx.ui.setEditorText(lines.join("\n"));
    ctx.ui.notify("New session ready. Submit when ready.", "info");
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add extensions/workflow-monitor.ts tests/extension/workflow-monitor/workflow-next-command.test.ts
git commit -m "feat(workflow-next): add fresh-session handoff command"
```

---

### Task 9: Documentation + final verification

**Files:**
- Modify: `README.md` (add a short “Workflow Tracker” section)

**Step 1: Add README documentation**

Add:
- What the phase strip means (✓ complete, – skipped, [active])
- How phases are detected (skills + docs/plans artifacts + plan_tracker init)
- `/workflow-next` usage examples

**Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document workflow tracker and /workflow-next"
```

---

## Notes / Guardrails (do NOT skip)

- **Non-enforcing:** the tracker must never block tool calls or prevent progress.
- **Prompt only once:** rely on `state.prompted[phase]` to avoid nagging.
- **No content injection into new sessions:** only reference artifact *paths*.
- **Keep UI optional:** all prompt logic must short-circuit when `!ctx.hasUI`.
- **Prefer pure functions for tricky logic:** `computeBoundaryToPrompt()` should be unit-tested.

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-11-workflow-tracker-implementation.md`. Two execution options:

1. Subagent-Driven (this session) — I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Parallel Session (separate) — Open new session with executing-plans, batch execution with checkpoints

Which approach?