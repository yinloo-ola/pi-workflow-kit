# /workflow-next Autocomplete Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-tasks skill to implement this plan task-by-task.

**Goal:** Add argument autocomplete to `/workflow-next` for workflow phases and workflow-specific plan artifacts without changing command execution, validation, or session creation behavior.

**Architecture:** Add a small stateless helper module under `extensions/workflow-monitor/` that parses the raw argument prefix and returns `AutocompleteItem[] | null` from pi's `getArgumentCompletions` hook. Keep `extensions/workflow-monitor.ts` as the command registration entry point and leave the existing `/workflow-next` handler logic unchanged so autocomplete stays UX-only.

**Tech Stack:** TypeScript, Node.js `fs`/`path`, pi extension command API, Vitest

---

Reference design artifact: `docs/plans/2026-04-09-workflow-next-autocomplete-design.md`

### Task 1: Add phase autocomplete for `/workflow-next`

**Type:** code
**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `extensions/workflow-monitor/workflow-next-completions.ts`
- Modify: `extensions/workflow-monitor.ts:1-38`
- Modify: `extensions/workflow-monitor.ts:813-851`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts:1-102`

**Step 1: Write the failing test**

```ts
function getWorkflowNextCommand() {
  let command: any;
  const fakePi: any = {
    on() {},
    registerTool() {},
    appendEntry() {},
    registerCommand(name: string, opts: any) {
      if (name === "workflow-next") command = opts;
    },
  };

  workflowMonitorExtension(fakePi);
  expect(command).toBeTruthy();
  return command;
}

test("returns all workflow phases when no args are typed", async () => {
  const command = getWorkflowNextCommand();
  const items = await command.getArgumentCompletions("");
  expect(items).toEqual([
    { value: "brainstorm", label: "brainstorm" },
    { value: "plan", label: "plan" },
    { value: "execute", label: "execute" },
    { value: "finalize", label: "finalize" },
  ]);
});

test("keeps suggesting phases until the first arg is an exact valid phase", async () => {
  const command = getWorkflowNextCommand();
  const items = await command.getArgumentCompletions("pla docs/plans/");
  expect(items).toEqual([{ value: "plan", label: "plan" }]);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts -t "returns all workflow phases when no args are typed"`
Expected: FAIL with `command.getArgumentCompletions is not a function` or an equivalent assertion failure because `/workflow-next` does not expose completions yet.

**Step 3: Write minimal implementation**

```ts
// extensions/workflow-monitor/workflow-next-completions.ts
import type { AutocompleteItem } from "@mariozechner/pi-tui";

const WORKFLOW_NEXT_PHASES = ["brainstorm", "plan", "execute", "finalize"] as const;

export async function getWorkflowNextCompletions(prefix: string): Promise<AutocompleteItem[] | null> {
  const normalized = prefix.replace(/^\s+/, "");
  const [firstToken = ""] = normalized.split(/\s+/, 1);
  const completingFirstArg = normalized.length === 0 || !/\s/.test(normalized);

  if (completingFirstArg || !WORKFLOW_NEXT_PHASES.includes(firstToken as (typeof WORKFLOW_NEXT_PHASES)[number])) {
    const phasePrefix = completingFirstArg ? normalized : firstToken;
    const items = WORKFLOW_NEXT_PHASES.filter((phase) => phase.startsWith(phasePrefix)).map((phase) => ({
      value: phase,
      label: phase,
    }));
    return items.length > 0 ? items : null;
  }

  return null;
}

// extensions/workflow-monitor.ts
pi.registerCommand("workflow-next", {
  description: "Start a fresh session for the next workflow phase (optionally referencing an artifact path)",
  getArgumentCompletions: getWorkflowNextCompletions,
  async handler(args, ctx) {
    // existing handler body stays unchanged
  },
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts -t "workflow phases"`
Expected: PASS for the new phase-autocomplete assertions and PASS for the existing kickoff/validation tests.

**Step 5: Commit**

```bash
git add tests/extension/workflow-monitor/workflow-next-command.test.ts extensions/workflow-monitor.ts extensions/workflow-monitor/workflow-next-completions.ts
git commit -m "feat: add workflow-next phase autocomplete"
```

### Task 2: Add `plan` artifact suggestions for design docs

**Type:** code
**TDD scenario:** New feature — full TDD cycle

**Files:**
- Modify: `extensions/workflow-monitor/workflow-next-completions.ts`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts:1-102`

**Step 1: Write the failing test**

```ts
import * as fs from "node:fs";
import * as path from "node:path";
import { withTempCwd } from "./test-helpers";

test("suggests only design artifacts for plan phase", async () => {
  const tempDir = withTempCwd();
  const plansDir = path.join(tempDir, "docs", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-implementation.md"), "");

  const command = getWorkflowNextCommand();
  const items = await command.getArgumentCompletions("plan ");

  expect(items).toEqual([
    {
      value: "docs/plans/2026-04-09-alpha-design.md",
      label: "docs/plans/2026-04-09-alpha-design.md",
    },
  ]);
});

test("filters plan artifact suggestions by typed prefix", async () => {
  const tempDir = withTempCwd();
  const plansDir = path.join(tempDir, "docs", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
  fs.writeFileSync(path.join(plansDir, "2026-04-09-beta-design.md"), "");

  const command = getWorkflowNextCommand();
  const items = await command.getArgumentCompletions("plan docs/plans/2026-04-09-al");

  expect(items).toEqual([
    {
      value: "docs/plans/2026-04-09-alpha-design.md",
      label: "docs/plans/2026-04-09-alpha-design.md",
    },
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts -t "design artifacts for plan phase"`
Expected: FAIL because phase completion works, but second-argument artifact completion still returns `null`.

**Step 3: Write minimal implementation**

```ts
import * as fs from "node:fs";
import * as path from "node:path";
import type { AutocompleteItem } from "@mariozechner/pi-tui";

function listPlanArtifacts(suffix: string, typedPrefix: string): AutocompleteItem[] | null {
  const plansDir = path.join(process.cwd(), "docs", "plans");
  if (!fs.existsSync(plansDir)) return null;

  const items = fs
    .readdirSync(plansDir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join("docs", "plans", name))
    .filter((relPath) => relPath.startsWith(typedPrefix))
    .map((relPath) => ({ value: relPath, label: relPath }));

  return items.length > 0 ? items : null;
}

export async function getWorkflowNextCompletions(prefix: string): Promise<AutocompleteItem[] | null> {
  // keep task-1 phase behavior
  const match = prefix.replace(/^\s+/, "").match(/^(\S+)(?:\s+(.*))?$/);
  const phase = match?.[1] ?? "";
  const artifactPrefix = match?.[2] ?? "";
  const startingSecondArg = /\s$/.test(prefix) || artifactPrefix.length > 0;

  if (phase === "plan" && startingSecondArg) {
    return listPlanArtifacts("-design.md", artifactPrefix);
  }

  return previousPhaseLogic(prefix);
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts -t "plan"`
Expected: PASS for the new `plan` artifact tests and PASS for the phase completion tests from Task 1.

**Step 5: Commit**

```bash
git add tests/extension/workflow-monitor/workflow-next-command.test.ts extensions/workflow-monitor/workflow-next-completions.ts
git commit -m "feat: add workflow-next plan artifact autocomplete"
```

### Task 3: Complete execute/finalize artifact mapping and quiet failure behavior

**Type:** code
**TDD scenario:** New feature — full TDD cycle

**Files:**
- Modify: `extensions/workflow-monitor/workflow-next-completions.ts`
- Test: `tests/extension/workflow-monitor/workflow-next-command.test.ts:1-102`

**Step 1: Write the failing test**

```ts
test("suggests only implementation artifacts for execute and finalize", async () => {
  const tempDir = withTempCwd();
  const plansDir = path.join(tempDir, "docs", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-implementation.md"), "");

  const command = getWorkflowNextCommand();

  await expect(command.getArgumentCompletions("execute ")).resolves.toEqual([
    {
      value: "docs/plans/2026-04-09-alpha-implementation.md",
      label: "docs/plans/2026-04-09-alpha-implementation.md",
    },
  ]);

  await expect(command.getArgumentCompletions("finalize ")).resolves.toEqual([
    {
      value: "docs/plans/2026-04-09-alpha-implementation.md",
      label: "docs/plans/2026-04-09-alpha-implementation.md",
    },
  ]);
});

test("returns null for brainstorm artifact completion", async () => {
  const command = getWorkflowNextCommand();
  await expect(command.getArgumentCompletions("brainstorm ")).resolves.toBeNull();
});

test("returns null when docs/plans is missing or has no matching files", async () => {
  withTempCwd();
  const command = getWorkflowNextCommand();
  await expect(command.getArgumentCompletions("execute ")).resolves.toBeNull();

  const plansDir = path.join(process.cwd(), "docs", "plans");
  fs.mkdirSync(plansDir, { recursive: true });
  fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
  await expect(command.getArgumentCompletions("execute ")).resolves.toBeNull();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts -t "implementation artifacts for execute and finalize"`
Expected: FAIL because only `plan` artifact completion exists and `execute`/`finalize` still return `null`.

**Step 3: Write minimal implementation**

```ts
const ARTIFACT_SUFFIX_BY_PHASE = {
  brainstorm: null,
  plan: "-design.md",
  execute: "-implementation.md",
  finalize: "-implementation.md",
} as const;

function listArtifactsForPhase(phase: keyof typeof ARTIFACT_SUFFIX_BY_PHASE, typedPrefix: string) {
  const suffix = ARTIFACT_SUFFIX_BY_PHASE[phase];
  if (!suffix) return null;

  const plansDir = path.join(process.cwd(), "docs", "plans");
  if (!fs.existsSync(plansDir)) return null;

  try {
    const items = fs
      .readdirSync(plansDir)
      .filter((name) => name.endsWith(suffix))
      .map((name) => path.join("docs", "plans", name))
      .filter((relPath) => relPath.startsWith(typedPrefix))
      .map((relPath) => ({ value: relPath, label: relPath }));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export async function getWorkflowNextCompletions(prefix: string): Promise<AutocompleteItem[] | null> {
  // keep task-1 phase completion logic for empty / partial / invalid first tokens
  // switch to artifact mode only after an exact valid phase plus second-arg context
  if (phaseIsExactlyValid && startingSecondArg) {
    return listArtifactsForPhase(phase, artifactPrefix);
  }

  return phaseSuggestionsOrNull;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/extension/workflow-monitor/workflow-next-command.test.ts`
Expected: PASS for all `/workflow-next` tests, including kickoff behavior, invalid-phase validation, phase autocomplete, artifact autocomplete, and quiet-null cases.

Then run: `npm test`
Expected: PASS across the full Vitest suite with no regressions in the workflow monitor extension.

**Step 5: Commit**

```bash
git add tests/extension/workflow-monitor/workflow-next-command.test.ts extensions/workflow-monitor/workflow-next-completions.ts
git commit -m "feat: finish workflow-next artifact autocomplete"
```
