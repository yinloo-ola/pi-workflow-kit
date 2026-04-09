# pi-workflow-kit

![pi-workflow-kit banner](banner-plus.jpg)

Structured workflow skills and active enforcement extensions for [pi](https://github.com/badlogic/pi-mono).

Your coding agent doesn't just know the rules - it follows them. Skills teach the agent *what* to do (brainstorm before building, write tests before code, verify before claiming done). Extensions reinforce that workflow in real time with warnings, prompts, state tracking, and shipping-time verification checks.

## What You Get When You Install This

**8 workflow skills** that guide the agent through a structured development process - from brainstorming ideas through shipping code.

**3 extensions** that run silently in the background:
- **Workflow Monitor** — warns on TDD violations, tracks debug cycles, gates commits on verification, tracks workflow phase, and serves reference content on demand.
- **Subagent** — registers a `subagent` tool for dispatching implementation and review work to isolated subprocess agents, with bundled agent definitions and structured results.
- **Task Tracker** — tracks per-task progress, type, phase, and attempt counts with a TUI widget.

**After installation**:
- Any time the agent writes a source file without a failing test, it gets a warning injected into the tool result.
- Any time it tries to `git commit` / `git push` / `gh pr create` without passing tests, it gets a verification warning and, in interactive finalize flows, may be gated for confirmation.
- During **Brainstorm**/**Plan**, writes outside `docs/plans/` trigger a process warning and may escalate to an interactive stop.
- On the first tool output of a session (inside a git repo), the agent is shown the **current git branch (or detached HEAD short SHA)**.
- On the first write/edit of a session (inside a git repo), the agent is warned to **confirm it's on the correct branch/worktree** before continuing.

The agent sees these warnings as part of its normal tool output - no configuration needed.

More detail:
- [`docs/oversight-model.md`](docs/oversight-model.md) — how skills + runtime enforcement work together, and how warnings escalate
- [`docs/workflow-phases.md`](docs/workflow-phases.md) — what each workflow phase permits (especially thinking-phase write boundaries)

## Install

### From npm

```bash
pi install npm:@tianhai/pi-workflow-kit
```

### From a git repository

```bash
pi install git:github.com/yinloo-ola/pi-workflow-kit.git
```

### From **your own maintained repo or fork**

If you want to maintain your own version of this package, install directly from your repository instead of the upstream one. For this repo, the maintained git install target is:

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

You can also point Pi config at your repo instead of the npm package.

Project-level `.pi/settings.json` or global `~/.pi/agent/config.json`:

```json
{
  "packages": ["git:github.com/yinloo-ola/pi-workflow-kit.git"]
}
```

Use this when:
- you maintain custom skills/extensions in your own repo
- you do not want to depend on upstream releases
- you want your team to install the exact version you control

No configuration required after install. Skills and extensions activate automatically.

## Support

- Questions / support: https://github.com/yinloo-ola/pi-workflow-kit/discussions
- Bugs: https://github.com/yinloo-ola/pi-workflow-kit/issues/new/choose
- Feature requests: https://github.com/yinloo-ola/pi-workflow-kit/issues/new/choose
- Roadmap: [`ROADMAP.md`](ROADMAP.md)
- Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Upgrading from `pi-superpowers`

If you're currently using [`pi-superpowers`](https://github.com/coctostan/pi-superpowers), `@tianhai/pi-workflow-kit` is intended as a drop-in upgrade: you keep the same skill names and workflow, but you also get **active, runtime enforcement** via extensions.

### What stays the same
- The same core workflow skills (e.g. `/skill:brainstorming`, `/skill:writing-plans`, `/skill:executing-tasks`, etc.)
- The same "structured workflow" idea and phase order

### What's new in `pi-workflow-kit`
- **Workflow Monitor extension** that observes tool calls/results and injects warnings directly into output
- **TDD discipline warnings** when writing source code without a failing test (advisory, not blocking)
- **Three-scenario TDD model** — new feature (full TDD), modifying tested code (run existing tests), trivial change (judgment) — applied consistently across skills, agent profiles, and plan templates
- **Debug enforcement** escalation after failing tests activate investigation-first mode
- **Verification gating** for `git commit` / `git push` / `gh pr create` until passing tests are run (suppressed during active plan execution)
- **Workflow tracking + boundary prompts** (and `/workflow-next` handoff)
- **Branch safety reminders** (first tool result shows current branch/SHA; first write/edit warns to confirm branch/worktree)
- **Finalize reminder prefill** (docs + learnings)
- **Task Tracker tool** (`plan_tracker`) for typed task lists + TUI progress

### Migration
Replace `pi-superpowers` with `@tianhai/pi-workflow-kit` in your config:

```json
{
  "packages": ["npm:@tianhai/pi-workflow-kit"]
}
```

Notes:
- If you keep both packages enabled, you may get duplicate/competing skill guidance.
- `pi-workflow-kit` is more "opinionated" at runtime: it will inject warnings into tool output and may gate shipping commands until verification has passed.

### How the skills differ (leveraging pi)

`pi-workflow-kit` uses pi's runtime capabilities alongside skill content:
- **Extensions** enforce behavior *while you work* (TDD/Debug/Verification monitors, branch safety notices) — runtime warnings complement inline skill guidance.
- **Three-scenario TDD** — skills, agent profiles, and plan templates all use the same model: new feature (full TDD), modifying tested code (run existing tests), trivial change (use judgment). Runtime warnings are advisory nudges, not hard blocks.
- The **TUI** shows state (workflow/TDD) and prompts at boundaries.
- Tools like **`plan_tracker`** store execution state outside the prompt.
- **`workflow_reference`** provides extended detail on demand, keeping skill files focused while making deep guidance available when the agent needs it.

The workflow has been simplified to **4 phases** with **8 skills**. The `executing-tasks` skill replaces 5 separate execution-phase skills with a unified per-task lifecycle.

| Skill | Size (KB) | Note |
|---|---:|---|
| `brainstorming` | 2.9 | Unchanged |
| `dispatching-parallel-agents` | 6.1 | Unchanged |
| `executing-tasks` | 6.7 | **New** — replaces 5 skills |
| `receiving-code-review` | 5.8 | Unchanged |
| `systematic-debugging` | 7.2 | Unchanged |
| `test-driven-development` | 8.1 | Unchanged |
| `using-git-worktrees` | 6.1 | Unchanged |
| `writing-plans` | 3.8 | Updated — added task type + acceptance criteria |

## The Workflow

The skills guide the agent through a consistent development cycle:

```
Brainstorm → Plan → Execute → Finalize
```

| Phase | Skill | What Happens |
|-------|-------|--------------|
| **Brainstorm** | `/skill:brainstorming` | Refines your idea into a design document via Socratic dialogue |
| **Plan** | `/skill:writing-plans` | Breaks the design into bite-sized TDD tasks with exact file paths and code |
| **Execute** | `/skill:executing-tasks` | Per-task lifecycle: define → approve → execute → verify → review → fix |
| **Finalize** | `/skill:executing-tasks` | PR, archive planning docs, update repo docs, clean up |

The **workflow tracker** shows progress in the TUI status bar as the agent moves through phases:

```
-brainstorm → ✓plan → [execute] → finalize
```

Phases are detected automatically from skill invocations, artifact writes under `docs/plans/`, `plan_tracker` initialization, and completion of all tracked tasks. At phase boundaries, the agent is prompted (once) with options to continue, start a fresh session, skip, or discuss.

### Supporting Skills

These skills are used within the main workflow as needed:

| Skill | When It's Used |
|-------|---------------|
| `/skill:test-driven-development` | During execution - enforced by the TDD monitor |
| `/skill:systematic-debugging` | When tests fail repeatedly - enforced by the debug monitor |
| `/skill:using-git-worktrees` | Before execution - creates isolated branch workspace |
| `/skill:dispatching-parallel-agents` | When multiple independent problems need solving concurrently |
| `/skill:receiving-code-review` | When acting on review feedback - prevents blind agreement |

## Extensions

### Workflow Monitor

Runs in the background observing every tool call and result. Zero configuration.

#### TDD Enforcement

Detects when the agent writes production code without a failing test and injects a warning into the tool result. The warning is advisory — a nudge to consider whether a test is needed, not a hard block. The agent's skill instructions and agent profiles include three-scenario TDD guidance (new feature → full TDD, modifying tested code → run existing tests, trivial change → use judgment).

**Tracks the TDD cycle:** RED → GREEN → REFACTOR → idle. Resets on `git commit`.

**TUI widget** shows the current phase, color-coded:
```
TDD: RED          (red)
TDD: GREEN        (green)
TDD: REFACTOR     (accent)
```

#### Debug Enforcement

Activates after a **non-TDD failing test run** and switches the agent into investigation-first mode. When active:
- Warns if the agent writes a fix without reading code first (investigation required)
- Counts fix attempts and escalates warnings at 3+
- Resets on test pass or commit

#### Verification Gating

Warns on `git commit`, `git push`, and `gh pr create` when the agent hasn't run passing tests. Requires a fresh passing test run before shipping. Automatically clears after successful verification. During active plan execution, verification prompts are suppressed to avoid disrupting flow.

#### Branch Safety (informational)

Inside a git repo, the workflow monitor also tries to prevent "oops I just edited main" mistakes:
- On the **first tool result** of a session, it injects `📌 Current branch: <branch-or-sha>`.
- On the **first write/edit** of a session, it injects a warning reminding the agent to confirm the branch/worktree with the user.

Outside a git repo, it stays silent.

#### Workflow Tracker

Tracks which workflow phase the agent is in and shows a phase strip in the TUI widget. Detection signals:
- Skill invocations (`/skill:brainstorming`, `/skill:writing-plans`, etc.)
- Artifact writes under `docs/plans/` (`*-design.md` → brainstorm, `*-implementation.md` → plan)
- `plan_tracker` init calls → execute phase
- all tracked tasks reaching a terminal state (`complete` or `blocked`) → execution-complete boundary
- accepting the execution-complete handoff → finalize phase

At phase boundaries, prompts the agent once (non-enforcing) with options:
1. **Next step** - continue in the current session
2. **Fresh session** - hand off to a new session via `/workflow-next`
3. **Skip** - skip the next phase
4. **Discuss** - keep chatting

When transitioning into **finalize**, the monitor pre-fills the editor with a reminder to consider documentation updates and to capture learnings before merging/shipping.

The `/workflow-next` command starts a new session with artifact context:
```
/workflow-next plan docs/plans/2026-02-10-my-feature-design.md
/workflow-next execute docs/plans/2026-02-11-my-feature-implementation.md
/workflow-next finalize
```

Valid phases: `brainstorm`, `plan`, `execute`, `finalize`.

#### Reference Tool

Serves detailed guidance on demand, keeping skill files lean while making reference content available when the agent needs it:

```
workflow_reference({ topic: "tdd-rationalizations" })    - Why order matters, excuse table
workflow_reference({ topic: "tdd-examples" })             - Good/bad code examples, bug fix walkthrough
workflow_reference({ topic: "tdd-when-stuck" })           - Blocker solutions, verification checklist
workflow_reference({ topic: "tdd-anti-patterns" })        - Mock pitfalls, test-only methods
workflow_reference({ topic: "debug-rationalizations" })   - Why investigation-first matters
workflow_reference({ topic: "debug-tracing" })            - Root cause tracing technique
workflow_reference({ topic: "debug-defense-in-depth" })   - Multi-layer validation after fix
workflow_reference({ topic: "debug-condition-waiting" })  - Replace timeouts with conditions
```

### Task Tracker

The `plan_tracker` tool stores task state in the session and shows progress in the TUI:

```
Tasks: ✓✓→○○ (2/5)  Update docs 📋 — verify
```

```
plan_tracker({
  action: "init",
  tasks: [
    { name: "Task 1: Setup", type: "code" },
    { name: "Task 2: Docs", type: "non-code" },
  ],
})
plan_tracker({ action: "update", index: 0, status: "complete" })
plan_tracker({ action: "update", index: 1, phase: "execute", attempts: 1 })
plan_tracker({ action: "update", index: 1, phase: "fix", attempts: 1 })
plan_tracker({ action: "status" })
plan_tracker({ action: "clear" })
```

## How Skills and Extensions Work Together

Skills are markdown files the agent reads to learn *what* to do. Extensions are TypeScript modules that *enforce* the discipline in real time.

| Agent Behavior | Skill (teaches) | Extension (enforces) |
|---|---|---|
| Write test before code | `test-driven-development` (three-scenario) | TDD monitor warns on violation (advisory) |
| Investigate before fixing | `systematic-debugging` | Debug monitor warns on fix-without-investigation |
| Follow per-task lifecycle | `executing-tasks` | Plan tracker tracks per-task phase and attempts |
| Follow workflow phases | All skills cross-reference each other | Workflow tracker detects phases, prompts at boundaries |
The orchestrating agent's enforcement is advisory (warnings injected into tool results).

## Subagent Dispatch

A bundled `subagent` tool lets the orchestrating agent spawn isolated subprocess agents for implementation and review tasks. No external dependencies required.

### Bundled Agents

| Agent | Purpose | Tools | Extensions |
|-------|---------|-------|------------|
| `implementer` | Strict TDD implementation | read, write, edit, bash, plan_tracker, workflow_reference | workflow-monitor, plan-tracker |
| `worker` | General-purpose task execution | read, write, edit, bash, plan_tracker, workflow_reference | workflow-monitor, plan-tracker |
| `code-reviewer` | Production readiness review | read, bash, find, grep, ls | — |
| `spec-reviewer` | Plan/spec compliance check | read, bash, find, grep, ls | — |

Agent definitions live in `agents/*.md` and use YAML frontmatter to declare tools, model, extensions, and a system prompt body.

### Single Agent

```ts
subagent({
  agent: "implementer",
  task: "Implement the retry logic per docs/plans/retry-plan.md Task 3",
  agentScope: "both",
})
```

### Parallel Tasks

```ts
subagent({
  tasks: [
    { agent: "worker", task: "Fix failing test in auth.test.ts" },
    { agent: "worker", task: "Fix failing test in cache.test.ts" },
  ],
})
```

### Structured Results

Single-agent results include:
- `filesChanged` — list of files written/edited
- `testsRan` — whether any test commands were executed
- `status` — `"completed"` or `"failed"`

### Custom Agents

Add `.md` files to a `.pi/agents/` directory in your project. They override bundled agents of the same name when `agentScope` includes project agents. Frontmatter fields:

```yaml
---
name: my-agent
description: What this agent does
tools: read, write, edit, bash
model: claude-sonnet-4-5
extensions: ../extensions/my-guard.ts
---

System prompt body here.
```

## Compared to Superpowers

Based on [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent, ported to pi as [pi-superpowers](https://github.com/coctostan/pi-superpowers), then extended with active enforcement.

| | [Superpowers](https://github.com/obra/superpowers) | [pi-superpowers](https://github.com/coctostan/pi-superpowers) | **pi-workflow-kit** |
|---|---|---|---|
| **Platform** | Claude Code | pi | pi |
| **Skills** | 8 workflow skills | Same 12 skills (pi port) → now 8 skills (simplified workflow) | **8 skills** (simplified: 4-phase workflow with unified executing-tasks) |
| **TDD enforcement** | Skill tells agent the rules | Skill tells agent the rules | Extension *watches* and injects warnings |
| **TDD widget** | — | — | TUI: RED → GREEN → REFACTOR |
| **Debug enforcement** | Manual discipline | Manual discipline | Extension escalates after repeated failures |
| **Verification gating** | — | — | Warns and gates commit/push/PR flows until tests pass |
| **Workflow tracking** | — | — | Phase strip, boundary prompts, `/workflow-next` |
| **Subagent dispatch** | — | — | Bundled `subagent` tool + 4 agent definitions |
| **TDD in subagents** | — | — | Three-scenario TDD instructions in agent profiles + prompt templates + runtime warnings |
| **Structured results** | — | — | filesChanged, testsRan per agent |
| **Reference content** | Everything in SKILL.md | Everything in SKILL.md | Inline guidance + on-demand `workflow_reference` tool for extended detail |
| **Task tracker** | — | — | `plan_tracker` tool with TUI progress widget |

## Architecture

```
pi-workflow-kit/
├── agents/                            # Bundled agent definitions + shared config
│   ├── implementer.md                 # Strict TDD implementation agent
│   ├── worker.md                      # General-purpose task agent
│   ├── code-reviewer.md               # Production readiness reviewer
│   ├── spec-reviewer.md               # Plan/spec compliance reviewer
│   └── config.ts                      # Shared bundled-agent defaults
├── docs/                              # Repo documentation referenced by README
├── extensions/
│   ├── lib/
│   │   └── logging.ts                 # File-based diagnostic logger
│   ├── plan-tracker.ts                # Task tracking tool + TUI widget
│   ├── workflow-monitor.ts            # Extension entry point (event wiring)
│   ├── workflow-monitor/
│   │   ├── tdd-monitor.ts             # TDD phase state machine
│   │   ├── debug-monitor.ts           # Debug mode escalation
│   │   ├── verification-monitor.ts    # Commit/push/PR checks
│   │   ├── workflow-tracker.ts        # Workflow phase tracking + skill resolution
│   │   ├── workflow-transitions.ts    # Phase boundary prompt definitions
│   │   ├── workflow-handler.ts        # Testable core logic (combines monitors)
│   │   ├── heuristics.ts              # File classification (test vs source)
│   │   ├── test-runner.ts             # Test command/result detection
│   │   ├── investigation.ts           # Investigation signal detection
│   │   ├── git.ts                     # Git branch/SHA detection (branch safety)
│   │   ├── warnings.ts                # Violation warning content
│   │   ├── skip-confirmation.ts       # Phase-skip confirmation logic
│   │   └── reference-tool.ts          # On-demand reference loading
│   └── subagent/
│       ├── index.ts                   # Subagent tool registration + execution
│       ├── agents.ts                  # Agent discovery + frontmatter parsing
│       ├── concurrency.ts             # Parallelism limits
│       ├── env.ts                     # Subprocess environment shaping
│       ├── lifecycle.ts               # Child-process cleanup tracking
│       └── timeout.ts                 # Timeout resolution
├── skills/                            # 8 workflow skills
│   ├── brainstorming/
│   ├── writing-plans/
│   ├── executing-tasks/
│   ├── test-driven-development/
│   ├── systematic-debugging/
│   ├── receiving-code-review/
│   ├── dispatching-parallel-agents/
│   └── using-git-worktrees/
└── tests/                             # 434 tests across 42 files
```

## Development

```bash
npm test                    # Run all tests
npx vitest run tests/extension/workflow-monitor/tdd-monitor.test.ts   # Run one file
```

## Publishing releases

Package name:

```text
@tianhai/pi-workflow-kit
```

Publish the rebranded package as:

```bash
npm publish --access public
```

Typical release flow:

```bash
npm run check
npm version patch
git push origin main --follow-tags
```

### Release checklist

- [ ] `package.json` has the correct name: `@tianhai/pi-workflow-kit`
- [ ] `repository.url` points to `https://github.com/yinloo-ola/pi-workflow-kit.git`
- [ ] `npm run check` passes locally
- [ ] `npm pack --dry-run` shows the expected files
- [ ] you are logged into npm with an account that can publish the package
- [ ] npm trusted publishing is configured for this GitHub repo, or you are publishing manually
- [ ] the version bump matches the release scope (`patch`, `minor`, or `major`)
- [ ] the git tag created by `npm version` is pushed with `--follow-tags`
- [ ] install instructions in the README still match the package name

### Manual publish

```bash
npm run check
npm pack --dry-run
npm publish --access public
```

### GitHub Actions publish

If GitHub trusted publishing is configured for this repo, pushing a `v*` tag will trigger `.github/workflows/publish.yml`.

```bash
npm run check
npm version patch
git push origin main --follow-tags
```

Users should then install with:

```bash
pi install npm:@tianhai/pi-workflow-kit
```

## Attribution

Skill content adapted from [Superpowers](https://github.com/obra/superpowers) by Jesse Vincent (MIT). This package builds on [pi-superpowers](https://github.com/coctostan/pi-superpowers) with active enforcement extensions, leaner skill files, on-demand reference content, and workflow tracking.

## Migration from `@yinlootan/pi-superpowers-plus`

Replace the old package name with:

```json
{
  "packages": ["npm:@tianhai/pi-workflow-kit"]
}
```

Runtime contracts remain unchanged in this rebrand:
- `plan_tracker`
- `workflow_reference`
- `/workflow-next`
- `/workflow-reset`
- existing skill names

## License

MIT - see [LICENSE](LICENSE) for details.
