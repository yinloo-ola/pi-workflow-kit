# AGENTS.md

Instructions for AI coding agents working in this repository. If you also maintain `CLAUDE.md`, keep it in sync with this file.

## Project

`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **brainstorm → plan → execute → finalize** workflow with test-first discipline. During the brainstorm and plan phases the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.

Three components:
- `extensions/workflow-guard.ts` — the single enforcement engine (the only code file).
- `skills/pwk-*/SKILL.md` — workflow-phase guidance, invoked as `/skill:pwk-*`.
- `agents/pwk-*-reviewer.md` — parallel code-review sub-agents (discovered by the optional `pi-subagents` package).

## Commands

```sh
npm install        # setup
npm test           # vitest run — unit tests, one-shot
npm run lint       # biome check . — lint + format (TS source only)
npm run check      # biome check . && vitest run — full gate, run before committing
```

No build step. No typecheck script (`tsconfig.json` is IDE-only). No watch mode.

## Layout

```
extensions/   # TS source — workflow-guard.ts only
tests/        # vitest — workflow-guard.test.ts
skills/       # 7 SKILL.md dirs, pwk-* namespaced
agents/       # 4 reviewer sub-agents, pwk-*-reviewer.md
docs/         # developer-usage-guide, workflow-phases, oversight-model, lessons
docs/plans/   # ephemeral active plans (deleted after finalize)
docs/plans/completed/   # archived plans
docs/adr/     # permanent ADRs (never archived)
```

## Code conventions

- Files: `kebab-case`. Skill/agent dirs use the `pwk-` prefix.
- Style: 2-space indent, single quotes, 120-char width, semicolons (Biome-enforced).
- Types `PascalCase`, consts `UPPER_SNAKE`, functions `camelCase`.
- **Export pure helpers** (`isSafeCommand`, `shouldBlockFilePath`, `getCurrentPhase`) so tests run without the pi runtime. The default export only wires `pi.on(...)` handlers.
- Biome overrides for `tests/**` relax `noExplicitAny`, `noNonNullAssertion`, `noUnusedVariables`, `organizeImports`. Biome targets TS only — `node_modules`, `docs`, `*.md`, `*.json` excluded.

## Workflow conventions (content changes)

- **One design doc = one PR.** Each requirement is one testable slice with two human checkpoints (tests, complete).
- **Phase transitions only via `/skill:pwk-*`** — no message-keyword auto-detection (deliberately removed).
- **`docs/lessons.md`** persists agent-learned imperative rules across sessions; read at brainstorm/plan/execute, curated at finalize. Survives `/new`.
- **`docs/plans/` is ephemeral** — archive to `docs/plans/completed/`. ADRs in `docs/adr/` are permanent.
- **Reviewer agents** use YAML frontmatter (`name`/`description`/`tools`/`systemPromptMode: replace`) and are read-only (`tools: read, grep, find, ls, bash`).

## Editing workflow-guard.ts

- Single file: exported pure helpers (`isSafeCommand`, `shouldBlockFilePath`, `getCurrentPhase`, `UNLOCK_SKILLS`) + a default-export factory wiring `pi.on(...)` handlers. The `UNLOCK_SKILLS` export is the single source of truth for which skills exit a gated phase — `tests/skill-lint.mjs` asserts the export against the skills' claims and that the input handler dereferences it.
- **Cache-safe reminders:** append phase reminders as tail messages via `before_agent_start`, never as system-prompt mutations.
- **`/pwk-guard on|off|auto`** pins the guard independent of phase; override state is separate from `phase` so `auto` recovers correct enforcement.
- **Bash guarding:** `isSafeCommand` splits on `&&`/`||`/`;` (not `|`, to allow pipes), strips cosmetic stderr redirects, blanks quoted substrings, then tests against `DESTRUCTIVE_PATTERNS`. Allowed unless matched.
- **Session state** is module-level `let` vars reset on `session_start` — no persistence beyond that.

## Before committing

Run `npm run check`. Keep PRs small, add tests for new guard behavior, update `CHANGELOG.md` (Keep-a-Changelog format) and relevant `docs/`, and link any issue. See `CONTRIBUTING.md`.

## Published package

`package.json` `files` ships only `extensions/`, `skills/`, `agents/`, the four `docs/*.md` guides, `LICENSE`, `README.md`. Tests and configs are excluded from the tarball.

## Where to look

- Enforcement logic: `extensions/workflow-guard.ts`
- Tests: `tests/workflow-guard.test.ts`
- Skills: `skills/pwk-*/SKILL.md`
- Reviewer agents: `agents/pwk-{spec,tracing,smell,hazard}-reviewer.md`
- Workflow detail: `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`
- Contributing: `CONTRIBUTING.md` · History: `CHANGELOG.md`
