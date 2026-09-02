# Implementation Plan: harness-neutral delegation and Pi role setup

## Overview

Design: docs/plans/2026-09-02-harness-neutral-delegation-design.md

This plan makes the workflow skills portable across Claude Code and Pi delegation extensions, keeps the existing Pi guard, and adds a Pi-native `/pwk-setup` command that installs the canonical role definitions into `.agents/agents/`. No Tintinweb adapter package or live provider dependency is part of this change.

## Requirement 1: Provider-neutral role contracts

### Acceptance criteria

- Given the five canonical role assets, when a host loads them as reusable roles, then each role has a stable logical identity, a clear purpose, required inputs, a report contract, and an explicit read-only reporter boundary.
- Given `pwk-recon-scout`, when a worker follows its contract, then its report contains `Relevant files`, `Existing patterns`, `Call sites`, `Test layout`, and `Gotchas` in that order, with `file:line` evidence for every repository claim and no design recommendation.
- Given any of the four review roles, when a worker follows its contract, then the report identifies evidence for findings, includes severity or disposition, and can explicitly report that no findings were found.
- Given a role body, when it is loaded by a different host, then the role behavior does not require a Pi extension name, a concrete subagent tool invocation, a provider-specific agent type, or a host-specific workflow API. Provider-specific frontmatter remains metadata and is not the portable role contract.

### Integration tests

- `should validate all canonical role identities and read-only boundaries` — loads the five published role files, verifies their logical names and read-only metadata, and confirms each role body contains its required authority and reporting instructions.
- `should validate the recon report contract` — asserts the five required section headings occur in order, the role requires `file:line` citations, and the role rejects design recommendations.
- `should validate every review role report contract` — asserts each review role requires evidence, severity or disposition, findings-only reporting, and an explicit no-findings outcome.
- `should keep provider invocation details out of portable role bodies` — checks that role instructions do not contain concrete calls to `subagent`, `Agent`, `Task`, or `SubagentWorkflow`.

### Checkpoints: none
### Review: skip

## Requirement 2: Explicit Pi role setup command

### Acceptance criteria

- Given a Pi session in an ungated phase and a project with no `.agents/agents/` directory, when the user invokes `/pwk-setup`, then the command creates the shared directory and all five canonical role files under the current session’s `ctx.cwd`, reports successful installation, and does not modify provider packages or Pi settings.
- Given a project with already-installed byte-identical role files, when the user invokes `/pwk-setup` again, then the files remain unchanged and the command reports them as skipped or already installed rather than rewriting them.
- Given a project containing a differing regular role file, when the user invokes `/pwk-setup` without `--force`, then the differing file remains unchanged, the other safe missing files may still be processed, and the command reports an actionable conflict and command failure.
- Given a project containing a differing regular role file, when the user invokes `/pwk-setup --force`, then the canonical content replaces only that differing role file and unrelated project files remain unchanged.
- Given a symlink at the destination directory, an intermediate destination directory, or a role-file path, when the user invokes setup with or without `--force`, then the command refuses the affected write, does not follow or modify the symlink target, reports the unsafe destination, and reports setup failure.
- Given unknown arguments or malformed force syntax, when the user invokes `/pwk-setup`, then the command rejects the invocation before writing any role file.
- Given the session is in brainstorm or plan phase, including when `/pwk-guard off` has disabled tool-call enforcement, when the user invokes `/pwk-setup` or `/pwk-setup --force`, then the command refuses before any filesystem mutation and explains that setup must run before entering or after leaving the gated phase.
- Given the package is loaded from an installed package rather than a source checkout, when the user invokes `/pwk-setup`, then the command resolves and copies the packaged canonical role assets successfully.

### Integration tests

- `should install all five role files through the registered command` — invokes the registered command handler with a temporary `ctx.cwd`, asserts the five exact destination files and canonical contents, and asserts success notification output.
- `should be idempotent for identical role files` — runs setup twice, asserts byte-identical contents and no second-write behavior, and verifies the second result reports skipped files.
- `should preserve conflicts unless force is explicit` — seeds one differing role file, runs setup without force, asserts the seed is unchanged and the result reports failure; reruns with force and asserts only that role is replaced.
- `should reject symlink destinations without touching their targets` — exercises symlinked directory and file fixtures, asserts no target content changes, and asserts an error result.
- `should reject unknown arguments before mutation` — invokes malformed command arguments and asserts the destination remains absent or unchanged.
- `should refuse setup during brainstorm and plan regardless of guard override` — drives the extension into each gated phase, invokes the command with and without force, and asserts no filesystem operation occurs even after setting the manual guard override to off.
- `should resolve canonical assets from the published package layout` — tests the package resource resolution against the package’s shipped directory structure rather than a repository-only path.

### Checkpoints: full
### Review: parallel

### Production-risk notes

- The command writes project files through an extension handler, bypassing normal `write`/`edit` tool interception; phase refusal, destination bounding, conflict handling, and symlink safety must be enforced inside the command path.
- Partial setup is possible when some files conflict or are unsafe; the result must make incomplete installation explicit rather than claiming success.

## Requirement 3: Harness-neutral workflow skills

### Acceptance criteria

- Given `pwk-brainstorming`, when a non-trivial topic has relevant prior art, then the skill requests one logical `codebase-recon` operation using `pwk-recon-scout` with fresh-context, read-only, bounded constraints, without prescribing a concrete host invocation.
- Given `pwk-executing-tasks` at feature review or a tagged parallel requirement review, when delegation is available, then the skill requests the four logical review roles—spec, tracing, smell, and hazard—over the same scope and diff, and asks the host to run independent work concurrently when supported.
- Given a host without a compatible delegation mechanism, when the skill reaches recon or review delegation, then the skill preserves the same role contract and performs the operation inline rather than silently skipping it.
- Given the existing workflow, when these instructions are updated, then feature acceptance, feature-spec and feature-complete checkpoints, progress tracking, per-requirement tags, inline code review, and the Pi guard’s phase meanings remain unchanged.
- Given portable skill files, when a Claude Code host or a different Pi extension reads them, then it can follow the workflow without needing to understand a literal `subagent({ tasks: ... })`, `Agent`, `Task`, or `SubagentWorkflow` call. Concrete host examples appear only in clearly labeled integration documentation.

### Integration tests

- `should describe recon as a logical capability request` — checks `pwk-brainstorming` for the logical operation, role, safety constraints, five-section output handoff, and explicit unavailable fallback without requiring a concrete invocation payload.
- `should describe review as four logical independent roles` — checks `pwk-executing-tasks` for all four role identifiers, shared feature scope, independent execution, collection of all results, and inline fallback.
- `should not retain the legacy concrete delegation payload in portable skills` — asserts the portable skill files contain no old `tasks` JSON template or concrete provider call example while allowing ordinary semantic references to agents and delegation.
- `should preserve the existing feature-gate and phase contracts` — runs the static skill checks for feature acceptance, both mandatory checkpoints, per-requirement tag defaults, and the guard unlock list.

### Checkpoints: spec
### Review: inline

## Requirement 4: Capability contract and normalized outcomes

### Acceptance criteria

- Given a future host or adapter author, when they read the delegation contract, then it defines logical operation selection, logical role identity, repository root, prompt/input data, fresh context, read-only enforcement, parallelism, bounded execution, result collection, and provider identity without prescribing a transport.
- Given a provider that supports only recon, when capability matching occurs, then it may satisfy `codebase-recon` without being represented as a full feature-review provider.
- Given a provider that cannot enforce read-only execution, fresh context, result collection, or bounded execution, when a workflow requests those capabilities, then the provider is ineligible for that delegated operation and the workflow can use inline fallback.
- Given a provider outcome, when it is normalized, then it retains the logical role and includes one of `completed`, `failed`, `timed-out`, or `skipped`, plus an optional report, error, provider identity, and run identifier. A failed, timed-out, or skipped result is not represented as a successful empty report.
- Given a multi-role operation, when results are collected, then there is a distinguishable outcome for every requested role and the operation cannot claim complete coverage while a required role has no result or approved fallback.

### Integration tests

- `should validate the documented capability contract` — parses the contract documentation or contract fixture and asserts all required request fields, capability names, and normalized status values are present.
- `should distinguish recon capability from parallel review capability` — exercises a contract-shaped provider fixture that supports recon only and asserts it is accepted for recon and rejected for four-role parallel review.
- `should reject unsafe provider capability claims` — exercises fixtures missing read-only enforcement, fresh context, result collection, or bounded execution and asserts the operation is ineligible.
- `should preserve role identity and failure status during normalization` — feeds completed, failed, timed-out, and skipped fixture outcomes through the documented normalization shape and asserts no failure becomes a successful empty report.

### Checkpoints: none
### Review: skip

## Requirement 5: Safe fallback and partial-failure behavior

### Acceptance criteria

- Given no compatible provider or an unsafe provider, when recon is requested, then the workflow emits `Scout: unavailable`, performs the same five-section recon inline, and continues design work with that report.
- Given a delegated recon worker that fails or times out, when the result is returned, then the workflow treats it as unavailable and performs inline recon rather than treating the failure as an empty observation map.
- Given four delegated review roles where one role fails or times out, when review results are assembled, then successful peer reports are retained and the missing role is retried or completed inline.
- Given a required review role that has neither a successful provider result nor an inline/fallback result, when the workflow reaches completion, then it does not report the feature as fully reviewed and identifies the missing role.
- Given a provider that cannot prove its read-only boundary, when recon or review is requested, then the workflow uses inline execution rather than dispatching a worker with merely prompt-level restrictions.

### Integration tests

- `should fall back to inline recon when the provider is unavailable` — verifies the exact unavailable notice and asserts the inline path still requires all five recon sections and citations.
- `should fall back to inline recon after provider failure or timeout` — feeds failure and timeout outcomes and asserts neither is treated as a successful report.
- `should retain successful review reports while recovering a failed role` — supplies three successful role results and one failure, then asserts the three remain available and the fourth is marked for retry or inline completion.
- `should block a complete-review result when a role remains missing` — supplies an incomplete result set and asserts the workflow reports incomplete coverage with the missing logical role.

### Checkpoints: none
### Review: skip

## Requirement 6: Cross-host and Pi integration guidance

### Acceptance criteria

- Given a user working in Claude Code, when they read the integration guidance, then they can identify the logical PWK roles, the host-native read-only delegation mechanism to use, and the need for Claude Code permissions or hooks because the Pi guard does not transfer.
- Given a user working in Pi with `@tintinweb/pi-subagents`, when they follow the documented setup, then they can install the role definitions with `/pwk-setup`, map recon to the provider’s safe explorer or installed `pwk-recon-scout`, and map the four review roles to the installed definitions without pre-creating running subagents.
- Given another Pi delegation extension, when it does not expose the documented capabilities or an adapter, then the documentation says it is unsupported for automatic delegation and directs the user to inline fallback rather than promising universal compatibility.
- Given an existing user of the legacy optional `pi-subagents` package, when they read the documentation, then the package-agent manifest path is clearly labeled as compatibility behavior and is not presented as the portable delegation contract.
- Given provider-specific examples, when they appear in documentation, then they are contained in clearly labeled host-integration sections and do not leak into the portable workflow skill contract.

### Integration tests

- `should document Claude Code, Tintinweb Pi, and unsupported-provider behavior` — asserts the integration documentation contains each host mapping, the separate permission boundary, `/pwk-setup`, inline fallback, and the no-universal-compatibility limitation.
- `should document role setup without requiring a provider package` — asserts the setup instructions install role definitions only and do not instruct the command to install or modify a provider.
- `should keep provider-specific invocation examples out of portable skills` — compares portable skill files with labeled integration documentation and asserts concrete examples occur only in the latter.
- `should document legacy package metadata as compatibility-only` — checks the package/developer docs explain the retained legacy manifest and optional peer without making it the required or sole provider.

### Checkpoints: none
### Review: skip

## Requirement 7: Package and regression coverage

### Acceptance criteria

- Given the published package, when it is installed into Pi, then the existing workflow-guard extension and all workflow skills remain discoverable, the five canonical role assets are shipped, and the `/pwk-setup` command is registered by the existing extension.
- Given the package metadata, when a user installs the core kit without a delegation provider, then installation remains valid; the kit has no dependency on `@tintinweb/pi-subagents` and does not require any provider for inline workflow operation.
- Given legacy provider metadata retained for compatibility, when package resources are loaded, then it remains optional and documented as a compatibility path rather than being used as the portable skill contract.
- Given the complete test suite and static skill-lint, when the feature changes are applied, then existing guard behavior, phase transitions, role packaging, and documentation consistency remain green.
- Given the user-facing behavior changes, when the release documentation is reviewed, then README, developer guide, workflow phases, oversight model, project guidance, and changelog agree on `/pwk-setup`, role setup timing, provider limitations, inline fallback, and the absence of a `pi-workflow-kit-tintinweb` package.

### Integration tests

- `should preserve Pi extension and skill package entries` — inspects package metadata and asserts the existing extension and skill entry points remain present alongside the shipped role assets.
- `should include the setup command’s canonical assets in the package` — checks the package file list or pack output for the extension and all five role files, without requiring a standalone executable.
- `should keep providers optional` — inspects dependencies and asserts there is no direct Tintinweb dependency and no required delegation provider for core installation.
- `should pass the full regression gate` — runs the existing Vitest suite and `node tests/skill-lint.mjs`, including all guard, phase, role, and cross-document consistency checks.

### Checkpoints: none
### Review: inline

### Production-risk notes

- Package metadata and published-file changes can make the setup command or role assets unavailable to users even when repository tests pass; packaging must be validated against the distributable layout.
- Retaining legacy provider metadata while introducing a portable contract creates a documentation-drift risk; the compatibility boundary must be tested and clearly labeled.

## Setup

- No external provider installation is required for the core package or its tests.
- Use temporary project fixtures for `/pwk-setup`; do not write setup test artifacts into the repository.
- Validate the published package layout with the package manager’s pack/dry-run mechanism or an equivalent read-only inspection before relying on installed-resource paths.
- Run the existing Vitest and static skill-lint suites before and after implementation.

## Feature acceptance

The **primary enforced spec** — the definition of done for this feature and the test the executor gates on first:

- `should install discoverable roles and preserve portable delegation behavior` — Given a Pi project with no `.agents/agents/` directory and the core package plus a compatible provider such as `@tintinweb/pi-subagents` loaded, when the user runs `/pwk-setup` before entering a gated phase, then all five canonical role definitions are installed without modifying provider packages, the provider can discover the roles without pre-created running subagents, and the portable brainstorming/execution skills describe recon and review as logical capability requests with inline fallback. Given the user then enters brainstorm or plan phase, when they invoke `/pwk-setup --force`, then setup is refused before any write even if the manual guard override is off. Given a review provider returns three reports and one timeout, then the three reports are retained, the missing role is recovered inline or retried, and the feature is not marked fully reviewed until all required roles have outcomes.

### Feature review: parallel

One review over the whole feature diff. Four fresh-context read-only reviewers are preferred when a compatible delegation provider is available; otherwise perform the inline feature-level review.
