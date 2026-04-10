import type { Phase, TransitionBoundary } from "./workflow-tracker";

export type TransitionChoice = "next" | "fresh" | "skip" | "revise" | "discuss";

export interface TransitionPrompt {
  boundary: TransitionBoundary;
  title: string;
  nextPhase: Phase;
  artifactPath: string | null;
  options: { choice: TransitionChoice; label: string }[];
}

const BASE_OPTIONS: TransitionPrompt["options"] = [
  { choice: "next", label: "Next step (this session)" },
  { choice: "fresh", label: "Fresh session → next step" },
  { choice: "skip", label: "Skip" },
  { choice: "discuss", label: "Discuss" },
];

// Reviewable options: shown when a phase has its artifact but hasn't
// been user-confirmed as complete. Includes explicit approval + revision.
const REVIEWABLE_OPTIONS: TransitionPrompt["options"] = [
  { choice: "next", label: "✓ Looks good, next step (this session)" },
  { choice: "fresh", label: "✓ Looks good, fresh session → next step" },
  { choice: "skip", label: "Skip phase" },
  { choice: "revise", label: "✗ Needs more work" },
  { choice: "discuss", label: "Discuss" },
];

export function getTransitionPrompt(boundary: TransitionBoundary, artifactPath: string | null): TransitionPrompt {
  switch (boundary) {
    // Reviewable: phase has artifact but user hasn't confirmed completion
    case "design_reviewable":
      return {
        boundary,
        title: `Design written${artifactPath ? `: ${artifactPath}` : ""}. Ready to proceed?`,
        nextPhase: "plan",
        artifactPath,
        options: REVIEWABLE_OPTIONS,
      };
    case "plan_reviewable":
      return {
        boundary,
        title: `Plan written${artifactPath ? `: ${artifactPath}` : ""}. Ready to proceed?`,
        nextPhase: "execute",
        artifactPath,
        options: REVIEWABLE_OPTIONS,
      };
    // Committed: phase already complete, user chooses how to proceed
    case "design_committed":
      return {
        boundary,
        title: "Design committed. What next?",
        nextPhase: "plan",
        artifactPath,
        options: BASE_OPTIONS,
      };
    case "plan_ready":
      return {
        boundary,
        title: "Plan ready. What next?",
        nextPhase: "execute",
        artifactPath,
        options: BASE_OPTIONS,
      };
    case "execution_complete":
      return {
        boundary,
        title: "All tasks complete. What next?",
        nextPhase: "finalize",
        artifactPath,
        options: BASE_OPTIONS,
      };
    default:
      return {
        boundary,
        title: "What next?",
        nextPhase: "plan",
        artifactPath,
        options: BASE_OPTIONS,
      };
  }
}

/** Whether a boundary represents a phase that still needs user confirmation. */
export function isReviewableBoundary(boundary: TransitionBoundary): boolean {
  return boundary === "design_reviewable" || boundary === "plan_reviewable";
}
