# Review packet: 2026-01-01-fixture — feature review

Base: 80dcf1e7848130c554f91e5976bc234b6146f1bd

Head: 85d1711de42fb64c6d4f5c03afb89b54c1d8416f

## Commits

85d1711 feat: the tiny behaviour
b6c2345 docs: add design doc

## Changed files

 docs/plans/2026-01-01-fixture/fixture-design.md   | 26 ++++++++++++++++++++++
 docs/plans/2026-01-01-fixture/fixture-progress.md | 27 +++++++++++++++++++++++
 src/index.mjs                                     |  2 +-
 3 files changed, 54 insertions(+), 1 deletion(-)

## Acceptance criteria (verbatim from the design doc)

### R1: A tiny behaviour
A caller gets a value.

**Acceptance criteria**
- Given an input, When it is processed, Then the result is returned.

### Checkpoints: none
### Review: skip


## Feature acceptance (verbatim)

## Feature acceptance

- Given an input, When it is processed, Then the result is returned.


## Production-risk notes (verbatim, if any)


## Diff

diff --git a/docs/plans/2026-01-01-fixture/fixture-design.md b/docs/plans/2026-01-01-fixture/fixture-design.md
new file mode 100644
index 0000000..51abeb2
--- /dev/null
+++ b/docs/plans/2026-01-01-fixture/fixture-design.md
@@ -0,0 +1,26 @@
+# Design: Fixture
+
+## At a glance
+
+A fixture design for the packet golden.
+
+| R# | Requirement in one line | Risk |
+|---|-------------------------|------|
+| 1 | A tiny behaviour | — |
+
+## Requirements
+
+### R1: A tiny behaviour
+A caller gets a value.
+
+**Acceptance criteria**
+- Given an input, When it is processed, Then the result is returned.
+
+### Checkpoints: none
+### Review: skip
+
+## Feature acceptance
+
+- Given an input, When it is processed, Then the result is returned.
+
+### Feature review: auto
diff --git a/docs/plans/2026-01-01-fixture/fixture-progress.md b/docs/plans/2026-01-01-fixture/fixture-progress.md
new file mode 100644
index 0000000..8cf4a8a
--- /dev/null
+++ b/docs/plans/2026-01-01-fixture/fixture-progress.md
@@ -0,0 +1,27 @@
+# Progress: fixture
+
+Design: docs/plans/2026-01-01-fixture/fixture-design.md
+
+Branch: fixture
+
+Setup: n/a
+
+Started: 2026-01-01T00:00:00Z
+
+Last updated: 2026-01-01T00:00:00Z
+
+Feature phase: done
+
+## Requirements
+| # | Done | Requirement | Per-req ceremony | Commit |
+|---|------|-------------|-----------------|--------|
+| 1 | ✅ | A tiny behaviour | — | b6c2345 |
+
+## Execution summary
+| R# | Requirement | How it was built | Deviated? | Evidence |
+|----|-------------|------------------|-----------|----------|
+| 1 | A tiny behaviour | It was built. | — | a test ran |
+
+## Deviation records
+
+## Code digest
diff --git a/src/index.mjs b/src/index.mjs
index efeee5d..44439d5 100644
--- a/src/index.mjs
+++ b/src/index.mjs
@@ -1 +1 @@
-export const value = 1;
+export const value = 2;

