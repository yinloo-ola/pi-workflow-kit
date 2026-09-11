#!/bin/bash
# Feature-acceptance E2E for workflow-hint-gaps (ephemeral — disposed at finalize).
# Encodes docs/plans/2026-09-11-workflow-hint-gaps-design.md ## Feature acceptance
# as executable prose-invariant checks over skills/*/. Exits non-zero on any failure.
# Scope note: text edits only — this script lives in docs/plans/, never tests/.
cd "$(git rev-parse --show-toplevel)" || exit 1
PASS=0; FAIL=0
check() { # $1=name $2=command... (passes when command exits 0)
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then echo "  PASS $name"; PASS=$((PASS+1));
  else echo "  FAIL $name"; FAIL=$((FAIL+1)); fi
}
ST=skills/pwk-status/SKILL.md
FN=skills/pwk-finalizing/SKILL.md
EX=skills/pwk-executing-tasks/SKILL.md
BR=skills/pwk-brainstorming/SKILL.md
CR=skills/pwk-code-review/SKILL.md

echo "== R1: routing never bounces =="
# FA1: ship-paused status routes to executing-tasks
check "status ship-paused -> executing-tasks" grep -q "ship-paused.*pwk-executing-tasks" "$ST"
# FA1: no non-done state carries a finalizing hint (every finalizing mention on a done line)
NOTDONE_FINALIZING=$(grep -n "pwk-finalizing" "$ST" | grep -v -i "done" || true)
check "no non-done finalizing hint" test -z "$NOTDONE_FINALIZING"
# FA2: inline review completion continues in executing-tasks (no finalizing branch)
check "code-review routes to executing-tasks only" bash -c "! grep -A5 'After the review' '$CR' | grep -q 'pwk-finalizing'"
# FA2b: step 7 names the row under review (no terminal-row regression)
check "code-review step7 names row under review" grep -q "requirement under review" "$CR"
# FA4: after-review routing scoped to the current design's folder
check "after-review uses current design folder" grep -q "its own folder" "$EX"

echo "== R2: every rendered state is complete =="
# FA5: e2e-written tally states its source (Requirements-table row count)
check "e2e-written tally states source" bash -c "grep -n 'e2e-written' '$ST' | grep -q 'row count'"
# FA5: umbrella buckets name awaiting-setup, and notice-phase parts land in execute
# (no bare "feature-spec" bucket: tests/lean-gates.e2e.test.ts pins the state
# vocabulary without it — the feature-E2E notice rolls up as execute instead)
check "buckets cover awaiting setup" bash -c "grep -q 'in-flight parts (.*awaiting setup' '$ST'"
check "notice parts roll up as execute" bash -c "grep -q 'rolls up as execute' '$ST'"

echo "== R3: sessions see the state they route on =="
# fresh brainstorm discovery reports in-flight Feature phase lines
check "brainstorm discovery reads progress phases" bash -c "grep -q '\*-progress.md' '$BR' && grep -q 'Feature phase:' '$BR'"
# umbrella part-2 brainstorm reports part 1's phase before designing
check "brainstorm reports prior part phase" bash -c "grep -q 'prior part' '$BR' && grep -q 'Feature phase' '$BR'"
# later-part execute pre-flight surfaces prior phases as advisory context
check "execute pre-flight advisory prior phases" grep -q "advisory" "$EX"

echo "== R4: gates and vocabulary match reality =="
# FA3: finalize blocks on unstarted roster part, naming it, routing to executing-tasks
check "finalize blocks unstarted part" bash -c "grep -q 'unstarted' '$FN' && grep -q 'pwk-executing-tasks' '$FN'"
# live phase enumeration contains only phases the flow writes (no legacy feature-spec-paused)
check "phase enumeration is live-only" bash -c "! grep 'Feature phase. is one of' '$EX' | grep -q 'feature-spec-paused'"

echo "== R5: one worktree per branch =="
# FA6: later-part pre-flight adopts existing worktree via `git worktree list`
check "pre-flight adopts worktree" bash -c "grep -q 'worktree list' '$EX'"
# FA6: finalize cleanup verifies presence, silent no-op when absent
check "finalize cleanup verifies presence" bash -c "grep -q 'worktree list' '$FN'"

echo "== $PASS passed, $FAIL failed =="
test "$FAIL" -eq 0
