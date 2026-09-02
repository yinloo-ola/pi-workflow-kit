# Provider Delegation Contract

This document defines the provider-neutral contract for running PWK roles outside the main agent. It is an integration contract for host adapters and extensions. The workflow skills describe the same behavior in portable language; they do not require this document’s TypeScript notation or any specific transport.

## Logical operations

A provider may support either operation independently:

- `codebase-recon` — run one `pwk-recon-scout` role and return its five-section observation map.
- `feature-review` — run the requested review roles over one feature scope and return one outcome per role.

The logical role name is not the provider’s concrete agent type. A provider may map `pwk-recon-scout` to a safe built-in explorer, a custom agent definition, or a host-native read-only task.

## Required capabilities

A provider advertises capabilities independently from its name:

| Capability | Meaning |
|---|---|
| `codebase-recon` | Can run one fresh, read-only recon worker and collect its report. |
| `named-role-dispatch` | Can map each requested logical role to an appropriate worker. |
| `parallel-review` | Can run independent review roles concurrently when requested. |
| `result-collection` | Returns one distinguishable outcome for every requested role. |
| `read-only-enforcement` | Prevents delegated workers from writing files or running destructive commands. |
| `fresh-context` | Starts each requested worker without reusing an unrelated prior conversation. |
| `bounded-execution` | Applies a timeout, turn limit, or equivalent resource bound. |

A provider must not claim `read-only-enforcement` when it only adds a prompt instruction. Providers may support `codebase-recon` without supporting `parallel-review`.

## Request shape

The following TypeScript is illustrative. Implementations may use Pi events, tool calls, CLI processes, native task APIs, or another transport.

```ts
type DelegationOperation = 'codebase-recon' | 'feature-review';
type DelegationRole =
  | 'pwk-recon-scout'
  | 'pwk-spec-reviewer'
  | 'pwk-tracing-reviewer'
  | 'pwk-smell-reviewer'
  | 'pwk-hazard-reviewer';

type DelegationRequest = {
  operation: DelegationOperation;
  roles: DelegationRole[];
  prompt: string;
  cwd: string;
  constraints: {
    readOnly: true;
    freshContext: true;
    parallel: boolean;
    bounded: true;
  };
};
```

The provider must preserve the logical roles and the repository root when translating a request. `parallel: true` requests concurrency; it does not permit unbounded concurrency. If the provider cannot satisfy a requested constraint, it must reject the delegated operation so the host can use inline fallback.

## Normalized outcome shape

```ts
type DelegationStatus = 'completed' | 'failed' | 'timed-out' | 'skipped';

type DelegationResult = {
  role: DelegationRole;
  status: DelegationStatus;
  report?: string;
  error?: string;
  provider?: string;
  runId?: string;
};
```

Rules:

- `role` is required and must identify one requested logical role.
- `completed` requires a non-empty `report` that follows the role contract.
- `failed` and `timed-out` require an `error` or equivalent failure explanation.
- `skipped` is explicit and is not equivalent to completion.
- `provider` identifies the adapter or host that produced the outcome when known.
- `runId` is an opaque provider-local identifier when available; consumers must not interpret its format.
- A multi-role operation is complete only when every requested role has a completed result or an explicit fallback result approved by the workflow.

An empty report is not a successful result. A missing role is not silently discarded.

## Fallback protocol

If no provider satisfies the requested capabilities, the host performs the role inline using the same logical contract. For recon, it reports:

```text
Scout: unavailable — inline recon used.
```

For feature review, successful delegated reports remain usable. A failed or timed-out role is retried or performed inline. The host does not report a complete review while a required role has neither a delegated result nor an inline result.

## Provider discovery and selection

Provider discovery and transport are host-specific. A future Pi adapter may use a capability registry, an event-bus handshake, a shared extension RPC, or explicit configuration. The core PWK package does not assume that all Pi extensions are discoverable or that a package name identifies a compatible provider.

If multiple providers are available, selection must be deterministic. A host may use explicit configuration or a documented priority order. It must not select a provider based only on extension load order when that changes safety or result semantics.

## Role setup and provider loading

The Pi-only `/pwk-setup` command copies the canonical role definitions into `.agents/agents/`. This makes named roles available to providers that discover the shared directory, including `@tintinweb/pi-subagents`. Setup creates role definitions; it does not install or configure a provider.

Providers may cache role definitions. Hosts should tell the user when `/reload` or a new session is needed. Setup must not reload a session implicitly.

## Safety boundary

The provider is responsible for enforcing any capability it advertises. The role prompt is defense in depth, not a security boundary. The Pi workflow guard protects the main Pi session’s brainstorm and plan phases; it does not automatically protect Claude Code or another host, and it does not replace delegated-worker tool restrictions.
