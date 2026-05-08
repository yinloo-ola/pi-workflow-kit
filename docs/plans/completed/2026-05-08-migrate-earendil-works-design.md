# Migrate from @mariozechner to @earendil-works

## Context

pi has moved from `@mariozechner` to `@earendil-works` on GitHub and npm. The old `@mariozechner/pi-coding-agent@0.73.1` is deprecated. This package has two unused peer deps (`pi-ai`, `pi-tui`) that should be cleaned up.

## Changes

### 1. `extensions/workflow-guard.ts` — update import

```diff
-import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
+import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
```

### 2. `package.json` — update peerDependencies

```diff
 "peerDependencies": {
-    "@mariozechner/pi-ai": "*",
-    "@mariozechner/pi-coding-agent": "*",
-    "@mariozechner/pi-tui": "*",
+    "@earendil-works/pi-coding-agent": "*",
     "@sinclair/typebox": "*"
 },
```

- Rename `pi-coding-agent` to `@earendil-works/pi-coding-agent`
- Remove `@mariozechner/pi-ai` (unused)
- Remove `@mariozechner/pi-tui` (unused)

## Verification

- `ExtensionAPI` is exported identically from both old and new packages (same export map, same `.d.ts` path)
- No other imports from `@mariozechner/*` exist in the codebase

## Impact

Users on old `@mariozechner/pi-coding-agent` will get a peer dependency resolution error — they must update pi. The old package is explicitly deprecated pointing to the new one.
