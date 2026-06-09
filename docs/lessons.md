# Lessons Learned

<!--
Agent: read this at the start of each task during executing-tasks.
Follow every rule. Add new rules when you catch yourself making repeat mistakes.
Rules must be generic patterns applicable to any domain or feature — not specific to one service, entity, or use case.
Retire rules that no longer apply during finalizing.
-->

## Cross-Skill Consistency

- When adding instructions that reference artifacts from another skill (e.g., "extract metadata from plan doc"), always add a guard for when that artifact doesn't exist — not all workflows use all artifacts
- When reordering instructions within a step, verify all conditional branches still reference the correct context (e.g., hazard checks that say "this feature" must run after feature identification)

## Documentation

- When adding a new phase to an extension, update ALL comments and error messages — stale comments in one place create confusion about the actual behavior
- When renaming skills with a prefix, check for `/skill:` references in prose and code blocks separately — backtick-enclosed references in code examples may use a different pattern than prose references
