# Authoring tools

Repo-internal helpers for a pass over the kit's own skill text. They read the pinned-phrase pool from `tests/markers.mjs`, `tests/skill-lint.mjs`, and every top-level test file that names `skills/` — which is why they live in this subdirectory rather than at the `tests/` root: the pool they harvest must not include themselves.

Run each from the repository root:

```sh
node tests/tools/pins-for.mjs <skill-file>          # pinned phrases one file carries, plus its longest free-prose lines
node tests/tools/pins-lost.mjs <skill-file>         # pinned phrases HEAD carried that the working tree no longer does
node tests/tools/free-lines.mjs <skill-file>        # per-line free-prose map for one file
node tests/tools/pin-census.mjs                     # per-file pinned/free/slack census across skills/, and the pool size
node tests/tools/intra-file-repeat.mjs              # >=12-word sentences a file repeats inside itself
```

These are measurement tools, not gates: nothing in `npm run check` runs them, and they are not shipped in the package (`tests/` is excluded). The gates that hold the result are `skill-lint`'s word-budget check and the feature E2E.

Relocated here from `docs/plans/2026-10-14-skill-slimming-2/` during that topic's finalize, byte-identical and verified by comparing their output against the originals on the same corpus.
