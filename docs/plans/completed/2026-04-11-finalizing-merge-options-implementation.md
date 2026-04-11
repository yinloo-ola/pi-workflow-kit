# Finalizing: Merge Strategy Options — Implementation Plan

## Context

Replace the hard-coded "Create PR" step in the finalizing skill with a 4-option merge strategy prompt (Create PR, Rebase & merge, Squash & merge, Merge commit).

Design doc: `docs/plans/2026-04-11-finalizing-merge-options-design.md`

---

## Task 1 — Replace the PR step with a merge strategy prompt

**TDD scenario:** Trivial (skill docs, no code to test)

**File:** `skills/finalizing/SKILL.md`

Replace step 3 ("Create PR") and step 4 ("Clean up") with the new merge strategy section. Keep steps 1 and 2 unchanged.

**New content for step 3 onwards:**

```markdown
3. **Choose a merge strategy** — ask the human which option they prefer:

   1. **Create PR** — push and open a PR for external review:
      ```
      git push origin <branch>
      gh pr create --title "feat: <summary>" --body "<task summary>"
      ```

   2. **Rebase & merge** *(recommended)* — rebase onto parent, fast-forward merge, push parent, delete branch:
      ```
      parent=$(git show-branch -a 2>/dev/null | grep '\*' | grep -v "$(git branch --show-current)" | head -1 | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/[\^~].*//')
      git checkout "$parent" && git pull
      git checkout - && git rebase "$parent"
      git checkout "$parent" && git merge --ff-only -
      git push origin "$parent"
      git branch -d - && git push origin --delete -
      ```

   3. **Squash & merge** — squash all commits into one on parent, push parent, delete branch:
      ```
      parent=$(git show-branch -a 2>/dev/null | grep '\*' | grep -v "$(git branch --show-current)" | head -1 | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/[\^~].*//')
      git checkout "$parent" && git pull
      git merge --squash -
      git commit -m "feat: <summary>"
      git push origin "$parent"
      git branch -d - && git push origin --delete -
      ```

   4. **Merge commit** — merge with `--no-ff`, push parent, delete branch:
      ```
      parent=$(git show-branch -a 2>/dev/null | grep '\*' | grep -v "$(git branch --show-current)" | head -1 | sed 's/.*\[\(.*\)\].*/\1/' | sed 's/[\^~].*//')
      git checkout "$parent" && git pull
      git merge --no-ff -m "Merge branch '<branch>'" -
      git push origin "$parent"
      git branch -d - && git push origin --delete -
      ```

   For options 2–4, confirm the detected parent branch with the human before proceeding.

4. **Clean up** — if a worktree was used, remove it:
   ```
   git worktree remove ../<repo>-<feature-name>
   ```
```

**Commit:** `feat: add merge strategy options to finalizing skill`

---

## Done

The finalizing skill now offers four merge strategies instead of only "Create PR". No code files changed — this is a skill-documentation update only.

To verify: read `skills/finalizing/SKILL.md` and confirm it contains all four options with correct commands.
