---
name: finalizing
description: "Use this after all tasks are complete to clean up, document, and ship the work."
---

# Finalizing

Ship the completed work.

## Process

1. **Move planning docs** — archive the design and implementation docs, then commit:
   ```
   mkdir -p docs/plans/completed
   mv docs/plans/*-design.md docs/plans/completed/
   mv docs/plans/*-implementation.md docs/plans/completed/
   git add docs/plans/completed/ && git commit -m "chore: archive planning docs"
   ```

2. **Update documentation** — if the API or surface changed:
   - Update README.md
   - Update CHANGELOG.md
   - Update any inline docs

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
