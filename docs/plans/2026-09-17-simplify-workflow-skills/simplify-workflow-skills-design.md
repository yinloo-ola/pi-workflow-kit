# Design: Simplify workflow skills

## At a glance

The workflow skills make agents read detailed formats, exceptional procedures, and mechanical shell recipes alongside the normal path. Keep the existing design → execute → finalize workflow, but move conditional detail into skill-local references and implement two mechanical operations as standard-library Python helpers. Scope assessment, vertical slicing, approvals, safety boundaries, and handoffs remain visible in the main skills. Verify correctness first and measure complete-run token usage against the current skills before claiming savings.

**Key decisions**
- Preserve all six skill names, phase boundaries, approvals, optional modes, artifact formats, and delegation contracts; this is one behavior-preserving refactor, not a new workflow engine.
- Keep scope assessment inline: large requests with distinct testable outcomes need a proposed umbrella of vertical slices, approved by the human. Design and execute one slice at a time, grounding later designs in implemented code.
- Use skill-local references with explicit load conditions (rejected: a shared sibling reference directory — independently installed skills could lose their dependencies).
- Keep short boundary reminders in each consuming skill; do not duplicate large reference files merely to achieve apparent portability.
- Use standard-library-only Python for structural design validation and review-packet assembly (rejected: Node — fits this repository but Python was selected for standalone text-processing helpers; neither runtime is universal).
- Require Python 3 for the two helper operations. When it is unavailable, report the blocker and request a suitable runtime; do not auto-install it or improvise a second implementation.
- Run baseline and refactored behavioral scenarios, plus a complete lifecycle rehearsal (rejected: text assertions alone — they cannot establish good slicing or correct instruction discovery).
- Judge token savings over complete runs, not file length. Correctness takes precedence over reductions in context.

| R# | Requirement in one line | Risk |
|---|---|---|
| R1 | Brainstorm through a shorter entry point without losing scope assessment or design correctness | — |
| R2 | Execute through focused references and generate review packets deterministically | — |
| R3 | Keep adjacent skills and installed skill resources compatible with the existing workflow | — |
| R4 | Demonstrate workflow fidelity and measure token usage against the original skills | — |

## Requirements

### R1: Focused brainstorming and structural design validation

An agent can follow brainstorming from its main skill, load only applicable detailed instructions, and validate the resulting design with a read-only Python helper.

**Acceptance criteria**
- Given a large request with distinct testable outcomes, when the agent assesses scope, then it proposes an umbrella of vertical slices and a build order, and requests approval before writing an overview or design. A layers-only split does not satisfy this criterion.
- Given a cohesive feature with several requirements, when it is assessed, then requirement count alone does not force an umbrella.
- Given an approved umbrella, when the first slice is brainstormed, then the overview records the roster and only the current slice receives a design doc; later slices are not designed speculatively.
- Given an existing umbrella and implemented predecessor code, when the next slice is brainstormed, then the agent reads the roster, reports predecessor phases using the existing bounded-read rules, and grounds its design in the current code. Build order remains advisory, as today.
- Given an invocation of brainstorming, when the main skill is loaded, then scope assessment, read-only boundaries, interview and approval rules, trivial handling, and completion/handoff conditions are visible without opening a reference. Conditional reference reads have explicit triggers before their first required use.
- Given a design in the existing trivial or non-trivial format, when the validator runs, then it reports structural validity consistently with the documented format: unique sequential requirement IDs, required acceptance-criteria sections, and valid Checkpoints/Review tags. Non-trivial designs require Feature acceptance; trivial designs retain their existing exception. Missing optional tags retain the documented defaults rather than being redefined as invalid.
- Given malformed, missing, or unreadable input, when validation runs, then it exits nonzero with actionable diagnostics identifying the file and structural problem; it never modifies the input or labels a semantic design judgment as verified.
- Given a skill copied with its local resources, a project path containing spaces, and execution from a different directory, when the helper is invoked with explicit paths, then validation still works without external packages or dependence on the project's Node configuration.

### Checkpoints: none
### Review: skip

### R2: Focused execution and deterministic review packets

An agent follows the existing execution gates through a shorter main skill and uses a Python helper to assemble the same review evidence reliably.

**Acceptance criteria**
- Given a first run, resume, trivial design, setup checkpoint, or opt-in requirement checkpoint/review, when execution follows the refactored skill, then its state transitions, approvals, test-first rules, and handoffs match the current workflow. The main skill names the condition and reference needed before each exceptional path.
- Given valid design/progress files and committed changes, when feature packet assembly runs, then it produces the existing packet sections and evidence using the current Commit-column range contract, including acceptance criteria, feature acceptance when present, production-risk content, commits, changed files, and diff.
- Given a requirement-scoped review, when packet assembly runs, then it applies the existing requirement-specific bounds and criteria and writes a distinct requirement-suffixed packet without overwriting another requirement's or the feature's packet.
- Given missing or ambiguous commit entries, invalid revisions, malformed input, or a Git command failure, when packet assembly runs, then it fails clearly instead of guessing a base or reporting success with incomplete evidence. An existing complete packet is not replaced by partial output.
- Given generated packets and later review fixes, when the existing refresh procedure is followed, then packet ranges remain explicit and generated packet content is excluded from self-referential review evidence. Existing refresh and post-review verification semantics remain intact.
- Given paths with spaces and a working directory outside the target repository, when the helper receives explicit project/file paths, then it resolves Git operations against the target project and writes only the designated packet within the selected topic.
- Given successful packet generation, when the agent delegates review, then it passes a file pointer rather than the packet body, preserves the logical role and fallback contracts, and does not treat packet generation as review approval.

### Checkpoints: none
### Review: skip

### R3: Compatible adjacent skills and packaged resources

Status, code review, finalization, and walkthrough continue to work with the unchanged artifacts, and each skill's new dependencies remain local and available after installation.

**Acceptance criteria**
- Given the existing progress vocabulary and topic layout, when status or finalization reads artifacts, then current discovery exclusions, bounded reads, setup precedence, verdict counts, and umbrella roster semantics remain unchanged.
- Given an umbrella with a missing progress file, unfinished slice, or failed requirement, when finalization is requested, then the existing blocking and explicit override rules still apply. Other topics do not block the selected topic.
- Given all required completion and approval conditions, when finalization proceeds, then learning extraction precedes disposal, the human chooses archive or delete, and disposal remains scoped to the whole selected topic folder. Walkthrough artifacts remain outside disposal.
- Given each refactored skill and its bundled references/scripts copied independently, when local dependencies are resolved, then no new dependency requires a sibling skill's filesystem contents. Existing logical skill handoffs are not removed or mistaken for file dependencies.
- Given the package tarball, when its contents and relative references are inspected, then all required resources are present and resolve with the installed layout. The six-skill inventory, guard unlock list, and role/provider contracts remain unchanged.
- Given a missing Python runtime at a helper step, when the skill follows its prerequisite instructions, then it identifies the blocker without claiming validation or packet generation succeeded, installing a runtime automatically, or continuing through the affected gate.
- Given the refactored skills, when maintained documentation and contract tests run, then they describe and test the new resource locations without preserving obsolete inline prose solely to satisfy wording pins. Root agent instructions remain synchronized if updated.

### Checkpoints: none
### Review: skip

### R4: Behavioral fidelity and complete-run token evidence

A reproducible evaluation compares the original and refactored skill packages and demonstrates that the shortened instructions preserve the intended workflow.

**Acceptance criteria**
- Given the repository before skill edits, when evaluation preparation runs, then the original skill package and relevant contracts are fixed to an explicit baseline revision, and both conditions use the same prompts, model configuration, available tools, fixture state, and scripted human answers. Expected outcomes are fixed before inspecting candidate results.
- Given the large-request and cohesive-control scenarios, when baseline and candidate are evaluated, then each case runs at least three times per version in fresh agent contexts. Agents receive the appropriate installed skill context, not this design's expected answers or the competing version.
- Given a large-request run, when its result is assessed, then evidence cites the actual proposed boundaries, approval stop, overview, current-slice design, and required reference accesses; merely mentioning umbrella or vertical slicing does not pass.
- Given a bounded fixture project, when both versions undergo a full lifecycle rehearsal, then evidence covers approved slicing, first-slice brainstorm and execution, a fresh-session resume, next-slice design grounded in implemented code, premature-finalization blocking, and finalization after all slices are complete.
- Given reference extraction and helper invocation, when traces are evaluated, then required instructions were read before dependent actions and helpers actually ran; a script's unit-test success is not substituted for agent invocation evidence.
- Given usage metadata, when results are compared, then the report accounts for complete-run input/output usage, including reference reads, tool output, retries, and corrections; cached input is reported separately when available. Unavailable metrics are marked unavailable and are not replaced by claims based on word count.
- Given evaluation failures, when the report is written, then every critical failure and baseline defect is reported separately, with links to supporting artifacts. A better average or an existing baseline defect does not excuse a candidate's missed approval, unsafe transition, incorrect slicing, or premature finalization.
- Given mixed results or no demonstrated token reduction, when completion is assessed, then the work is not declared to meet the combined correctness-and-savings goal. Investigate, revise, and rerun affected scenarios; if blocked by unavailable execution or usage instrumentation, report the blocker and seek a human decision rather than silently weakening the gate.

### Checkpoints: none
### Review: skip

## Problem and scope

The six SKILL.md files currently total approximately 11,700 words. Brainstorming and executing account for about 7,900. Length is a symptom: detailed schemas and exceptional paths sit beside decisions every invocation needs, while agents repeatedly reconstruct deterministic parsing and packet-generation commands.

The refactor remains one design doc and one PR. R1–R4 are implementation requirements, not an umbrella: they serve one coherent change whose design can be approved together. The workflow's ability to manage actual large umbrellas is part of the behavior under test.

No source skill is changed during brainstorming. Execution performs baseline capture before editing and implements the requirements in order. Do not claim universal harness compatibility or reliability improvement from format conformance alone.

## Approaches considered

### Short procedures with skill-local resources — selected

Keep decisions and completion criteria inline; put detailed formats and conditional procedures behind direct relative references. Script only structural validation and review-packet assembly. This preserves the workflow while reducing ordinary-path reading and replacing mechanical reconstruction with executable checks.

### Compress all prose in place — rejected

This avoids new files but leaves every invocation carrying rare branches and detailed formats. It also preserves repeated shell recipes and their failure modes.

### Move workflow state and actions into the extension — rejected

A workflow engine could automate more operations, but changes runtime behavior, portability, and permissions. Branch management, completion decisions, and disposal remain outside the two helpers.

### Shared cross-skill resource directory — rejected

A shared canonical file minimizes duplication in the complete kit but can be missing when a skill is installed alone. Prefer local detailed resources and brief inline boundary contracts, with compatibility tests across consumers; do not introduce a build/generation system to solve this refactor.

### Multiple helper runtimes — rejected

Node fits the repository's existing tooling, but Python was selected for standalone text processing. Neither is universally installed. Supporting Python plus Node or shell implementations would multiply maintenance and correctness paths. Declare Python 3 explicitly and use its standard library only.

### Text-only verification — rejected

Static assertions prove structure, not that an agent selects a good vertical split, loads a reference at the right time, or respects an approval boundary. Keep structural tests and add repeated behavioral scenarios and lifecycle evidence.

## Architecture and components

### Main skills

Each main file remains an ordered procedure containing entry conditions, safety constraints, decision points, approvals, direct reference triggers, completion criteria, and handoffs. Progressive disclosure is not a chain of reference files: the main skill links directly to required local resources. Do not move universally required short instructions out merely to lower word count.

The brainstorming scope check explicitly distinguishes an umbrella of vertical outcomes from horizontal implementation layers. It remains visible before any design is drafted. Preserve the existing frontier interview, recon capability/fallback, assumption gate, trivial fast path, and human approval semantics; this refactor is not permission to add extra recurring approval stops.

### Proposed local resources

- `skills/pwk-brainstorming/references/umbrella.md`: overview format, roster, first/later-slice mechanics.
- `skills/pwk-brainstorming/references/design-format.md`: detailed design format and field rules, including trivial/non-trivial distinction.
- `skills/pwk-brainstorming/scripts/validate-design.py`: read-only structural checks.
- `skills/pwk-executing-tasks/references/progress-format.md`: progress schema, existing state vocabulary, execution summary, and digest rules.
- `skills/pwk-executing-tasks/references/resume.md`: existing resume routes and bounded-read rules.
- `skills/pwk-executing-tasks/references/review.md`: packet use, dispatch, coverage, refresh, and fallback mechanics; role checklists stay in their existing canonical contracts.
- `skills/pwk-executing-tasks/scripts/build-review-packet.py`: deterministic packet generation.

Extract further adjacent-skill detail only when a real conditional branch earns a local reference. Status and walkthrough are already comparatively short; retain them largely inline rather than manufacture new files. Keep existing skill names and guard mappings.

### Helper interfaces

Proposed commands use explicit arguments and run without network access or third-party Python packages:

```sh
python3 <brainstorming-skill-dir>/scripts/validate-design.py <design-path>

python3 <executing-skill-dir>/scripts/build-review-packet.py \
  --project <repo-root> \
  --design <design-path> \
  --progress <progress-path> \
  --scope feature

python3 <executing-skill-dir>/scripts/build-review-packet.py \
  --project <repo-root> \
  --design <design-path> \
  --progress <progress-path> \
  --scope requirement --requirement 2
```

Document path interpretation in `--help`; resolve resources from the installed skill location and project inputs from explicit paths, not implicit skill-directory cwd. Use Git subprocess argument lists rather than interpolated shell command strings. Return concise success summaries and useful stderr diagnostics; nonzero means the operation did not succeed. The packet helper derives its output name from the selected design/topic and scope and validates the destination before writing.

Python 3 is a new explicit execution prerequisite for these two operations, not a new npm dependency. Declare and test the minimum Python version supported by the actual implementation; keep the code to broadly available standard-library facilities. A compatible interpreter must exist where the agent executes commands, which may differ from the user's machine.

## Data flow and state

1. Main skill classifies the task and selects the applicable path.
2. Agent reads the directly referenced local instructions needed for that path.
3. Agent produces or consumes the existing design/progress/overview artifacts.
4. Design validator checks structural properties; the agent and human still judge meaning.
5. Execution commits the reviewable changes under existing rules; the packet helper collects evidence from explicit progress-derived bounds.
6. Reviewers receive a packet pointer; executing retains responsibility for fixes, verification, progress updates, and approvals.
7. Status and finalization consume the unchanged artifact contracts.

No new persisted workflow states are introduced. Helpers do not mark requirements done, approve checkpoints, switch branches, create worktrees, or delete plans.

## Error handling

- Missing local resource: report the missing dependency before performing the affected action; do not silently skip its instructions.
- Missing interpreter: report the prerequisite and stop at the affected helper step. No automatic runtime installation or alternate-language fallback.
- Invalid design: report structural diagnostics for correction; do not rewrite the design automatically or reinterpret human intent.
- Invalid packet inputs or Git failure: fail without publishing a partial packet or choosing a guessed range.
- Evaluation limitations: disclose missing instrumentation or agent capabilities. Record a blocker rather than claiming a passing rehearsal.
- Semantic failures: restore critical inline guidance or revise its trigger, then rerun the affected cases. Lower token usage never overrides a critical workflow failure.

## Verification approach

### Baseline and fixtures

Before changing skill content, capture the current revision and complete relevant resources. Retain evaluation prompts, rubric, scripted replies, environment metadata, and results in a scoped evaluation area. Keep transient fixture projects and raw transcripts inside a disposable workspace location; keep a concise, reproducible evidence report available after plan disposal. Do not place credentials or private third-party code in fixtures or reports.

The large-request fixture is an equipment-loan service with borrowing, returns, and overdue handling. Start with the user-level request, without telling the agent to use an umbrella; assess whether it discovers and proposes vertical outcomes. The cohesive control is a narrowly bounded enhancement with several acceptance criteria that belongs in one design. Scripted human replies answer clarification questions and approve only the agreed gates; deviations from the scenario protocol are recorded, not secretly coached away.

Run three independent trials per version for the two initial scenarios. Run the full bounded lifecycle for both versions, resuming from saved artifacts in a fresh context. Hold model configuration, tools, fixture commits, and human answers constant where the compared workflow permits. Evaluate submitted artifacts and trace evidence against the predeclared rubric. If behavior differs enough that an identical reply is inapplicable, report the divergence rather than injecting a helpful answer into only one condition.

### Deterministic tests

Run the actual Python helpers from automated tests, with fixture documents and real temporary Git histories. Cover malformed structures, trivial/non-trivial formats, multiple requirement spans, paths with spaces, unrelated cwd, missing files/revisions, and packet failure without partial replacement. Preserve the existing guard and cross-skill semantic contract tests. Update wording pins to assert the relevant installed resource and its behavior; do not weaken them into keyword checks.

Use package-content checks to verify references/scripts ship, plus copied-skill fixtures to verify each new filesystem dependency remains local. Run the full `npm run check` gate; there is no new build step. Behavioral evaluations are explicit, potentially costly gates rather than hidden network work inside ordinary unit tests.

### Results and interpretation

Report correctness per scenario and trial, critical failures individually, and complete-run usage per condition. Include input/output totals, cached input separately when available, and reference/helper accesses. File-size reductions are descriptive only. Three runs establish initial evidence, not statistical certainty or universal model compatibility. Claim improved correctness only for properties the evidence supports; preserve failures and limitations in the report.

## Feature acceptance

- Given an agent installed with only the refactored skill and its local resources, When it receives a large equipment-loan requirement and the human approves the proposed vertical-slice umbrella, Then it writes the roster and only the first slice's design, validates its structure, executes that slice with the existing gates, and routes to brainstorming for the next slice rather than finalization.
- Given that umbrella after first-slice implementation and a fresh agent context, When the next slice is brainstormed and executed, Then its design uses the implemented code, required references and helpers are used at the correct points, incomplete-umbrella finalization is blocked, and completed-umbrella finalization preserves the human ship and disposal decisions.
- Given fixed baseline and candidate skill packages, matched repeated scenarios, and completed lifecycle rehearsals, When the evidence is assessed, Then the candidate has no observed critical workflow failures, preserves the stated intention and mechanical contracts, and demonstrates lower complete-run token use in the compared ordinary-path scenarios. Mixed results, missing metrics, or unresolved baseline defects are reported explicitly rather than converted into an unsupported improvement claim.

### Feature review: auto
