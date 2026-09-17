# Review mechanics and packet helper

Read before any feature or opt-in requirement review, before refreshing a packet, and before writing the code digest from review evidence.

## Assemble evidence

**Assemble the review packet first** — once, by script, so that no packet byte passes through model output (spawn arguments are model output; file reads are not). The Commit column is the packet's source of truth for both spans: the feature packet base is `git rev-parse <first Commit-column entry>^` (the parent of the first recorded commit); a per-requirement packet spans from the previous requirement's last commit (exclusive) to this requirement's last commit (inclusive), with R1's exclusive bound being its own parent. No `merge-base` guessing, no default-branch knowledge. If commits land while the review is in flight, re-run the recipe before spawning any replacement role so the packet matches HEAD:

Use the installed skill directory, not a repository checkout of the kit. First verify `python3 --version` reports Python 3.9 or newer and that the helper exists. Missing runtime/resource → report the dependency and stop this step. No runtime auto-install or alternate-language fallback.

```sh
python3 "<executing-skill-dir>/scripts/build-review-packet.py" \
  --project "<repo-root>" \
  --design "docs/plans/<date>-<topic>/<leaf>-design.md" \
  --progress "docs/plans/<date>-<topic>/<leaf>-progress.md" \
  --scope feature
```

For an opt-in requirement review, use the same invocation with `--scope requirement --requirement 2` (substitute the selected number). The feature destination is `<design doc's directory>/<leaf>-review-packet.md`; the requirement destination is `<design doc's directory>/<leaf>-review-packet-r<N>.md`. Requirement-suffixed packets never overwrite each other or the feature packet.

`--project` resolves from the caller's cwd and must name the Git worktree root. Design/progress arguments are absolute or relative to that project, regardless of the current directory or installed skill location. Both must be matched leaf files inside one active `docs/plans/<topic>/` folder. The helper derives the destination; symlink destinations are refused. Use argument lists in programmatic invocations, never shell interpolation.

The packet retains these sections, in order:
- `## Commits`
- `## Changed files`
- `## Acceptance criteria (verbatim from the design doc)`
- `## Feature acceptance (verbatim)` (empty for a trivial design)
- `## Production-risk notes (verbatim, if any)`
- `## Diff`

Criteria and production-risk content remain verbatim, including all lines in multiple risk blocks; fenced template headings do not route extraction. Feature criteria span from the first real requirement to Feature acceptance (or document end); requirement criteria include only the selected requirement block. Design-level production-risk areas are retained as review context. The packet header records fixed `Base:` and `Head:` IDs: feature uses the first recorded commit's parent through current HEAD; requirement uses the previous requirement's last recorded commit exclusively through the selected last recorded commit inclusively. The helper excludes generated `*-review-packet*.md` files from diff/stat, including committed packets.

A Commit cell is one immutable hexadecimal ID or an ordered whitespace-separated list. Preserve the first ID; append review-fix IDs in order. Feature assembly permits missing commits only for terminal failed/skipped rows. Requirement assembly needs an explicit selected and previous bound; it refuses to guess across a failed/skipped row without a commit. Missing relevant rows, malformed/ambiguous entries, invalid revisions, or non-ancestral order → correct the record from evidence and rerun. The helper never edits progress, commits, switches branches, or marks anything approved. It finishes all parse/Git work before atomically replacing a complete packet. A nonzero exit is failure, not review evidence: report stderr and stop delegation; an older packet remains intact but may be stale.

After late review fixes, commit them and append their IDs to the selected row before refreshing a requirement packet; feature packets refresh HEAD automatically. Re-run the helper before any replacement reviewer and before digest writing if stale or missing. Packet generation is evidence assembly, not review approval. Re-green the full suite + E2E after fixes, then complete review and the human checkpoint.

## Delegate or review inline

- **`parallel`** (the `auto` resolution when risk content is present) — request the host’s `parallel-review` capability for four fresh-context, read-only logical roles: `pwk-spec-reviewer`, `pwk-tracing-reviewer`, `pwk-smell-reviewer`, and `pwk-hazard-reviewer`. Spawn each role with a **one-liner** — a pointer to the packet file with the role framing appended last: the checklist name of the role (`spec alignment`, `code tracing`, `code smells`, or `production hazards`). For example: `Read docs/plans/<date>-<topic>/<leaf>-review-packet.md. Your role: spec alignment.` The packet never appears in spawn arguments. Require independent execution and one collected outcome per role. The reviewer role contracts live in `agents/pwk-*-reviewer.md`; do not duplicate their checklists in the workflow instructions. Reviewers are read-only reporters; you apply smell fixes yourself (full suite + E2E must stay green, commit) and flag trace/spec/hazard findings as follow-ups for the human.

- **`inline`** — perform `/skill:pwk-code-review` over the whole diff as a single pass.
- **Fallback** — if the host has no compatible parallel-review capability, cannot prove the requested read-only/fresh-context/bounded constraints, or delegation fails, perform the missing review work inline. Retain successful delegated reports and do not mark the feature fully reviewed while a required role is missing.
