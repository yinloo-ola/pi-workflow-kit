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
  findRecipe: "/usr/bin/find docs/plans -name",
  rootCheck: "git rev-parse --show-toplevel",
  stopNoCd: "never `cd`",
  rollUp: "n done · n in-flight · n not-started",
  winRecipe: "Get-ChildItem -Recurse docs/plans -Filter",
  headerRead: "head -n 10",
  tallyGrep: "grep -c '✅'",
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
