# AGENTS.md

Instructions for AI coding agents working in this repository. If you also maintain `CLAUDE.md`, keep it in sync with this file.

## Project

`pi-workflow-kit` (npm `@tianhai/pi-workflow-kit`) is an extension + skill kit for the [pi](https://github.com/badlogic/pi-mono) AI-coding-agent runtime. It enforces a **design → execute → finalize** workflow with test-first discipline: one buildable design doc per feature (requirements carry their own acceptance criteria + review tags — no separate plan phase). During the design phase the guard physically blocks writes to source files — only `docs/plans/` is writable, and a destructive-bash blacklist is enforced.

Three components:
- `extensions/workflow-guard.ts` — the single code file: the enforcement engine plus the Pi-only `/pwk-setup` command that installs role definitions into `.agents/agents/`.
- `skills/pwk-*/SKILL.md` — workflow-phase guidance, invoked as `/skill:pwk-*`. Harness-neutral: delegation is expressed as logical roles and capabilities, not a concrete agent tool.
- `agents/pwk-*.md` — canonical, provider-neutral role contracts (recon scout + four reviewers). `/pwk-setup` copies them into the project's `.agents/agents/` so compatible delegation extensions (e.g. `@tintinweb/pi-subagents`) can discover them; the legacy `pi-subagents` package manifest is retained as optional compatibility only.

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
extensions/   # TS source — workflow-guard.ts only (guard + /pwk-setup)
tests/        # vitest — workflow-guard.test.ts + delegation contract tests
skills/       # SKILL.md dirs, pwk-* namespaced, harness-neutral
agents/       # canonical role contracts (recon scout + 4 reviewers)
docs/         # developer-usage-guide, workflow-phases, oversight-model, provider-delegation-contract, lessons
docs/plans/   # ephemeral active plans (deleted after finalize)
docs/plans/completed/   # archived plans
docs/adr/     # permanent ADRs (never archived)
```

## Code conventions

- Files: `kebab-case`. Skill/agent dirs use the `pwk-` prefix.
- Style: 2-space indent, single quotes, 120-char width, semicolons (Biome-enforced).
- Types `PascalCase`, consts `UPPER_SNAKE`, functions `camelCase`.
- **Export pure helpers** (`isSafeCommand`, `shouldBlockFilePath`, `getCurrentPhase`, `assessDelegationCoverage`) so tests run without the pi runtime. The default export only wires `pi.on(...)` handlers and the `/pwk-guard` + `/pwk-setup` commands.
- Biome overrides for `tests/**` relax `noExplicitAny`, `noNonNullAssertion`, `noUnusedVariables`, `organizeImports`. Biome targets TS only — `node_modules`, `docs`, `*.md`, `*.json` excluded.

## Workflow conventions (content changes)

- **One umbrella = one PR.** A design doc is one PR by default; a requirement too big for one design doc is an **umbrella** — multiple design docs under one status-free overview, on one branch, finalized once. Each requirement is one testable slice; the human stops at the feature level (feature-spec + ship checkpoint).
- **Phase transitions only via `/skill:pwk-*`** — no message-keyword auto-detection (deliberately removed).
- **`docs/lessons.md`** persists agent-learned imperative rules across sessions; read at brainstorm/plan/execute, curated at finalize. Survives `/new`.
- **`docs/plans/` is ephemeral** — archive to `docs/plans/completed/`; each umbrella lives in its own `docs/plans/<date>-<umbrella>/` folder, disposed as one unit. ADRs in `docs/adr/` are permanent.
- **Reviewer agents** use YAML frontmatter (`name`/`description`/`tools`/`systemPromptMode: replace`) and are read-only (`tools: read, grep, find, ls, bash`).

## Editing workflow-guard.ts

- Single file: exported pure helpers (`isSafeCommand`, `shouldBlockFilePath`, `getCurrentPhase`, `UNLOCK_SKILLS`) + a default-export factory wiring `pi.on(...)` handlers. The `UNLOCK_SKILLS` export is the single source of truth for which skills exit a gated phase — `tests/skill-lint.mjs` asserts the export against the skills' claims and that the input handler dereferences it.
- **Cache-safe reminders:** append phase reminders as tail messages via `before_agent_start`, never as system-prompt mutations.
- **`/pwk-guard on|off|auto`** pins the guard independent of phase; override state is separate from `phase` so `auto` recovers correct enforcement.
- **`/pwk-setup [--force] [--fast-model <model>] [--all-roles]`** installs the five canonical role files into `<cwd>/.agents/agents/`. `--fast-model` (or the interactive picker, UI-gated, offered only while no hint is installed) writes `model: <model>` into the smell/hazard copies — `--all-roles` covers all four reviewers. Installs are substitution-aware: bare re-runs re-apply the recorded choice as a no-op; deltas that differ only in the kit-managed model line auto-update; other edits are conflicts preserved unless `--force`. Symlink destinations are rejected; refused outright during brainstorm/plan phases even when the guard override is `off`. It never installs or configures a delegation provider, and it never reloads the session.
- **Bash guarding:** `isSafeCommand` splits on `&&`/`||`/`;` (not `|`, to allow pipes), strips cosmetic stderr redirects, blanks quoted substrings, then tests against `DESTRUCTIVE_PATTERNS`. Allowed unless matched.
- **Session state** is module-level `let` vars reset on `session_start` — no persistence beyond that.

## Before committing

Run `npm run check`. Keep PRs small, add tests for new guard behavior, update `CHANGELOG.md` (Keep-a-Changelog format) and relevant `docs/`, and link any issue. See `CONTRIBUTING.md`.

## Published package

`package.json` `files` ships `extensions/`, `skills/`, `agents/`, the four `docs/*.md` guides plus `docs/provider-delegation-contract.md`, `LICENSE`, `README.md`. Tests and configs are excluded from the tarball. No delegation provider is required or installed by the core package.

## Where to look

- Enforcement logic: `extensions/workflow-guard.ts`
- Tests: `tests/workflow-guard.test.ts` + delegation contract tests (`setup-command`, `role-contracts`, `skill-delegation-contract`, `delegation-contract`, `fallback-behavior`, `integration-guidance`, `package-integrity`, feature E2E in `harness-neutral-delegation`)
- Skills: `skills/pwk-*/SKILL.md`
- Role contracts: `agents/pwk-recon-scout.md`, `agents/pwk-{spec,tracing,smell,hazard}-reviewer.md`
- Provider contract: `docs/provider-delegation-contract.md`
- Workflow detail: `docs/workflow-phases.md`, `docs/developer-usage-guide.md`, `docs/oversight-model.md`
- Contributing: `CONTRIBUTING.md` · History: `CHANGELOG.md`
