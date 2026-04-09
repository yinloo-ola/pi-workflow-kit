import * as fs from "node:fs";
import * as path from "node:path";
import type { AutocompleteItem } from "@mariozechner/pi-tui";

const WORKFLOW_NEXT_PHASES = ["brainstorm", "plan", "execute", "finalize"] as const;

type WorkflowNextPhase = (typeof WORKFLOW_NEXT_PHASES)[number];

function getPhaseCompletions(prefix: string): AutocompleteItem[] | null {
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

function listPlanArtifacts(suffix: string, typedPrefix: string): AutocompleteItem[] | null {
  const plansDir = path.join(process.cwd(), "docs", "plans");
  if (!fs.existsSync(plansDir)) return null;

  const items = fs
    .readdirSync(plansDir)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join("docs", "plans", name))
    .filter((relPath) => relPath.startsWith(typedPrefix))
    .map((relPath) => ({ value: relPath, label: relPath }));

  return items.length > 0 ? items : null;
}

export async function getWorkflowNextCompletions(prefix: string): Promise<AutocompleteItem[] | null> {
  const phaseCompletions = getPhaseCompletions(prefix);
  if (phaseCompletions) return phaseCompletions;

  const match = prefix.replace(/^\s+/, "").match(/^(\S+)(?:\s+(.*))?$/);
  const phase = match?.[1] ?? "";
  const artifactPrefix = match?.[2] ?? "";
  const startingSecondArg = /\s$/.test(prefix) || artifactPrefix.length > 0;

  if (phase === "plan" && startingSecondArg) {
    return listPlanArtifacts("-design.md", artifactPrefix);
  }

  return null;
}
