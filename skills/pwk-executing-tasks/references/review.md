# Review mechanics and packet helper

Read before any review, packet refresh, or digest write.

## Assemble evidence

**Assemble the review packet first** — once, by script, so that no packet byte passes through model output. The Commit column fixes both spans: feature base = `git rev-parse <first Commit-column entry>^`, the parent of the first recorded commit; a requirement packet spans the previous requirement's last commit (exclusive) to this one's last commit (inclusive), R1's exclusive bound being its own parent. No `merge-base` guessing. Commits landing mid-review → re-run the recipe before spawning a replacement role, so the packet matches HEAD:

Use the installed skill directory, not a repository checkout; a missing runtime or helper (`python3 --version` ≥ 3.9) → report it and stop, with no auto-install or fallback.

```sh
python3 "<executing-skill-dir>/scripts/build-review-packet.py" \
  --project "<repo-root>" \
  --design "docs/plans/<date>-<topic>/<leaf>-design.md" \
  --progress "docs/plans/<date>-<topic>/<leaf>-progress.md" \
  --scope feature
```

For an opt-in requirement review, the same invocation with `--scope requirement --requirement 2` (substitute the number): destination `<leaf>-review-packet-r<N>.md`, versus the feature packet's `<design doc's directory>/<leaf>-review-packet.md`. Requirement-suffixed packets never overwrite each other or the feature packet.

`--project` resolves from the caller's cwd and must name the Git worktree root; design/progress paths are absolute or relative to it and must be matched leaf files in one active `docs/plans/<topic>/` folder. The helper derives the destination and refuses a symlink; to pass arguments programmatically, use a list, never shell interpolation.

The packet retains, in order: `## Commits`, `## Changed files`, `## Acceptance criteria (verbatim from the design doc)`, `## Feature acceptance (verbatim)` (empty for a trivial design), `## Production-risk notes (verbatim, if any)`, `## Diff`.

Criteria and production-risk content stay verbatim, including every line of multiple risk blocks; a fenced template heading never routes extraction. Feature criteria span from the first real requirement to Feature acceptance (or document end); a requirement packet covers only its own block, keeping design-level production-risk areas as context. The helper excludes generated `*-review-packet*.md` files from diff/stat, including committed packets.

A Commit cell is one immutable hexadecimal ID or an ordered whitespace-separated list — preserve the first ID, append review-fix IDs in order. Only terminal failed/skipped rows may lack a commit, and requirement assembly never guesses a bound across such a row. Anything missing, malformed, or non-ancestral → correct the record from evidence and rerun. The helper never edits progress, commits, or approves, replacing a packet only after all parse/Git work succeeds. A nonzero exit is failure, not evidence: report stderr and stop delegation.

After late fixes, commit, append the IDs to the selected row, and refresh the packet; feature packets refresh HEAD automatically. Re-run the helper before any replacement reviewer, and before digest writing if stale or missing. Then re-green the full suite + E2E and finish the checkpoint.

## Delegate or review inline

- **`parallel`** (the `auto` resolution when risk content is present) — request the host's `parallel-review` capability for four fresh-context, read-only roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, `pwk-hazard-reviewer`. Spawn each with a **one-liner** pointing at the packet file, role framing last — the checklist name (`spec alignment`, `code tracing`, `code smells`, `production hazards`), e.g. `Read docs/plans/<date>-<topic>/<leaf>-review-packet.md. Your role: spec alignment.` The packet never appears in spawn arguments. Require independent execution and one collected outcome per role; the contracts live in `agents/pwk-*-reviewer.md`. Reviewers only report — you apply smell fixes (full suite + E2E green, commit) and flag trace/spec/hazard findings for the human.
- **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
- **Fallback** — no compatible parallel-review capability, unprovable read-only/fresh-context/bounded constraints, or failed delegation → perform the missing review work inline. Retain successful delegated reports; never mark the feature fully reviewed while a required role is missing.
