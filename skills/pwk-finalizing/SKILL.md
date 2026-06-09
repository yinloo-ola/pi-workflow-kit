---
name: pwk-finalizing
description: "Use this after all tasks are complete to clean up, document, and ship the work."
---

# Finalizing

Ship the completed work.

## Pre-finalization checks

### Check for skipped tasks

Before archiving, if a progress file exists (`docs/plans/*-progress.md`), read it and check for any `⏭ skipped` tasks. If found, warn:

```
⚠️ Tasks 4 and 7 were skipped. Continue with finalizing, or go back?
```

Wait for the user to confirm before proceeding.

## Process

1. **Move planning docs** — before archiving, check the design doc's `## Features` table (if one exists). If any features have status `⬜ pending` or `🔄 planned`, warn:

   ```
   ⚠️ Design doc has N unplanned features. Archive anyway, or go back to plan them?
   ```

   Wait for the user to confirm before proceeding. Then archive the design, implementation, progress docs, and ADRs (if any), then commit:
   ```
   mkdir -p docs/plans/completed
   mkdir -p docs/plans/completed/adr
   mv docs/plans/*-design.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/*-implementation.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/*-progress.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/*-verification-report.md docs/plans/completed/ 2>/dev/null || true
   mv docs/plans/adr/*.md docs/plans/completed/adr/ 2>/dev/null || true
   rmdir docs/plans/adr 2>/dev/null || true
   git add docs/plans/ && git commit -m "chore: archive planning docs"
   ```

   Each `mv` gracefully handles the case where no matching files exist (e.g., if the user skipped straight from brainstorm to finalize without executing tasks).

2. **Review & Polish Lessons (Agile Scrum Master Hat)** — if `docs/lessons.md` exists, put on your **Agile Scrum Master Hat** to curate and optimize it for future sprints:
   - **Add missed lessons** — capture any lessons from this session that weren't written during execution
   - **Generalize domain-specific rules** — if a rule names a specific service, entity, or feature, either rewrite it as a generic pattern or remove it if no generic form exists
   - **De-duplicate** — combine overlapping or redundant rules into single, sharper entries
   - **Categorize** — group the rules under clear, structured markdown headers (e.g., `## Tool Usage`, `## Testing Patterns`, `## Architecture Rules`) to make the document highly scannable for future sessions. Keep the `## Rules` section as the append target for new entries during execution — categorization moves rules out of `## Rules` into the appropriate category headers.
   - **Retire stale rules** — remove bullets that no longer apply
   - If no changes are needed, leave it as-is

   If `docs/lessons.md` doesn't exist but lessons were learned this session, create it with the standard format:

   ```markdown
   # Lessons Learned

   <!--
   Agent: read this at the start of each task during executing-tasks.
   Follow every rule. Add new rules when you catch yourself making repeat mistakes.
   Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
   Retire rules that no longer apply during finalizing.
   -->

   ## Rules

   - <rule 1>
   - <rule 2>
   ```

3. **Update documentation** — if the API or surface changed:
   - Update README.md
   - Update CHANGELOG.md
   - Update any inline docs

4. **Choose a merge strategy** — ask the human which option they prefer:

   1. **Create PR** — push and open a PR for external review:
      ```
      git push origin <branch>
      gh pr create --title "feat: <summary>" --body "<task summary>"
      ```

      Use the progress file to generate the summary. Convert the task table to a bulleted list:
      ```
      - ✅ Create User model
      - ✅ Write User model tests
      - ⏭ Add auth middleware (skipped)
      - ✅ Add login endpoint
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
      git checkout - && git merge --no-ff -m "Merge branch '<branch>'" -
      git push origin "$parent"
      git branch -d - && git push origin --delete -
      ```

   For options 2–4, confirm the detected parent branch with the human before proceeding.

5. **Clean up** — if a worktree was used, remove it:
   ```
   git worktree remove ../<repo>-<feature-name>
   ```
