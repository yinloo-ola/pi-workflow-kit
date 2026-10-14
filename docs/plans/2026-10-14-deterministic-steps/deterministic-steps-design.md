# Design: deterministic steps

## At a glance

Six agent sessions on one small task cost the same with a 30%-slimmer skill corpus as with the old one, because the tokens are spent re-reading context turn after turn, not reading prose. What the sessions did show is where turns are wasted: every one of them hand-edited a progress table, every one shipped an untracked test file it later caught, and the same capability check was guessed rather than made. This topic turns those repeat steps into dependency-free Node helpers the workflow calls, and retires Python so the kit has one runtime.

**Key decisions**
- **Scripts write, not advise.** A helper performs the edit rather than printing a patch for the agent to apply, because the observed failures were hand edits (rejected: print-a-patch, lint-only detection).
- **Section extraction, not pointer nudging.** An anchor in a link does not stop an agent from reading a whole file, so a helper prints exactly the anchored section (rejected: anchor lint alone; physical file splitting).
- **One runtime.** New helpers are Node, and the two Python helpers convert to Node with byte-identical output as the acceptance evidence (rejected: leaving two runtimes).
- **No `--force`.** A guard that exists to stop a slip carries no bypass; the human still has `git` and can act visibly.
- **Authoring tools are repo-only.** The pin checkers move into `tests/`, which the npm tarball excludes, rather than shipping measurement code no host needs.

| R# | Requirement in one line | Risk |
|---|-------------------------|------|
| 1 | One Node helper performs every structural progress-file write | — |
| 2 | A section-extracting helper plus an anchor-resolving lint replace whole-file reference reads | — |
| 3 | A tree-cleanliness helper gates the review and ship steps | — |
| 4 | The recon step must enumerate available capabilities before declaring one missing | — |
| 5 | The pin checkers move from the disposable plan folder into `tests/` | — |
| 6 | Both Python helpers become dependency-free Node scripts with identical results | — |

## Requirements

### R1: Scripted progress-file writes
A single Node helper performs every structural edit to a progress file — the phase line, the setup slot, a requirement row's done cell and commit, and execution-summary content — so no agent rewrites the table by hand.

**Acceptance criteria**
- Given a conforming progress file, When the helper sets the phase to a vocabulary value, Then the `Feature phase:` line reads that value, `Last updated` is refreshed, and no other byte of the file changes.
- Given the same file, When the helper sets row 2's done cell and commit, Then only row 2's Done and Commit cells change.
- Given a row already holding two commit IDs, When a third is set, Then the existing IDs stay in order and the new ID is appended last.
- Given a table with a missing requirement row or a row with a missing cell, When any write runs, Then it exits non-zero naming the file and the fault, and the file is unchanged.
- Given an unknown phase value, or an `implementing (k/N)` whose k exceeds N, When the phase is set, Then it exits non-zero naming the accepted vocabulary.
- Given a requirement with no execution-summary row yet, When the helper appends one with prose arguments, Then the row holds that text verbatim and any `|` inside it is escaped so the table does not break.
- Given a requirement whose execution-summary row already exists, When it is appended again, Then it exits non-zero rather than overwriting.

### Checkpoints: none
### Review: skip

### R2: Section-scoped reference reads and an anchor-resolving lint
A helper prints exactly the anchored section of a reference file so a step loads that section instead of the whole file, and `skill-lint` fails any reference pointer whose file or anchor does not resolve.

**Acceptance criteria**
- Given a reference file and an anchor naming a heading, When the helper runs, Then it prints from that heading to the next heading of the same or higher level, verbatim, and exits 0.
- Given an anchor matching no heading, When the helper runs, Then it exits non-zero naming the anchor and listing the headings the file does offer.
- Given a path that does not exist, When the helper runs, Then it exits non-zero naming the path.
- Given the skill corpus, When `skill-lint` runs, Then every `[text](references/<file>.md[#anchor])` in a SKILL.md resolves — the file exists and the anchor matches a heading under the slug rule (lowercase, spaces to dashes, punctuation dropped) — and any miss fails naming the pointer, the file, and the anchor.
- Given the executing-tasks SKILL.md after this requirement, When its reference pointers are read, Then each names the section its step needs rather than the whole file.

### Checkpoints: none
### Review: skip

### R3: The reviewed diff is the shipped diff
A helper fails when the working tree holds untracked or modified files outside `docs/plans/`, and both the review and the ship step run it before proceeding.

**Acceptance criteria**
- Given a tree with no changes, When the helper runs, Then it exits 0.
- Given an untracked file outside `docs/plans/`, When it runs, Then it exits non-zero and prints that path.
- Given a modified tracked file outside `docs/plans/`, When it runs, Then it exits non-zero and prints that path.
- Given untracked or modified files only under `docs/plans/`, When it runs, Then it exits 0 — the topic folder is legitimately dirty while a step is in flight.
- Given the executing-tasks SKILL.md after this requirement, When the packet-assembly step and the ship checkpoint are read, Then each instructs running the helper and stopping on a non-zero exit.

### Checkpoints: none
### Review: skip

### R4: Enumerated capability checks
The recon step must enumerate what the session actually grants before any unavailability report, so a missing capability is a recorded result rather than a guess.

**Acceptance criteria**
- Given the brainstorming SKILL.md after this requirement, When its recon step is read, Then it requires enumerating the session's available tools and roles before any `Scout: unavailable` line, names what was found, and gives both a batch-executor form and a plain fallback.
- Given that text, When `skill-lint` runs, Then the unavailability phrase is accompanied by the enumeration instruction in the same step, and a version lacking it fails.
- Given a session whose enumerated tools include no delegation capability, When the step is followed, Then the recorded recon line states the enumeration result and reports the capability missing — as the six recorded probe sessions did.

### Checkpoints: none
### Review: skip

### R5: The pin checkers live in the repo
The pin-loss and corpus-census checkers move out of the disposable topic folder into `tests/`, so the next slimming pass reuses them instead of rebuilding them.

**Acceptance criteria**
- Given a skill markdown file and a named revision, When the pin checker runs, Then it reports the pinned phrases present and lost for that file.
- Given a file that lost a pinned phrase against that revision, When it runs, Then it exits non-zero naming the phrase.
- Given a revision that does not resolve, When it runs, Then it exits non-zero naming the revision.

(amended 2026-10-14, human decision Option 1: the relocation criteria — checkers under `tests/`, no measurement script in `docs/plans/`, absent from the packed tarball — were delivered by the skill-slimming-2 finalize, which moved them to `tests/tools/` byte-identically. R5 narrows to the two refinements above.)

### Checkpoints: none
### Review: skip

### R6: One runtime for the helpers
Both Python helpers become dependency-free Node scripts with identical results, and the Python prerequisite retires from the kit.

**Acceptance criteria**
- Given the design-validator fixtures (a valid doc and one per structural fault), When the Node validator runs, Then its exit code and diagnostics match the Python validator's on the same inputs.
- Given a repository state, When the Node packet helper builds a packet, Then the result is byte-identical to the packet the Python helper builds for the same state.
- Given the skills, docs, and AGENTS.md after this requirement, When they are searched for a Python invocation or prerequisite, Then none remains — the frozen probe transcripts under `tests/evals/skill-slimming/runs/` are exempt as historical evidence.
- Given the scripts directory, When it is listed, Then the Python files are gone and no test invokes a Python interpreter.
- Given `npm run check`, When it runs after the conversion, Then it is green.

### Checkpoints: full
### Review: parallel

## Architecture

Four new Node scripts, no dependencies, each invoked by name from skill text exactly as the Python helpers are today (`node "<skill-dir>/scripts/<helper>.mjs" <args>`):

| Helper | Owner | Purpose |
|---|---|---|
| `progress.mjs` | pwk-executing-tasks | the only writer of structural progress-file slots |
| `ref.mjs` | pwk-executing-tasks | prints one anchored section of a reference file |
| `stage-check.mjs` | pwk-executing-tasks | fails when the tree has changes outside `docs/plans/` |
| `validate-design.mjs` | pwk-brainstorming | the Python validator, ported |
| `build-review-packet.mjs` | pwk-executing-tasks | the Python packet helper, ported |

`ref.mjs` lives with the skill whose references it serves. That is pwk-executing-tasks, whose three reference files carry the measured weight; pwk-brainstorming keeps whole-file reads because its two references are small.

## Data flow

- **Progress**: skill step -> `progress.mjs <subcommand>` -> parse the table -> rewrite the one affected slot plus `Last updated` -> atomic replace -> exit code. On any parse fault the file is untouched.
- **Reference read**: skill step -> `ref.mjs <file>#<anchor>` -> locate the heading -> print to the next same-or-higher heading -> the agent reads the section, not the file.
- **Staging**: review assembly and the ship checkpoint -> `stage-check.mjs` -> `git status --porcelain` -> paths outside `docs/plans/` fail.
- **Review packet**: unchanged in shape; only its runtime changes in R6.

## Error handling

Every helper exits non-zero with a one-line diagnostic naming the file, value, or path at fault, and none writes partially. There is no bypass flag: a guard created because a step was repeatedly skipped does not carry an escape hatch, and the human's `git` remains the visible override. A helper that cannot run its prerequisite (an absent `git`, an unparseable table) reports that and stops rather than degrading to a guess.

## Testing

Each helper gets a per-slice test over its own edge cases — malformed tables, dangling anchors, the `docs/plans/` allowlist boundary, byte-identical packet output. The anchor check and the recon-text check become `skill-lint` checks, so they run in the kit copy the feature E2E already builds. The feature E2E gains three scenarios: a progress round-trip on a kit copy, a dangling-anchor lint failure, and a staging failure on a dirty tree. The R6 conversion is proven by golden comparison, not by a green suite alone.

## Approaches considered

**R1 — script writes the table versus printing a patch versus lint-only detection.** Script-writes won: the recorded failures were hand edits (three of six sessions hit an edit-mismatch or a malformed write), and both alternatives leave the edit in the agent's hands. Lint-only detects the damage after the fact.

**R2 — anchor lint alone versus an extraction helper versus splitting the files.** The measured cost is context volume, and a pointer with an anchor still permits a whole-file read, so the helper (which makes the small read the easy read) won, with the lint keeping pointers honest. Splitting the reference files physically was rejected: it multiplies files, budget rows, and pointer maintenance for the same bytes.

**R3 — standalone helper versus folding it into the packet helper versus a lint check.** Standalone won because the rule has two call sites (packet assembly and the ship checkpoint) and folding it into the packet helper would leave the ship step unguarded; a lint check cannot see the working tree.

**R4 — an enumeration instruction versus a capability manifest versus nothing.** The instruction won: the six probe sessions showed the unavailability report was *accurate* (their isolated environments had no delegation tool), but it was reached without a check, so the same wording would report wrongly in a session that does have one. A manifest file was rejected as a second source of truth that drifts from the host's actual tool set.

**R5 — `tests/` versus shipped scripts versus leaving them in the plan folder.** `tests/` won: they are repo-authoring tools for this corpus, so shipping them would add package weight for no host benefit, and leaving them in the plan folder deletes them at finalize — the failure mode that produced this requirement.

**R6 — port both helpers versus keep Python versus port only the validator.** Porting both won because the goal is one runtime and one invocation pattern; porting only the validator would leave the kit split for no benefit. The risk is real (the packet helper runs at every feature review) and is met with byte-identical output as the acceptance evidence rather than a green suite alone.

## Feature acceptance

- Given a kit copy and a fresh topic, When the executing flow's deterministic steps run, Then the progress file's phase, row, commit, and summary are written by the helper with no hand edit, and the staging helper reports a clean tree at both the packet-assembly and ship steps.
- Given the kit corpus, When `npm run check` runs, Then every reference pointer resolves, the recon step carries its enumeration instruction, and no Python interpreter is invoked.
- Given a skill markdown file inflated past its budget, When the lint runs, Then it still fails naming the file and its count, so the ratchet survives this work.
- Given a skill file whose pinned phrases are intact and one whose pinned phrase was dropped, When the relocated pin checker runs, Then it passes the first and fails the second naming the phrase.

### Feature review: auto
