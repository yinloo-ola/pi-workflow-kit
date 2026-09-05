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
  crosswalk: "## Crosswalk",
  crosswalkTable: "| R# | Plan section | Tests |",
  crosswalkPlacement: "strictly before `## Requirement 1`",
  oneLineConfirmation: "one-line confirmation",
  execSummary: "## Execution summary",
  execSummaryTable: "| R# | Requirement | How it was built | Deviated? |",
  fillAsYouLand: "same step as marking",
  deviationAtDeviation: "when the departure happens",
  shipPaused: "ship-paused",
  shipCheckpoint: "ship checkpoint",
  diffOnRequest: "diff on request",
  coverageTable: "| R# | Verdict | Evidence |",
  coverageVerdicts: "covered | gap | scope-creep",
  recursiveGlob: "docs/plans/**/",
  umbrellaFolder: "docs/plans/<date>-<umbrella>/",
  mustBeDone: "must be `done`",
  legacyPaused: "legacy `feature-complete-paused`",
};
