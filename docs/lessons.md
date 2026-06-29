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
- When porting a config file that pins a schema/tool version, align the pin (and migrate deprecated fields) to the actually-installed tool version before committing — a verbatim copy of a stale config produces a broken lint/build script
- Published agent skills must depend ONLY on the host agent's built-in tools, not on extensions the author happens to have installed. Before instructing an agent to use a tool in a skill that will run in other environments, check the host's documented built-in tool list. What's available in your dev harness (e.g. ast_search from an LSP extension) is not available in a vanilla install.
- When a query/matcher must work across multiple programming languages, do not hardcode language-specific syntax (e.g. `stub("` assumes parens + double-quotes — breaks for ML-family juxtaposition calls and single-quote-string languages). Either scope the skill to a documented language family, or have the emitting step record the exact matcher (derived from the literal syntax it produced) into a sentinel/config the consuming steps read. Centralize language knowledge where the code is emitted; keep consumers language-agnostic.
