/**
 * Shared marker literals for the human-review-digests contracts.
 *
 * One canonical string per contract, asserted by skill-lint (Check 11) and the
 * vitest suites (E2E + per-slice) — rewording a skill must not require hunting
 * literals across four files. Plain .mjs so both the node linter and vitest
 * (TS) can import it without a build step.
 */
export const DIGEST_MARKERS = {
  atAGlance: "## At a glance",
  atAGlanceTable: "| R# | Requirement in one line | Risk |",
  execSummary: "## Execution summary",
  execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
  fillAsYouLand: "same step as marking",
  deviationAtDeviation: "when the departure happens",
  shipPaused: "ship-paused",
  shipCheckpoint: "ship checkpoint",
  diffOnRequest: "diff on request",
  coverageTable: "| R# | Verdict | Evidence |",
  coverageVerdicts: "covered | gap | scope-creep",
  umbrellaFolder: "docs/plans/<date>-<umbrella>/",
  mustBeDone: "must be `done`",
  legacyPaused: "legacy `feature-complete-paused`",
};

/**
 * Markers for the pwk 2.0 single-doc feature: the merged design doc (### R<n> blocks
 * with criteria + tags), decisions-first At a glance, the removed plan phase, the
 * finalize learning sweep, and the on-demand walkthrough skill. Same contract as
 * DIGEST_MARKERS — one canonical string per behavior, shared by skill-lint and the
 * vitest suites. Chosen to distinguish new shapes from old (### R<n>: vs ## Requirement N:).
 */
export const SINGLE_DOC_MARKERS = {
  rBlock: "### R<n>: <name>",
  criteriaInBlock: "Given/When/Then criteria",
  noTestNameLists: "no test-name lists",
  auditExactlyOnce: "exactly once",
  autoTagTruth: "one source of truth for the auto-tag rule",
  keyDecisions: "Key decisions",
  neverManufactured: "never manufactured",
  designFlow: "design → execute → finalize",
  preFlightBranch: "create the feature branch",
  parseRBlocks: "### R<n> blocks",
  legacyStem: "stem-matched",
  bothSuffixes: "both suffixes",
  packetDesignSpan: "### R1",
  learningSweep: "learning sweep",
  beforeDisposal: "before any disposal",
  sweepApproaches: "Approaches considered",
  askNotFabricate: "rather than fabricating",
  deviationRecord: "at deviation time",
  walkthroughDir: "docs/walkthroughs/",
  walkthroughTemplate: "Summary / How it works / Key flows / Gotchas & invariants / Change map",
  fileLineAnchors: "file:line",
  shaStamp: "stamped with the commit range",
  regenWholesale: "overwrites wholesale",
  neverDisposed: "never disposed",
  onDemand: "on demand",
};

/**
 * Markers for the pwk-status phase-driven state feature: per-part state inferred
 * from the progress file's `Feature phase:` line (done as the terminal state), the
 * pinned find discovery recipe, and the repo-root check. Same contract as
 * DIGEST_MARKERS — one canonical string per behavior, shared by skill-lint and
 * the vitest suites.
 */
export const STATUS_STATE_MARKERS = {
  phaseLine: "Feature phase:",
  findRecipe: "find docs/plans -name",
  rootCheck: "git rev-parse --show-toplevel",
  stopNoCd: "never `cd`",
  rollUp: "n done · n in-flight · n not-started",
  headerRead: "grep -m1 '^Feature phase:'",
  tallyGrep: "grep -c '^| [0-9]'",
  gateExtract: "nothing the gate needs",
  resumeExtract: "nothing the resume needs",
};

/**
 * Markers for the leaner-execution-gates feature: the deleted per-requirement
 * review auto-tag, the risk-scaled single feature review (`auto`), the
 * feature-spec notice replacing the mandatory stop, the dropped `spec`
 * checkpoint value, the enriched `### Flow` digest, and flow-truth checking.
 * Same contract as DIGEST_MARKERS — one canonical string per behavior, shared
 * by skill-lint and the vitest suites. Each marker is chosen to distinguish the
 * new shape from the old (e.g. `### Checkpoints: none | full` vs `...| spec`).
 */
export const LEAN_GATES_MARKERS = {
  // R1 — no silent per-requirement tagging; the human owns the tag.
  onlyHumanTags: "only the human tags",
  // R2 — one risk-scaled feature review.
  featureReviewTag: "### Feature review: auto | parallel | inline",
  autoKeyedOnRisk: "production-risk content",
  explicitTagWins: "explicit tag wins",
  // R3 — the feature-spec stop becomes a notice; status renders execute 0/N.
  specNotice: "without waiting for approval",
  statusExecuteZero: "execute 0/N",
  // R4 — the `spec` checkpoint value is gone.
  checkpointsEnum: "### Checkpoints: none | full",
  // The executing skill's tags reference is a table (skill-slimming S3), so its enum shows as
  // tag + values cells instead of a single header line. Same behavior, different shape.
  checkpointsEnumRow: "`### Checkpoints` | `none | full`",
  // R5 — the enriched Flow shape.
  flowSpine: "Spine",
  flowBranches: "Branches",
  flowWasClause: "was:",
  flowSideEffects: "Side effects",
  flowCap: "15 lines",
  flowNoLineNumbers: "no line numbers",
  flowWalkthroughOffer: "/skill:pwk-walkthrough",
  // R6 — the Flow is checked against reviewed reality.
  flowTruth: "tracing report",
  flowSurfaced: "surfaced",
};

/**
 * Markers for the workflow-consistency feature (F1–F15 audit batch): the canonical
 * row-state + ceremony vocabulary, the terminal-state ship gate (done = resolved,
 * finalizing stays the failure authority), the implementable setup checkpoint, the
 * derived display-only Risk column, the FA template's own tag, inventory doc parity
 * + parity lint, the Commit-column packet base, and the mid-execution fix-recording hook.
 * Same contract as DIGEST_MARKERS — one canonical string per behavior, shared by
 * skill-lint and the vitest suites. Each marker distinguishes the new shape from the
 * old (e.g. `terminal` vs the all-✅ gate, `Commit column` vs bare `<merge-base>`).
 */
export const WORKFLOW_CONSISTENCY_MARKERS = {
  // R1 — one canonical row-state + ceremony vocabulary, scoped writers.
  rowStates: "`⬜` not started · `🔄` in progress · `✅` done · `❌` failed · `⏭` skipped",
  ceremonyEcho: "echoes the design doc's tag",
  fullTwoStops: "fires two stops",
  codeReviewScoped: "only ever flips `🔄`→`✅`",
  // R2 — terminal-state ship gate; finalizing stays the failure authority.
  shipGateTerminal: "every requirement's Done cell is terminal",
  digestListsVerdicts: "list every `❌`/`⏭` row with its reason",
  failedGlyphNamed: "Set its Done cell `❌`",
  skippedGlyphNamed: "Set its Done cell `⏭`",
  resumeSkipsTerminal: "`✅`/`❌`/`⏭` are resolved",
  resumeTerminalRoute: "continue the next not-yet-terminal requirement",
  umbrellaBlockRule: "reads every part's file",
  legacyFailureNote: "failure handling is unchanged",
  reasonInShipGate: "`❌` (failed, reason in row)",
  reasonSuffix: "as a suffix in the Requirement cell",
  coverageReconciled: "assertions removed or skipped with the reason",
  knowingWhatFailed: "knowing what failed",
  statusDoneCounts: "done (1 ❌ · 1 ⏭)",
  statusForceFailedHint: "will require `--force-failed`",
  statusVerdictGrep: "grep -c '^| [0-9].*❌'",
  // R3 — the setup checkpoint becomes implementable.
  setupEnum: "Setup: pending | done | n/a",
  setupPendingInit: "header starts `Setup: pending`",
  setupApprovalFlip: "set `Setup: done`",
  setupResumeRecheck: "re-run the setup verification",
  statusAwaitingSetup: "awaiting setup",
  conditionalStops: "two hard stops when the design carries `## Setup`",
  // R4 — the At-a-glance Risk column is derived, display-only.
  riskDerived: "`⚠ production-risk` if and only if",
  riskDisplayOnly: "display-only",
  // R6 — inventory parity + notes disposal.
  notesDisposal: "????-??-??-<topic>-notes.md",
  // R7 — the doc-inventory parity lint.
  parityLint: "inventory parity",
  // R8 — packet base from the Commit column.
  commitColumnFill: "commit hash in the Commit column",
  featureBaseRule: "parent of the first recorded commit",
  perReqSpanRule: "previous requirement's last commit",
  // R9 — the mid-execution fix-recording hook (the diagnose half was removed with the skill).
  midFixMandated: "mandatory execution-summary content",
};

/**
 * Markers for the code-digest feature: the ship-time code digest, the
 * completed/ exclusion on recursive discovery globs, and frontier-round
 * brainstorm questioning. Same contract as DIGEST_MARKERS — one canonical
 * string per behavior, shared by skill-lint and the vitest suites.
 */
export const CODE_DIGEST_MARKERS = {
  codeDigest: "## Code digest",
  digestOnceOnly: "never back-filled per requirement",
  alertReviewerConfirmedOnly: "reviewer-confirmed",
  honestEmptyGotchas: "none beyond review findings",
  keyFilesCap: "at 5",
  completedExclusion: "excluding docs/plans/completed/",
  frontier: "frontier",
  recommendedAnswer: "recommended answer",
  nothingToAsk: "nothing to ask",
  factsNeverAsked: "never asked of the human",
  assumptionGate: "Assumptions to confirm",
  nothingSilentlyAssumed: "nothing left silently assumed",
  bounceToBrainstorm: "back to `/skill:pwk-brainstorming`",
};
