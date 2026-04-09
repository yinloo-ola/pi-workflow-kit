/**
 * Pure helper functions for /workflow-next handoff validation and derived state.
 *
 * These functions have no side effects and no dependencies on the extension runtime,
 * making them straightforward to test and reason about.
 */

import { type Phase, type PhaseStatus, WORKFLOW_PHASES, type WorkflowTrackerState } from "./workflow-tracker";

/** Map of each phase to its immediate next phase (null for finalize). */
const NEXT_PHASE: Record<Phase, Phase | null> = {
  brainstorm: "plan",
  plan: "execute",
  execute: "finalize",
  finalize: null,
};

/**
 * Validate whether a `/workflow-next` request is allowed.
 *
 * Rules:
 * - A current phase must exist in the workflow state.
 * - The current phase must have status exactly "complete".
 * - The requested phase must be the immediate next phase.
 *
 * Returns `null` if the handoff is valid, or an error message string.
 */
export function validateNextWorkflowPhase(currentState: WorkflowTrackerState, requestedPhase: Phase): string | null {
  const current = currentState.currentPhase;

  if (!current) {
    return "No workflow phase is active. Start a workflow first or use /workflow-reset.";
  }

  const next = NEXT_PHASE[current];
  if (next === null) {
    return `Cannot hand off: ${current} is the final phase. Use /workflow-reset for a new task.`;
  }

  const currentStatus = currentState.phases[current];

  // Same-phase handoff
  if (requestedPhase === current) {
    return `Cannot hand off to ${requestedPhase} from ${current}. Use /workflow-reset for a new task or continue in this session.`;
  }

  // Backward handoff
  const currentIdx = WORKFLOW_PHASES.indexOf(current);
  const requestedIdx = WORKFLOW_PHASES.indexOf(requestedPhase);
  if (requestedIdx < currentIdx) {
    return `Cannot hand off to ${requestedPhase} from ${current}: backward transitions are not allowed.`;
  }

  // Current phase not complete
  if (currentStatus !== "complete") {
    return `Cannot hand off to ${requestedPhase} because ${current} is not complete (status: ${currentStatus}).`;
  }

  // Direct jump (skipping intermediate phases)
  if (requestedPhase !== next) {
    return `Cannot hand off to ${requestedPhase} from ${current}. /workflow-next only supports the immediate next phase: ${next}.`;
  }

  return null;
}

/**
 * Derive the workflow state snapshot for a new session created by `/workflow-next`.
 *
 * Rules:
 * - All phases before the requested phase are marked "complete".
 * - The requested phase is marked "active".
 * - All phases after the requested phase are marked "pending".
 * - currentPhase is set to the requested phase.
 * - Artifacts and prompted flags are preserved for earlier phases.
 */
export function deriveWorkflowHandoffState(
  currentState: WorkflowTrackerState,
  requestedPhase: Phase,
): WorkflowTrackerState {
  const requestedIdx = WORKFLOW_PHASES.indexOf(requestedPhase);

  const newPhases = { ...currentState.phases };
  const newArtifacts = { ...currentState.artifacts };
  const newPrompted = { ...currentState.prompted };

  for (let i = 0; i < WORKFLOW_PHASES.length; i++) {
    const phase = WORKFLOW_PHASES[i]!;

    if (i < requestedIdx) {
      // Earlier phases: mark complete, preserve artifacts/prompted
      newPhases[phase] = "complete";
    } else if (i === requestedIdx) {
      // Target phase: active
      newPhases[phase] = "active";
      newArtifacts[phase] = currentState.artifacts[phase] ?? null;
      newPrompted[phase] = false;
    } else {
      // Later phases: pending, clear artifacts/prompted
      newPhases[phase] = "pending";
      newArtifacts[phase] = null;
      newPrompted[phase] = false;
    }
  }

  return {
    phases: newPhases as Record<Phase, PhaseStatus>,
    currentPhase: requestedPhase,
    artifacts: newArtifacts as Record<Phase, string | null>,
    prompted: newPrompted as Record<Phase, boolean>,
  };
}
