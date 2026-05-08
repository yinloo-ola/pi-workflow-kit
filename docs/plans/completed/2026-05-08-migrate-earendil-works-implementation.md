# Implementation Plan: Migrate from @mariozechner to @earendil-works

## Task 1: Update package scope and clean up peer dependencies

<!-- tdd: trivial -->
<!-- checkpoint: done -->

Migrate the sole import and peerDependencies from `@mariozechner/*` to `@earendil-works/pi-coding-agent`, dropping the two unused deps (`pi-ai`, `pi-tui`).

### Files to modify

1. **`extensions/workflow-guard.ts`** — line 2:

```diff
-import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
+import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
```

2. **`package.json`** — `peerDependencies`:

```diff
 "peerDependencies": {
-    "@mariozechner/pi-ai": "*",
-    "@mariozechner/pi-coding-agent": "*",
-    "@mariozechner/pi-tui": "*",
+    "@earendil-works/pi-coding-agent": "*",
     "@sinclair/typebox": "*"
 },
```

### Verify

```bash
grep -r "@mariozechner" extensions/ package.json
# Expected: no output

npm run check
# Expected: passes (lint + tests)
```

### Commit

```
chore: migrate from @mariozechner to @earendil-works, drop unused peer deps
```
