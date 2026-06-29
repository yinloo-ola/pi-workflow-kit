# Verification Report: pi-topdown-kit (initial build)

**Date:** 2026-06-29
**Scope:** All 8 commits building `@tianhai/pi-topdown-kit` at `/Users/yinlootan/src/pi-topdown-kit` — 1 TS extension (`workflow-guard.ts`, 248 lines) + tests (37 cases) + 6 skill docs + README + PUBLISH runbook. 1694 insertions across 10 files.
**Reviewer:** AI verify skill (security + optimization + traceability), run from the planning repo (`pi-superpowers-plus`) against the new repo.

## Summary

| Pass | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| Security | 0 | 0 | 1 | 1 |
| Optimization | 0 | 1 | 1 | 1 |
| Traceability | 1 | 0 | 1 | 1 |
| **Total** | **1** | **1** | **3** | **3** |

**One Critical must fix before publish.** The rest are quality/polish.

---

## 🔴 Security Findings

### [S-001] Medium — Pipe-to-unknown-destructive bypass (inherited design limitation)

**Location:** `extensions/workflow-guard.ts:131-153` (`splitCompoundCommand` + `isSafeCommand`)

**Issue:** `splitCompoundCommand` splits on `&&`, `||`, `;` but deliberately NOT on `|` (to allow piping). `isSafeCommand` then evaluates each `;`/`&&`/`||`-delimited part as a unit: it passes if the part starts with a safe command AND contains no known destructive keyword anywhere. This means a piped sub-command that is destructive but whose verb isn't in `DESTRUCTIVE_PATTERNS` will slip through, because the whole `safe_cmd | unknown_evil` string starts with the safe verb and contains no flagged keyword.

Concrete shape (hypothetical, since the destructive list is broad): `cat README.md | ./evil_script` — starts with `cat` (safe), no flagged keyword → allowed.

**Why Medium not Critical:** (a) This is inherited verbatim from `pi-workflow-kit` and has shipped there for many releases without incident; (b) the destructive list is broad (covers `rm`, `mv`, `>`, `>>`, `sudo`, `npm install`, `git commit`, etc.), so most real escapes are caught; (c) the agent can't choose to run arbitrary user-supplied binaries during brainstorm/verify — it would have to invent a destructive verb not in the list. The residual risk is real but narrow.

**Fix:** No cheap fix within the allowlist model (you'd need a turing-complete shell parser to be sound). Options: (1) document the limitation in the README's guard section as a known boundary; (2) maintain a denylist of binary-invocation patterns (`\.\/`, `exec `, `eval `) to narrow the gap; (3) accept and rely on the destructive-keyword net. Recommend (1) + (2) at Low effort.

### [S-002] Low — `git config --get` allow narrows but `git config <other>` lands in a gap (inherited)

**Location:** `extensions/workflow-guard.ts:95` (`/^\s*git\s+(...|config\s+--get)/i`) vs the destructive git list at line 46.

**Issue:** SAFE allows only `git config --get`. DESTRUCTIVE blocks `git (add|commit|...|init|clone)` but NOT `git config` generically. So `git config user.email evil@x` (a write) is neither safe-flagged nor destructive-flagged → `!false && false` = blocked. That happens to be correct (blocked), but by accident rather than intent — the safety relies on the "must be explicitly safe" rule rather than on recognizing `git config` as mutating. A future edit that loosens the "must be safe" conjunction would silently expose it.

**Fix:** Add `config(?!\s+--get)` to the destructive git regex so the block is intentional, not accidental. Small effort. (Inherited from pwk; file a parallel fix there.)

---

## 🟡 Optimization Findings

### [O-001] P1 — Duplicated command-pattern lists across two maintained packages

**Location:** `extensions/workflow-guard.ts:23-57` (DESTRUCTIVE_PATTERNS) and `:59-125` (SAFE_PATTERNS) — byte-for-byte identical to `pi-workflow-kit/extensions/workflow-guard.ts`.

**Issue:** Two packages now maintained in parallel carry identical 100-line pattern arrays. The two `BUG: ...` tests at `tests/workflow-guard.test.ts:173-187` document known quote-handling bugs (`&&` inside quotes, `>` inside grep args). When one kit fixes these, the other won't get the fix automatically. This is the core maintenance cost of the "maintain both" decision from the design.

**Fix:** Not removable without collapsing the two packages (which the design rejected). Mitigate: (1) add a `CHANGELOG` or code comment in each guard pointing to the other as the canonical sibling so a fixer knows to port; (2) consider extracting the pattern lists to a tiny shared `@tianhai/pi-guard-patterns` package both depend on. Recommend (1) now (small), (2) if the duplication ever causes a divergent bug (defer).

### [O-002] Medium — Misleading variable name `prefix` for an exact-match comparison

**Location:** `extensions/workflow-guard.ts:180` — `if (UNLOCKING_SKILLS.some((prefix) => skill === prefix))`

**Issue:** The callback parameter is named `prefix` but is compared with `===` (exact equality), not as a string prefix. The comment two lines below explains the exact-match intent, but the name actively misleads a future reader toward thinking this is a prefix match (which would be a security bug — `/skill:ptk-scaffoldXYZ` would unlock). The test at `tests/workflow-guard.test.ts:251-254` exists precisely to guard against that misreading.

**Fix:** Rename `prefix` → `name` (or `skillName`). Trivial. Removes the need for the defensive comment and lowers the chance someone "simplifies" the `===` to `startsWith`.

### [O-003] Low — `getCurrentPhase()` exported, unused in-repo

**Location:** `extensions/workflow-guard.ts:196-198`

**Issue:** `getCurrentPhase()` is exported but never called by the extension or by any test in this repo. It exists in the pwk parent too. If it's intended as a debugging/introspection API for other extensions, that's fine but undocumented; if not, it's dead code.

**Fix:** Either (a) add a one-line doc comment stating it's a public introspection hook for debugging/other extensions, or (b) remove it. Recommend (a) since it's zero-cost and plausibly useful. Trivial.

---

## 🔵 Traceability Findings

### [T-001] Critical — The frontier grep `ptk-stub` does not match the stub call sites

**Entry point:** `skills/ptk-scaffold/SKILL.md:76,81,154` (and README:85) emit stubs as `return stub("auth.service.signup")`
**Call chain:** scaffold emits call site → execute greps frontier → verify checks frontier empty → finalize cleans up
**Broken at:** the grep ↔ call-site boundary. The documented stub call site is `stub("dotted.path")`. The documented frontier query (in **4 places**: `ptk-execute:29,32,35`, `ptk-verify:16`, `ptk-finalizing:8,17`, README:92-94) is `grep -rn "ptk-stub"`. **The literal string `ptk-stub` appears only in the helper's `throw new Error("[ptk-stub] …")` line — NOT in the `stub("…")` call sites.**

**Consequence (the kit's core mechanism breaks):**
- `ptk-execute` runs `grep -rn "ptk-stub"` → finds 1 line (the helper definition), regardless of how many stubs exist. It thinks the frontier is "1 stub" and either spins on the helper (which isn't fillable) or, once the helper is the only hit, declares done — having filled nothing.
- `ptk-verify` runs the same grep → sees the helper line → reports "1 stub still unfilled" even when every call site is filled. Refuses to proceed.
- `ptk-finalizing` runs the same grep → never sees empty (helper always matches) → either refuses to ship or requires manual override.

The kit's central invariant — "the frontier is grep-queryable, drift-free progress" — does not hold as documented. This breaks the whole scaffold→execute→verify→finalize loop.

**Note:** `ptk-execute:39` does mention `ast_search for stub("...") call nodes` as a fallback, which WOULD work. But it's framed as secondary/prefer-when-available, while the broken `grep ptk-stub` is primary and copy-pasted everywhere.

**Fix (pick one, small-to-medium effort):**
1. **Standardize on `ast_search` as primary.** Replace every `grep -rn "ptk-stub"` instruction with `ast_search stub("$$ARG")` (or equivalent). Keep grep as a secondary note. Cleanest because it's structural (zero false positives, which was the original design intent in the design doc).
2. **Fix the grep target.** Replace `grep -rn "ptk-stub"` with `grep -rn 'return stub('` (matches call sites) or `grep -rn '\bstub("'`. Cheaper, but more false-positive-prone (a comment mentioning `stub(` would match).
3. **Make the call site self-greppable.** Rename the helper so the function name contains `ptk-stub`, e.g. `ptkStub("…")`, and `grep ptkStub`. Loses the clean `stub()` name the design preferred.

**Recommend (1):** make `ast_search` the primary documented query everywhere, keep the `[ptk-stub]` error string as a runtime diagnostic (when an unfilled stub actually executes, the error clearly identifies it), and replace the `grep ptk-stub` instructions with `ast_search` for structural discovery + `grep 'stub('` as a commented fallback. Update all 4 files + README.

This is the only Critical. It must be fixed before the kit is used for real.

### [T-002] Medium — `ptk-diagnose` claims "works at any point" but inherits brainstorm/verify write block

**Location:** `skills/ptk-diagn/SKILL.md:3` (description: "Works at any point in the workflow — brainstorm, execute, or standalone") vs `extensions/workflow-guard.ts:155-161` (phase model: diagnose is not in `SKILL_TO_PHASE` nor `UNLOCKING_SKILLS`, so invoking it during a blocking phase leaves the block active).

**Issue:** If a user is in `brainstorm` or `verify` phase and invokes `/skill:ptk-diagnose` to debug something, the guard still blocks writes — diagnose cannot apply its Phase 5 fix (write a regression test + fix). The skill's description over-promises. Inherited verbatim from pwk-diagnose, but worth correcting here since we're catching it.

**Fix:** Either (a) soften the description to "Works at any point in the workflow; note that during brainstorm/verify phases, source writes are still blocked — finish the fix during execute" (small, honest); or (b) add `ptk-diagnose` to `UNLOCKING_SKILLS` so invoking it unlocks (small code change, but changes the security posture — a debug skill that unlocks could be abused to escape the block). Recommend (a).

### [T-003] Low — Scaffold checkpoint says "show `git diff`" but a fresh skeleton is untracked

**Location:** `skills/ptk-scaffold/SKILL.md:171` — "Run `git diff` (or `git status` + `git diff --cached` if you pre-staged)"

**Issue:** A brand-new skeleton's files are untracked, so plain `git diff` shows nothing. The skill does mention `git diff --cached` as the pre-staged alternative, but a reader following the primary instruction sees an empty diff and may be confused. (This is exactly the issue hit during this very build's Task 2 checkpoint.)

**Fix:** Reword to "Show the skeleton (files are new/untracked, so use `git add -N` + `git diff` OR `git diff --no-index /dev/null <file>` OR just show file contents). If you pre-staged with `git add`, use `git diff --cached`." Small.

---

## Remediation Task List

| ID | Priority | Finding | Estimated Effort |
|----|----------|---------|-----------------|
| T-001 | Critical | Frontier grep `ptk-stub` doesn't match `stub("…")` call sites — switch to `ast_search` primary | medium (4 files + README) |
| O-001 | P1 | Duplicated pattern lists across ptk/pwk — add cross-reference comment now, consider shared pkg later | small |
| O-002 | Medium | Rename misleading `prefix` var → `name` in `phaseForInput` | trivial |
| T-002 | Medium | `ptk-diagnose` "works at any point" over-promises vs guard — soften description | trivial |
| S-001 | Medium | Pipe-to-unknown-destructive bypass — document + add `\.\/`/`exec` denylist patterns | small |
| O-003 | Low | `getCurrentPhase()` unused — document as introspection hook or remove | trivial |
| S-002 | Low | `git config` (non-`--get`) lands in a gap — add to destructive list explicitly | trivial |
| T-003 | Low | Scaffold checkpoint `git diff` shows nothing for untracked skeleton — reword | trivial |

## Recommendation

**Block publish on T-001.** The marker protocol is the kit's defining mechanism; shipping with a broken frontier query guarantees the first real user hits it immediately. Fix is small and localized to doc strings across 5 files.

**Fix O-002, T-002, S-002, O-003, T-003 in the same pass** — all trivial wording/code tweaks, no behavioral risk, and they polish the kit to "feels done."

**Defer S-001 and O-001** to a follow-up: both are inherited/structural, documented, and don't block first use. Track S-001 in the README's known-limitations section; track O-001 with a cross-reference comment in each guard.

After T-001 + the trivial batch, re-run this verify pass to confirm the grep→ast_search swap didn't introduce new cross-reference breaks, then publish.