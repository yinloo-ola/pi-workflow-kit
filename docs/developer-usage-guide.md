# Developer Usage Guide

This guide explains how to install and use `pi-workflow-kit` as a developer building features with the Pi coding agent.

## What this package gives you

`pi-workflow-kit` combines:

- **Skills** — markdown instructions the agent can invoke with `/skill:<name>`
- **Extensions** — runtime behavior that tracks workflow state, warns about process mistakes, and adds tools such as `plan_tracker` and `subagent`

The intended workflow is:

```text
brainstorm → plan → execute → finalize
```

Inside **execute**, each task follows this lifecycle:

```text
define → approve → execute → verify → review → fix
```

## Installation

### Option 1: Install from npm

```bash
pi install npm:@tianhai/pi-workflow-kit
```

Use this if you want the published package as-is.

### Option 2: Install from the maintained git repo

```bash
pi install git:github.com/yinloo-ola/pi-workflow-kit.git
```

Use this if you want the repo version directly.

### Option 3: Install from **your own maintained repo or fork**

If you are maintaining your own repo, install from that repo directly:

```bash
pi install git:github.com/yinloo-ola/pi-workflow-kit.git
```

For a different fork/repo, use:

```bash
pi install git:github.com/<your-user>/<your-repo>.git
```

Examples:

```bash
pi install git:github.com/acme/pi-workflow-kit.git
pi install git:github.com/yinloo-ola/pi-workflow-kit.git
```

This is the best option when:
- you have customized the skills or extensions
- you want full control over updates
- you do not plan to track upstream releases closely

### Option 4: Add your repo to Pi config

Project-level `.pi/settings.json` or global `~/.pi/agent/config.json`:

```json
{
  "packages": ["git:github.com/yinloo-ola/pi-workflow-kit.git"]
}
```

If you prefer npm instead, you can still use:

```json
{
  "packages": ["npm:@tianhai/pi-workflow-kit"]
}
```

After installation, Pi will load the package from whichever source you chose. If you installed from your own repo, future updates come from **your repo**, not the upstream package.

## What activates automatically

After installation, Pi loads:

### Skills
- `brainstorming`
- `writing-plans`
- `executing-tasks`
- `test-driven-development`
- `systematic-debugging`
- `using-git-worktrees`
- `dispatching-parallel-agents`
- `receiving-code-review`

### Extensions
- **workflow-monitor**
- **plan-tracker**
- **subagent**

You do not need to enable these manually.

## Core commands and tools

### Skill invocation

Invoke skills directly in the Pi session:

```text
/skill:brainstorming
/skill:writing-plans
/skill:executing-tasks
```

### Workflow handoff

Start a fresh session for the next phase:

```text
/workflow-next brainstorm
/workflow-next plan docs/plans/2026-04-09-feature-design.md
/workflow-next execute docs/plans/2026-04-09-feature-implementation.md
/workflow-next finalize docs/plans/2026-04-09-feature-implementation.md
```

### Plan tracking

Track execution progress:

```ts
plan_tracker({
  action: "init",
  tasks: [
    { name: "Implement endpoint", type: "code" },
    { name: "Update README", type: "non-code" },
  ],
})

plan_tracker({ action: "update", index: 0, phase: "define" })
plan_tracker({ action: "update", index: 0, phase: "approve" })
plan_tracker({ action: "update", index: 0, phase: "execute", attempts: 1 })
plan_tracker({ action: "update", index: 0, phase: "verify" })
plan_tracker({ action: "update", index: 0, phase: "review" })
plan_tracker({ action: "update", index: 0, status: "complete" })
```

### Subagent dispatch

Use bundled agents through the `subagent` tool.

Bundled agents require:

```ts
agentScope: "both"
```

Example:

```ts
subagent({
  agent: "code-reviewer",
  task: "Review Task 2 implementation against the plan and tests",
  agentScope: "both",
})
```

## Recommended developer workflow

## 1. Brainstorm

Use this when you have an idea, request, or rough spec.

```text
/skill:brainstorming
```

Expected outcome:
- a clarified design
- a design artifact in `docs/plans/`
- optional worktree/branch setup

Good time to use:
- `/skill:using-git-worktrees` for larger changes or isolated work

## 2. Write the implementation plan

Use:

```text
/skill:writing-plans
```

The implementation plan should be saved under:

```text
docs/plans/YYYY-MM-DD-<feature>-implementation.md
```

### Plan authoring rules

Each task should include:
- a task title
- `**Type:** code` or `**Type:** non-code`
- exact file paths
- concrete implementation steps
- for code tasks: TDD steps and test commands
- for non-code tasks: explicit acceptance criteria

### Example task shapes

Code task:

```md
### Task 1: Add retry logic

**Type:** code
**TDD scenario:** New feature — full TDD cycle

**Files:**
- Modify: `src/retry.ts`
- Test: `tests/retry.test.ts`
```

Non-code task:

```md
### Task 2: Update docs

**Type:** non-code

**Files:**
- Modify: `README.md`
- Modify: `docs/architecture.md`

**Acceptance criteria:**
- README describes the new API accurately
- Architecture doc reflects the new flow
- Terminology matches the codebase
```

## 3. Execute the plan

Use:

```text
/skill:executing-tasks
```

At the start of execution, the agent should:
1. read the plan
2. extract tasks and task types
3. initialize `plan_tracker`

Example:

```ts
plan_tracker({
  action: "init",
  tasks: [
    { name: "Add retry logic", type: "code" },
    { name: "Update docs", type: "non-code" },
  ],
})
```

## Per-task lifecycle during execution

For each task:

1. **define**
   - code task: define/write tests
   - non-code task: define/refine acceptance criteria
2. **approve**
   - human approves tests or acceptance criteria
3. **execute**
   - implement the task
   - bounded retries
4. **verify**
   - rerun checks and report pass/fail
5. **review**
   - subagent review + human sign-off
6. **fix**
   - address review issues and re-enter verify/review

### Important behavior

- **Code tasks** follow TDD guidance
- **Non-code tasks** use acceptance criteria instead of TDD
- The plan tracker widget shows task progress in the TUI
- When all tasks reach a terminal state, the workflow can move into **finalize**

## 4. Finalize

Use:

```text
/skill:executing-tasks
```

or start a fresh finalize session with:

```text
/workflow-next finalize docs/plans/2026-04-09-feature-implementation.md
```

Finalize typically includes:
- holistic review
- PR preparation
- doc updates
- archive planning docs
- cleanup of worktree/branch if needed

## What the extensions do while you work

### Workflow Monitor

The workflow monitor runs in the background and helps keep the agent aligned.

It can:
- track the current global phase
- prompt at workflow boundaries
- warn when source is written before tests
- warn when fixing starts without investigation after failures
- warn on commit/push/PR creation without recent passing verification
- remind the agent to confirm branch/worktree before the first write

### Task Tracker

The plan tracker stores execution state outside the prompt and shows it in the TUI.

It tracks:
- task name
- task type
- task status
- task phase
- execute attempts
- fix attempts

### Subagent

The subagent extension lets the main agent delegate focused work to isolated helper agents.

Bundled agents include:
- `implementer`
- `worker`
- `code-reviewer`
- `spec-reviewer`

## Practical examples

### Example: Start a new feature

```text
/skill:brainstorming
```

Then:

```text
/skill:writing-plans
```

Then:

```text
/skill:executing-tasks
```

### Example: Ask for code review during execution

```ts
subagent({
  agent: "code-reviewer",
  task: "Review Task 3 implementation for correctness, edge cases, and test coverage",
  agentScope: "both",
})
```

### Example: Move to a fresh execute session

```text
/workflow-next execute docs/plans/2026-04-09-my-feature-implementation.md
```

### Example: Move to a fresh finalize session

```text
/workflow-next finalize docs/plans/2026-04-09-my-feature-implementation.md
```

## Publishing your maintained package

If you publish the maintained fork to npm, the package name is:

```text
@tianhai/pi-workflow-kit
```

Typical release flow:

```bash
npm run check
npm version patch
git push origin main --follow-tags
```

Then users install with:

```bash
pi install npm:@tianhai/pi-workflow-kit
```

## Best practices for developers

- Start with `brainstorming` for anything non-trivial
- Use `writing-plans` before touching code for multi-step work
- Put all plan artifacts under `docs/plans/`
- Always include task `Type:` in implementation plans
- Use `code` for implementation/test work and `non-code` for docs/process tasks
- Let `plan_tracker` reflect the real lifecycle instead of keeping state only in chat
- Use `subagent(..., agentScope: "both")` when you want bundled agents
- Treat workflow monitor warnings as signals to correct process, not as noise
- Use `/workflow-next` when handing off between large phases or sessions

## Common mistakes to avoid

- Starting execution without an implementation plan
- Initializing `plan_tracker` with task names only when your plan contains non-code tasks
- Forgetting `agentScope: "both"` for bundled subagents
- Treating verify/review as global phases instead of per-task steps inside execute
- Writing files outside `docs/plans/` during brainstorm/plan unless you intentionally advance phases
- Claiming work is done without running verification checks

## Migration note

If you previously installed `@yinlootan/pi-superpowers-plus`, replace it with:

```json
{
  "packages": ["npm:@tianhai/pi-workflow-kit"]
}
```

The rebrand keeps runtime names stable, so existing usage still centers on:
- `plan_tracker`
- `workflow_reference`
- `/workflow-next`
- `/workflow-reset`
- the existing skill names

## Where to look next

- `README.md`
- `docs/oversight-model.md`
- `docs/workflow-phases.md`
- `skills/writing-plans/SKILL.md`
- `skills/executing-tasks/SKILL.md`
