import { type Phase, type PhaseStatus, WORKFLOW_PHASES, type WorkflowTrackerState } from "./workflow-tracker";

export function isPhaseUnresolved(status: PhaseStatus): boolean {
  return status === "pending";
}

export function getUnresolvedPhasesBefore(target: Phase, state: WorkflowTrackerState): Phase[] {
  const targetIndex = WORKFLOW_PHASES.indexOf(target);
  if (targetIndex === -1) {
    return [];
  }

  const phasesBefore = WORKFLOW_PHASES.slice(0, targetIndex);
  return getUnresolvedPhases(phasesBefore, state);
}

export function getUnresolvedPhases(phases: Phase[], state: WorkflowTrackerState): Phase[] {
  return phases.filter((phase) => isPhaseUnresolved(state.phases[phase]));
}
