## Requirements

### Requirement 1: Provider-neutral role contracts

The kit defines five reusable logical roles without making a Pi extension, tool name, agent type, or harness API part of the role contract:

- `pwk-recon-scout`
- `pwk-spec-reviewer`
- `pwk-tracing-reviewer`
- `pwk-smell-reviewer`
- `pwk-hazard-reviewer`

Each role contract defines its purpose, inputs, output shape, evidence requirements, authority boundary, and failure behavior. Recon and review roles are read-only reporters. The recon role must return the five-section map (`Relevant files`, `Existing patterns`, `Call sites`, `Test layout`, and `Gotchas`) and cite `file:line` evidence for claims. Review roles must return findings with evidence, severity or disposition, and an explicit no-findings result when appropriate.

### Requirement 2: Explicit Pi role setup command

The published Pi package registers an idempotent `/pwk-setup` slash command that installs the five canonical role definitions into the project’s shared `.agents/agents/` directory so compatible Pi extensions, including `@tintinweb/pi-subagents`, can discover them without pre-creating running subagents.

The command creates only the required directory and role files, reports what it created or skipped, and never installs or changes a delegation provider. Existing identical files remain unchanged. Existing differing files are conflicts and are not overwritten unless the user supplies the explicit `/pwk-setup --force` option. Symlink targets are rejected rather than followed for writes, and an incomplete setup exits non-zero or reports command failure. The command refuses to mutate the project while the workflow is in brainstorm or plan phase, including when the normal tool-call guard is manually disabled.

### Requirement 3: Harness-neutral workflow skills

`pwk-brainstorming`, `pwk-executing-tasks`, and related documentation describe delegation in terms of logical operations and required capabilities rather than a concrete `subagent`, `Agent`, `Task`, or `SubagentWorkflow` invocation.

The skills must preserve the current workflow behavior:

- non-trivial recon requests one fresh-context, read-only scout;
- feature review requests four independent logical reviewers;
- parallel execution is used when the host supports it;
- inline execution remains available when delegation is unavailable or unsafe;
- human checkpoints, feature acceptance, progress tracking, and the Pi write guard retain their current meanings.

Host-specific command names and invocation examples may appear only in clearly labeled integration documentation, not in the portable workflow contract.

### Requirement 4: Capability contract and normalized outcomes

The design documents a provider-neutral capability contract that future host adapters can implement. It covers, at minimum, logical operation selection, role identity, repository root, prompt/input data, fresh context, read-only enforcement, parallelism, bounded execution, result collection, and provider identity.

The contract distinguishes a provider’s ability to execute a role from the role’s logical name. A provider may map `pwk-recon-scout` to a safe built-in explorer, a custom agent definition, or a host-native read-only task. A provider must not claim a read-only capability when it can only provide instruction-level restrictions.

Provider outcomes are normalized into role, status, report, error, provider, and run identifier fields. The statuses distinguish completion, failure, timeout, and skip. A successful operation means that all required roles were either completed or explicitly handled by fallback; missing reports must not be silently treated as a completed review.

### Requirement 5: Safe fallback and partial-failure behavior

When no compatible provider is available, or when a provider cannot guarantee the requested safety constraints, the active workflow performs the operation inline and states the fallback explicitly.

A failed or timed-out recon scout produces a `Scout: unavailable` notice and the main agent performs the required five-section recon inline. A failed or timed-out review role is retried or completed inline while successful peer reports are retained. The workflow does not silently omit a required role.

### Requirement 6: Cross-host and Pi integration guidance

The package documents the separation between portable workflow semantics and host-specific enforcement:

- Claude Code maps logical roles to its native read-only task/subagent mechanism and applies its own permissions or hooks.
- Pi maps logical roles to an installed compatible delegation extension.
- `@tintinweb/pi-subagents` is documented as a supported manual mapping: recon may use its read-only `Explore` type, while the installed `.agents/agents/` definitions provide the four named reviewer roles.
- Other Pi extensions are supported when they expose an equivalent capability or a separately maintained adapter; arbitrary extensions are not claimed to be automatically compatible.
- `workflow-guard.ts` remains responsible for Pi phase enforcement and is not treated as a cross-harness security boundary.

### Requirement 7: Package and regression coverage

The package metadata, published-file list, usage documentation, and project guidance describe the `/pwk-setup` slash command, canonical role assets, portable skill contract, provider limitations, and inline fallback consistently. The package retains its Pi extension and skill entry points and does not require a provider package. Any legacy provider-specific package metadata is documented as compatibility-only and must not be presented as the portable delegation contract.

Automated coverage verifies setup behavior, role-file integrity, conflict and force handling, symlink refusal, phase refusal, package inclusion, skill wording, fallback rules, and preservation of existing guard behavior. Provider-specific behavior is tested through contract-shaped fixtures or mocks; the core package does not require a live `@tintinweb/pi-subagents` installation for its default test suite.

# Design: Harness-neutral delegation and role setup

## Problem

The workflow skills currently couple delegation to one Pi-specific `subagent` invocation shape and to the `pi-subagents.agents` package manifest. That coupling makes the workflow difficult to port to Claude Code and prevents a clean switch to `@tintinweb/pi-subagents`, whose native surface uses `Agent`, `get_subagent_result`, `steer_subagent`, and `SubagentWorkflow`, and whose custom-agent discovery includes `.agents/agents/`.

The desired behavior is broader than any one provider: the workflow needs a read-only recon worker and independent read-only review roles, with explicit evidence and predictable fallback. The kit should define that behavior once and let each harness translate it.

## Scope and non-goals

This change makes the skills and role assets provider-neutral and adds a project setup command. It does not bundle a Tintinweb adapter, import `@tintinweb/pi-subagents`, or implement universal runtime discovery of arbitrary Pi extensions.

The core package remains usable without any delegation provider. Provider-specific execution is documented through mappings and a future adapter contract. Inline work is the compatibility baseline.

The Pi workflow guard remains Pi-specific. Claude Code or another harness must provide its own permission, hook, or tool restrictions; installing this package cannot enforce the Pi guard outside Pi.

## Architecture

The design has four layers:

1. **Portable workflow semantics** — the skills define when recon/review is needed, which logical roles must run, what each role must return, how evidence is reported, and what fallback means.
2. **Canonical role assets** — the existing five files under `agents/` remain the source content distributed by the package. Their frontmatter is treated as provider metadata, while their role instructions and output rules are the portable contract.
3. **Project setup** — the Pi extension registers `/pwk-setup`, which copies canonical role assets into `.agents/agents/` using conflict-safe, symlink-safe, idempotent file installation. This makes the roles discoverable by providers that support the shared `.agents` convention.
4. **Host/provider translation** — the active harness maps logical roles and capability requirements to its own agent mechanism. The first documented Pi mapping targets `@tintinweb/pi-subagents`; future adapters may implement a formal provider protocol without changing the skills.

The core package does not need to expose a TypeScript delegation interface to the Markdown skills. The capability contract is a stable behavioral/API specification for hosts and future adapters, not a mandatory runtime dependency of the current package.

## Role assets

Keep `agents/` as the canonical package directory for this change. Moving content to a second `roles/` directory would create duplicate sources and a synchronization problem without improving the initial Tintinweb integration.

The setup command copies the canonical files rather than generating wrappers. Provider-specific fields may be added only when they are harmless to other loaders. Role instructions must not say that `workflow-guard.ts` is the only mechanism preventing writes; they must require read-only execution as a provider capability and retain the prompt-level prohibition as a defense in depth.

The recon role remains one role with a distinct report shape, not a fourth review dimension. Review roles remain independent and read-only. The logical role identifier is stable even when a provider maps it to a different concrete agent type.

## Pi setup command

The package’s existing Pi extension registers a project-local setup command:

```text
/pwk-setup
/pwk-setup --force
```

The command uses the current `ExtensionCommandContext.cwd` as the project root and resolves the canonical `agents/` directory relative to the installed extension, so it works from the published package as well as a source checkout. It installs:

```text
.agents/agents/pwk-recon-scout.md
.agents/agents/pwk-spec-reviewer.md
.agents/agents/pwk-tracing-reviewer.md
.agents/agents/pwk-smell-reviewer.md
.agents/agents/pwk-hazard-reviewer.md
```

Default behavior is conservative:

- missing parent directories are created;
- missing role files are created;
- byte-identical role files are skipped as already installed;
- differing regular files are reported as conflicts and preserved;
- `--force` explicitly replaces differing regular files;
- unknown arguments are rejected;
- symlink destinations are rejected, including a symlinked role file and a symlinked destination directory;
- conflicts or rejected targets cause a failed command after the remaining safe entries are processed;
- the command does not modify `.pi/`, Pi settings, provider packages, or user files outside the target role paths;
- invocation during brainstorm or plan is refused before any filesystem mutation, regardless of the manual guard override.

The installer logic should be exposed through pure helpers so it can be tested without starting Pi. It should use exclusive or no-follow-safe file operations where available and verify final contents after writing. The command should provide human-readable notifications and stable failure behavior for command/RPC callers.

Setup is an explicit user action and must happen before entering `/skill:pwk-brainstorming`, or after leaving the gated phases. No skill silently runs it. Providers that cache agent definitions may require a user-invoked `/reload` or a new session after setup; the command must not reload the session automatically because reload can reset workflow state.

## Portable delegation contract

The contract is expressed behaviorally and may be represented by an adapter-specific API. A provider request contains the following information:

```ts
type DelegationRequest = {
  operation: 'codebase-recon' | 'feature-review';
  roles: string[];
  prompt: string;
  cwd: string;
  constraints: {
    readOnly: boolean;
    freshContext: boolean;
    parallel: boolean;
    bounded: boolean;
  };
};

type DelegationResult = {
  role: string;
  status: 'completed' | 'failed' | 'timed-out' | 'skipped';
  report?: string;
  error?: string;
  provider?: string;
  runId?: string;
};
```

The exact TypeScript types are illustrative. The durable contract is the meaning of each field and the required behavior. Providers may use tool calls, event-bus RPC, CLI processes, native task APIs, or another mechanism.

Required capabilities are declared separately from provider identity:

- `codebase-recon` — one fresh read-only worker and one collected report;
- `named-role-dispatch` — map each logical role to an appropriate worker;
- `parallel-review` — launch independent review roles concurrently when requested;
- `result-collection` — return one normalized outcome per requested role;
- `read-only-enforcement` — enforce the worker’s no-write/no-destructive-command boundary;
- `bounded-execution` — apply a timeout, turn limit, or equivalent bound.

A provider may support recon without supporting parallel review. The workflow requests the smallest capability set needed for the operation and falls back when the set is not satisfied.

## Provider mapping

### `@tintinweb/pi-subagents`

The `/pwk-setup` command makes the five role files available through `.agents/agents/`, which the provider documents as a project agent location. A provider-aware host can then map:

- `pwk-recon-scout` to the installed role or, when no role definition is loaded, its built-in read-only `Explore` type;
- the four review roles to their installed named definitions;
- fresh context to a new `Agent` invocation;
- parallel review to four independent `Agent` invocations or a provider workflow that preserves independent top-level results;
- result collection to foreground results or background completion/result retrieval;
- read-only enforcement to the role’s `tools: read, grep, find, ls, bash` declaration plus provider restrictions.

The documentation must call out that this is a host mapping, not a core dependency. It must also avoid copying Tintinweb’s option names into the portable skills. For example, a Tintinweb adapter may translate to `isBackground`, `maxTurns`, `thinkingLevel`, `inheritContext`, and `cwd`, while another provider uses different names.

### Claude Code

Claude Code consumes the same logical role contract through its native read-only subagent/task facility. The package documents that Claude Code must enforce its own permissions and hooks. The role files can be copied into the host’s supported agent location or their instructions can be supplied through the host’s role mechanism; the portable skills do not assume one installation path.

### Other Pi extensions

A different Pi extension is compatible only if it can satisfy the requested capability set or has a separate adapter that translates the contract. Tool-name similarity alone is not sufficient. A provider that cannot guarantee read-only execution is not eligible for recon or review delegation.

## Data flow

### Recon

1. `pwk-brainstorming` determines that the change is non-trivial and relevant prior art exists.
2. It requests the logical `codebase-recon` operation with `pwk-recon-scout`, the topic, intent, repository root, fresh-context, read-only, and bounded constraints.
3. The host selects a provider and maps the logical role to a safe worker.
4. The worker returns the five-section observation report with `file:line` citations.
5. The main agent uses the report to ground approach exploration and design presentation.
6. If dispatch is unavailable or unsafe, the main agent emits `Scout: unavailable` and performs the same report inline.

### Feature review

1. After the feature-complete checkpoint, `pwk-executing-tasks` requests four logical roles over the same feature scope and diff.
2. The host launches independent workers concurrently when its provider supports `parallel-review`.
3. Each worker returns a normalized result; the host retains partial results and records failures.
4. Missing or failed roles are retried or completed inline. The feature review is not complete until every role has a result or an explicit human-approved skip.
5. The main agent applies smell fixes, reruns tests, and presents the combined review findings under the existing workflow rules.

## Error handling and safety

The setup command treats filesystem conflicts as user-visible errors rather than silently overwriting customized role definitions. It processes independent files so one conflict does not hide other missing roles, then exits non-zero if the installation is incomplete.

Provider selection must fail closed for unsafe delegation: inability to prove read-only enforcement, fresh context, result collection, or bounded execution causes inline fallback. Provider errors must preserve the logical role and operation so the main agent can report which part was unavailable.

A provider timeout is not equivalent to a successful empty report. A skipped role is not equivalent to a completed role. The workflow records the distinction and does not claim a complete review when required coverage is missing.

Read-only is defense in depth: role instructions state the boundary, provider configuration enforces it where possible, and the Pi workflow guard continues to block source writes during brainstorm and planning. The role setup command is intentionally outside the skill execution path to avoid a hidden mutation during gated phases.

## Documentation changes

Update the user-facing documentation to:

- describe logical roles and host/provider translation;
- document the Pi-only `/pwk-setup` and `/pwk-setup --force` conflict behavior;
- explain that setup installs role definitions but does not install a provider;
- show `@tintinweb/pi-subagents` as one supported Pi mapping;
- explain that `@tintinweb/pi-subagents` is optional and not a drop-in package replacement for the old `pi-subagents` contract;
- describe Claude Code portability and its separate permission enforcement;
- retain inline fallback and avoid claiming automatic compatibility with arbitrary Pi extensions;
- keep the Pi-only workflow guard and phase commands clearly labeled as Pi integration behavior.

Update `AGENTS.md` to reflect the new `/pwk-setup` command and role assets. Keep the existing single-code-file convention if the command is implemented inside `workflow-guard.ts`; if the implementation requires a separate source module, document that module and keep the guard’s single enforcement responsibility explicit.

## Testing strategy

Tests should be behavior-oriented and divided into three layers:

1. **Pi command/filesystem tests** — invoke the registered `/pwk-setup` handler against temporary project fixtures and verify creation, idempotence, byte-identical skips, conflict preservation, `--force` replacement, unknown-argument rejection, symlink refusal, gated-phase refusal, failed incomplete setup, and restriction to the five destination paths.
2. **Content-contract tests** — validate all five canonical role files and the installed copies for stable role identity, read-only metadata, required report sections, evidence rules, observations/findings-only framing, and absence of provider-specific invocation requirements in portable skill text.
3. **Provider-contract fixtures** — exercise a fake provider that supports the required capabilities, one that lacks a capability, one that returns partial failures, and one that times out. Verify normalized outcomes and inline fallback semantics without requiring a live provider package.

Retain the existing Vitest guard tests and static skill-lint checks. Extend static checks only with markers unique to the new behavior so stale content cannot pass accidentally. Test the published package file list or packaging manifest to ensure the extension and canonical role assets are shipped; no standalone CLI executable is required.

## Production-risk areas

- **Filesystem writes:** setup mutates `.agents/agents/`; writes must be idempotent, conflict-safe, symlink-safe, and bounded to known destination paths.
- **External/provider execution:** provider mappings depend on host APIs and may fail, time out, or return partial results; failures must be explicit and must not be represented as successful review coverage.
- **Concurrency:** four review roles may run concurrently; provider adapters must use their own bounded concurrency and must not assume unbounded `Promise.all` is safe.
- **Permission boundaries:** a prompt-only read-only claim is insufficient for delegated workers; unsafe providers must trigger inline fallback. Pi guard enforcement does not transfer to Claude Code.
- **Package distribution:** the extension and role assets needed by `/pwk-setup` must be present in the published tarball, while optional providers remain optional.

## Feature acceptance

- Given a project with no `.agents/agents/` directory and the package loaded in Pi, when the user runs `/pwk-setup`, then the command creates all five canonical role definitions, reports the installation, and a compatible provider can discover the roles without the user creating any running subagents.

- Given a project with customized role files, when the user runs `/pwk-setup` without `--force`, then differing files remain unchanged and the command reports actionable conflicts; when the user runs `/pwk-setup --force`, then only the requested canonical role files are replaced.

- Given the session is in brainstorm or plan phase, when the user runs `/pwk-setup` or `/pwk-setup --force`, then the command refuses before writing any file and explains that setup must happen before the gated phase or after it.

- Given a non-trivial change and an installed compatible provider such as `@tintinweb/pi-subagents`, when the user invokes `pwk-brainstorming`, then the host requests one fresh read-only `pwk-recon-scout` operation, receives the five-section cited map, and the main agent uses that map before presenting approaches; if the provider is unavailable or unsafe, then `Scout: unavailable` is reported and the same map is produced inline.

- Given a feature that has passed the feature-complete checkpoint, when the host supports bounded parallel role dispatch, then four independent read-only reviewer roles run over the whole feature diff, each returns a normalized report, and the main agent retains all findings; if one role fails or times out, then that role is retried or completed inline and the feature is not reported as fully reviewed while its result is missing.
