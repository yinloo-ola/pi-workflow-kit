import type { AutocompleteItem } from "@mariozechner/pi-tui";

const WORKFLOW_NEXT_PHASES = ["brainstorm", "plan", "execute", "finalize"] as const;

type WorkflowNextPhase = (typeof WORKFLOW_NEXT_PHASES)[number];

export async function getWorkflowNextCompletions(prefix: string): Promise<AutocompleteItem[] | null> {
  const normalized = prefix.replace(/^\s+/, "");
  const firstToken = normalized.split(/\s+/, 1)[0] ?? "";
  const completingFirstArg = normalized.length === 0 || !/\s/.test(normalized);

  if (completingFirstArg || !WORKFLOW_NEXT_PHASES.includes(firstToken as WorkflowNextPhase)) {
    const phasePrefix = completingFirstArg ? normalized : firstToken;
    const items = WORKFLOW_NEXT_PHASES.filter((phase) => phase.startsWith(phasePrefix)).map((phase) => ({
      value: phase,
      label: phase,
    }));
    return items.length > 0 ? items : null;
  }

  return null;
}
