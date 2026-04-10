---
name: finalizing
description: "Use this after all tasks are complete to clean up, document, and ship the work."
---

# Finalizing

Ship the completed work.

## Process

1. **Move planning docs** — archive the design and implementation docs:
   ```
   mkdir -p docs/plans/completed
   mv docs/plans/*-design.md docs/plans/completed/
   mv docs/plans/*-implementation.md docs/plans/completed/
   ```

2. **Update documentation** — if the API or surface changed:
   - Update README.md
   - Update CHANGELOG.md
   - Update any inline docs

3. **Create PR**:
   ```
   git push origin <branch>
   gh pr create --title "feat: <summary>" --body "<task summary>"
   ```

4. **Clean up** — if a worktree was used, remove it after the PR is merged:
   ```
   git worktree remove ../<repo>-<feature-name>
   ```
