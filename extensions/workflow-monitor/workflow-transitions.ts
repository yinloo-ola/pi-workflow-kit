import type { Phase, TransitionBoundary } from "./workflow-tracker";

export type TransitionChoice = "next" | "fresh" | "skip" | "discuss";

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

export function getTransitionPrompt(boundary: TransitionBoundary, artifactPath: string | null): TransitionPrompt {
  switch (boundary) {
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
