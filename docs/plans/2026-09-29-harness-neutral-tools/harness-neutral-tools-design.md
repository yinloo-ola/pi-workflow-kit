# Design: harness-neutral tool phrasing

## At a glance

The pwk kit claims harness-neutrality for delegation but still prescribes concrete tools (shell recipes, mandated fenced bash) in the operational prose of its skills and role contracts, which out-shouts better tools a host may offer (e.g. a sandboxed batch executor). Recon shows the kit is already ~80% migrated to invariant phrasing; this feature finishes it: a canonical tool-freedom clause in all six skills, invariant reframes over finalizing's disposal blocks, a floor-not-prescription line in all five role contracts, and a lint rule that keeps prescriptions from coming back.

**Key decisions**
- Canonical clause (one sentence, byte-identical) asserted in all six SKILL.md — per-skill wording would drift and defeat the marker.
- Invariant + canonical example for disposal blocks; commands unchanged, anchors stay green — determinism comes from the invariant's precision, not from mandating bash. (rejected: full rewrite including git/helper sites — git has no alternative tool to invite and helper determinism is the feature)
- Role prose gets a floor line; the `tools:` frontmatter stays a concrete grant list — providers need concrete grants; generic values there are meaningless. (rejected: genericize the frontmatter)
- Allowlist + framing sweep in skill-lint — the clause alone has no regression protection. (rejected: clause-only)
- Guard-bypass interaction (sandbox tools' inner writes invisible to the phase guard) is recorded as a risk and deliberately out of scope — bundling guard payload inspection makes this two features. (rejected: bundle it)

| R# | Requirement in one line | Risk |
|---|---|---|
| R1 | Identical tool-freedom clause in all six SKILL.md, pinned by a canonical marker | — |
| R2 | Finalizing disposal blocks reframed as invariant sentence + canonical example, commands unchanged | — |
| R3 | Floor-not-prescription line in all five role contracts, reviewers byte-identical | — |
| R4 | skill-lint sweep: every command framed or sanctioned, with tests | — |

## Requirements

### R1: Tool-freedom clause in all six skills
The identical tool-freedom clause appears after the intro paragraph of each of the six `skills/pwk-*/SKILL.md`, and `tests/markers.mjs` exports a `toolFreedom` marker (a canonical fragment of the clause) asserted against all six by skill-lint.

**Acceptance criteria**
- Given the shipped kit, When skill-lint runs, Then all six SKILL.md match the `toolFreedom` marker.
- Given the clause text, When the six skills are compared, Then the clause is byte-identical across all six.
- Given one skill with the clause removed, When skill-lint runs, Then it fails naming that file.
- Given the clause, When a host offers a superior tool for an operation (e.g. a sandboxed executor), Then the clause's wording licenses using it, with examples demoted to fallbacks and kit helpers + git named as exact exceptions.

### Checkpoints: none
### Review: skip

### R2: Disposal blocks reframed as invariant + canonical example
Each fenced bash block in `skills/pwk-finalizing/SKILL.md`'s disposal sections is preceded by an invariant sentence stating the outcome (the topic folder is the disposal unit — delete it entirely / move it whole into `completed/` and verify the destination, any single operation achieving exactly this), with the existing commands kept as the canonical example; a `disposalInvariant` marker pins the sentence.

**Acceptance criteria**
- Given the disposal sections, When read, Then every fenced bash block is preceded by a sentence matching the `disposalInvariant` marker.
- Given the disposal commands, When the `DISPOSAL_ANCHORS` test runs, Then it stays green — the commands are unchanged.
- Given the invariant sentence, When an executor satisfies it with a single non-bash operation achieving exactly the stated outcome, Then the disposal is correct — the phrasing permits it.
- Given the reframe, When the destructive-safety property is considered, Then the invariant names the exact folder unit and verification step, so precision is preserved without mandating bash.

### Checkpoints: none
### Review: skip

### R3: Floor-not-prescription line in five role contracts
All five `agents/pwk-*.md` role contracts carry one identical sentence reading the `tools:` frontmatter ("The `tools:` frontmatter is the minimum grant requested of the delegation provider, not a prescription — use any tool your host actually grants."), placed inside the four reviewers' byte-identical shared conduct block (and the same line in the recon-scout contract), so the byte-identity test stays green.

**Acceptance criteria**
- Given the four reviewer contracts, When compared after the edit, Then they remain byte-identical including the new line.
- Given each of the five contracts, When read, Then the floor-not-prescription line appears in the conduct/tools area.
- Given the recon-scout contract, When inspected, Then it carries the same sentence as the reviewers.

### Checkpoints: none
### Review: skip

### R4: Prescription sweep in skill-lint
`tests/skill-lint.mjs` gains a sweep pass over its existing `contractContent` (SKILL.md + references + script docstrings): every inline-code command or fenced bash block must either match the sanctioned allowlist (`^git`, `^gh`, `scripts/`, `npm run check|test`, the disposal anchors, the pinned shared sentences) or sit in a sentence containing a framing marker (`e.g.`, `equivalent`, `one example`, `whatever`, `your harness`); violations fail naming file and command.

**Acceptance criteria**
- Given the shipped kit content after R1–R3, When the sweep runs, Then it passes with zero violations.
- Given a cloned skill's contractContent with an injected bare prescription (an unframed `rm foo.txt` imperative), When the sweep runs, Then it fails naming the file and the command.
- Given a command that is sanctioned or sits in a framed sentence, When the sweep runs, Then it passes.
- Given a straggler command the recon inventory missed, When the sweep first runs, Then it fails loudly and the fix is framing the site or deliberately allowlisting it — never a silent exemption.

### Checkpoints: none
### Review: skip

## Approaches considered

- **A (chosen): canonical clause + surgical reframes + allowlist lint.** Proportionate to the actual remaining surface (recon: most sites already invariant-framed); every existing pin stays green; the lint makes the policy durable.
- **B: full invariant-first rewrite (rejected).** Would also convert git/helper sites to "e.g." framing and weaken pins to invariant strings. Git has no alternative tool to invite — there is nothing to out-shout; helper determinism is a feature (the validator must run exactly); churns 8+ pinned tests for zero portability gain.
- **C: clause-only, no lint (rejected).** No regression protection — the next skill edit silently reintroduces prescriptions; disposal would still mandate bash. The human explicitly chose test-first enforcement.

## Architecture

Four layers: a **policy layer** (the clause — operations are outcomes, examples are fallbacks, kit helpers + git are exact artifact calls), a **reframe layer** (disposal invariants), a **role layer** (floor line reading `tools:` as a grant floor), and an **enforcement layer** (the sweep). The enforcement layer is what turns a one-time content pass into a standing property: any future command in skill content must declare its invariant or join the sanctioned allowlist deliberately.

## Components

| File | Change |
|---|---|
| `tests/markers.mjs` | Export `toolFreedom` (canonical clause fragment) and `disposalInvariant` markers |
| `skills/pwk-{brainstorming,executing-tasks,finalizing,code-review,walkthrough,status}/SKILL.md` | The identical clause, after the intro paragraph |
| `skills/pwk-finalizing/SKILL.md` | Invariant sentence above each disposal fence; commands unchanged |
| `agents/pwk-{spec,tracing,smell,hazard}-reviewer.md` | Identical floor line in the shared conduct block |
| `agents/pwk-recon-scout.md` | The same floor line |
| `tests/skill-lint.mjs` | The sweep pass: `SANCTIONED` allowlist + `FRAMED` sentence markers, over `contractContent` |
| `CHANGELOG.md` | 2.8.0 entry |

## Data flow

`contractContent` (per skill, already concatenated by skill-lint) → extract inline-code spans and fenced bash blocks → for each: sanctioned? pass : framed? pass : fail with file + command. The allowlist is exactly the pinned/trusted set — adding a new sanctioned command means adding a pin, which is the gate working as intended.

## Error handling

- **Straggler sites** the recon inventory missed surface as sweep failures at execution time; the fix is framing or deliberate allowlisting, never a silent exemption.
- **False positives** (an already-framed command failing the sweep) indicate a framing-marker gap in the rule — fix the rule, not the content.
- **Known interaction risk (out of scope, recorded):** the clause invites sandbox tools whose inner writes bypass the design-phase guard (it inspects only top-level `write`/`edit`/`bash`). A later topic can teach the guard to inspect sandbox-execution payloads; this feature deliberately does not.

## Testing

Marker assertions (clause ×6, disposal invariant, reviewer byte-identity, `DISPOSAL_ANCHORS`) plus new sweep unit tests (sanctioned pass, framed pass, injected bare prescription fails). The feature gate is an end-to-end sweep run, per `## Feature acceptance`.

## Feature acceptance

- Given the shipped kit with the clause ×6, disposal invariants, floor lines ×5, and the sweep in place, When the full suite (`npm run check`) runs, Then everything passes with zero unframed, unsanctioned commands in skill content.
- Given a copy of the kit where an editor has reintroduced a bare tool prescription into any skill's content, When skill-lint runs, Then the sweep fails and names the offending file and command.

### Feature review: auto
