import type { SessionEntry } from "@mariozechner/pi-coding-agent";

export const WORKFLOW_PHASES = ["brainstorm", "plan", "execute", "finalize"] as const;

export type Phase = (typeof WORKFLOW_PHASES)[number];
export type PhaseStatus = "pending" | "active" | "complete" | "skipped";

export interface WorkflowTrackerState {
  phases: Record<Phase, PhaseStatus>;
  currentPhase: Phase | null;
  artifacts: Record<Phase, string | null>;
  prompted: Record<Phase, boolean>;
}

export type TransitionBoundary =
  | "design_reviewable"
  | "plan_reviewable"
  | "design_committed"
  | "plan_ready"
  | "execution_complete";

export function computeBoundaryToPrompt(state: WorkflowTrackerState): TransitionBoundary | null {
  // Reviewable: current phase has its deliverable artifact but hasn't been
  // user-confirmed as complete. Prompt the user to review before moving on.
  if (
    state.currentPhase === "brainstorm" &&
    state.artifacts.brainstorm &&
    state.phases.brainstorm === "active" &&
    !state.prompted.brainstorm
  ) {
    return "design_reviewable";
  }
  if (state.currentPhase === "plan" && state.artifacts.plan && state.phases.plan === "active" && !state.prompted.plan) {
    return "plan_reviewable";
  }

  // Committed: phase is complete but user hasn't been prompted for
  // transition options yet (e.g. phases completed via skip-confirmation
  // "mark complete" or execute phase auto-completing on all tasks terminal).
  if (state.phases.brainstorm === "complete" && !state.prompted.brainstorm) {
    return "design_committed";
  }
  if (state.phases.plan === "complete" && !state.prompted.plan) {
    return "plan_ready";
  }
  if (state.phases.execute === "complete" && !state.prompted.execute) {
    return "execution_complete";
  }
  return null;
}

function cloneState(state: WorkflowTrackerState): WorkflowTrackerState {
  return JSON.parse(JSON.stringify(state)) as WorkflowTrackerState;
}

function emptyState(): WorkflowTrackerState {
  const phases = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, "pending"])) as Record<Phase, PhaseStatus>;

  const artifacts = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, null])) as Record<Phase, string | null>;

  const prompted = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, false])) as Record<Phase, boolean>;

  return { phases, currentPhase: null, artifacts, prompted };
}

export const WORKFLOW_TRACKER_ENTRY_TYPE = "workflow_tracker_state";

export function parseSkillName(line: string): string | null {
  const slashMatch = line.match(/^\s*\/skill:([^\s]+)/);
  const xmlMatch = line.match(/<skill\s+name="([^"]+)"/);
  return slashMatch?.[1] ?? xmlMatch?.[1] ?? null;
}

export const SKILL_TO_PHASE: Record<string, Phase> = {
  brainstorming: "brainstorm",
  "writing-plans": "plan",
  "using-git-worktrees": "plan", // pre-execute worktree setup belongs to plan
  "executing-tasks": "execute",
  "systematic-debugging": "execute", // used within execute phase
  "dispatching-parallel-agents": "execute", // used within execute phase
  "test-driven-development": "execute", // makes TDD skill phase-aware
  "receiving-code-review": "finalize", // post-PR external review
};

export function resolveSkillPhase(skill: string, state: WorkflowTrackerState | null | undefined): Phase | null {
  if (skill === "executing-tasks") {
    if (state?.currentPhase === "finalize" || state?.phases.execute === "complete") {
      return "finalize";
    }
    return "execute";
  }

  return SKILL_TO_PHASE[skill] ?? null;
}

const PLANS_DIR_RE = /^docs\/plans\//;
const DESIGN_RE = /-design\.md$/;
const IMPLEMENTATION_RE = /-implementation\.md$/;

export class WorkflowTracker {
  private state: WorkflowTrackerState = emptyState();

  getState(): WorkflowTrackerState {
    return cloneState(this.state);
  }

  setState(state: WorkflowTrackerState): void {
    this.state = cloneState(state);
  }

  reset(): void {
    this.state = emptyState();
  }

  advanceTo(phase: Phase): boolean {
    const current = this.state.currentPhase;
    const nextIdx = WORKFLOW_PHASES.indexOf(phase);

    if (current) {
      const curIdx = WORKFLOW_PHASES.indexOf(current);
      if (nextIdx === curIdx) {
        // Same-phase navigation is a no-op. This prevents accidental resets
        // when plan_tracker init is called while already in execute, or when
        // a skill is re-invoked during its own phase.
        return false;
      }
      if (nextIdx < curIdx) {
        // Backward navigation = intentional new task. Reset everything.
        this.reset();
        // Fall through to activate the target phase below.
      } else {
        // Forward advance: do NOT auto-complete the current phase.
        // Phase completion requires explicit user confirmation via
        // boundary prompts or skip-confirmation "mark complete".
        // However, refuse to jump over unresolved intermediate phases.
        for (let i = curIdx + 1; i < nextIdx; i++) {
          const intermediate = WORKFLOW_PHASES[i]!;
          const status = this.state.phases[intermediate];
          if (status !== "complete" && status !== "skipped") {
            // Can't advance past an unresolved intermediate phase.
            return false;
          }
        }
      }
    }

    this.state.currentPhase = phase;
    if (this.state.phases[phase] === "pending") {
      this.state.phases[phase] = "active";
    }

    return true;
  }

  skipPhase(phase: Phase): boolean {
    const status = this.state.phases[phase];
    if (status !== "pending" && status !== "active") return false;
    this.state.phases[phase] = "skipped";
    return true;
  }

  skipPhases(phases: Phase[]): boolean {
    let changed = false;
    for (const p of phases) changed = this.skipPhase(p) || changed;
    return changed;
  }

  completeCurrent(): boolean {
    const phase = this.state.currentPhase;
    if (!phase) return false;
    return this.completePhase(phase);
  }

  completePhase(phase: Phase): boolean {
    if (this.state.phases[phase] === "complete") return false;
    this.state.phases[phase] = "complete";
    return true;
  }

  recordArtifact(phase: Phase, path: string): boolean {
    if (this.state.artifacts[phase] === path) return false;
    this.state.artifacts[phase] = path;
    return true;
  }

  markPrompted(phase: Phase): boolean {
    if (this.state.prompted[phase]) return false;
    this.state.prompted[phase] = true;
    return true;
  }

  onInputText(text: string): boolean {
    const lines = text.split(/\r?\n/);
    let changed = false;

    for (const line of lines) {
      const skill = parseSkillName(line);
      if (!skill) continue;
      const phase = resolveSkillPhase(skill, this.state);
      if (!phase) continue;
      // Guard against backward navigation: skills shared across phases (e.g. executing-tasks
      // covers both execute and finalize) must not reset state when re-invoked in a later phase.
      const currentIdx = this.state.currentPhase ? WORKFLOW_PHASES.indexOf(this.state.currentPhase) : -1;
      const targetIdx = WORKFLOW_PHASES.indexOf(phase);
      if (targetIdx <= currentIdx) continue;
      if (this.advanceTo(phase)) changed = true;
    }

    return changed;
  }

  onSkillFileRead(path: string): boolean {
    const match = path.match(/\/skills\/([^/]+)\/SKILL\.md$/);
    if (!match) return false;
    const phase = resolveSkillPhase(match[1], this.state);
    if (!phase) return false;
    // Guard against backward navigation: some skills (e.g. executing-tasks) serve
    // multiple phases. Re-reading their SKILL.md during a later phase (e.g. finalize)
    // must not reset workflow state. Rely on plan_tracker init or explicit /workflow-reset
    // to restart from scratch.
    const currentIdx = this.state.currentPhase ? WORKFLOW_PHASES.indexOf(this.state.currentPhase) : -1;
    const targetIdx = WORKFLOW_PHASES.indexOf(phase);
    if (targetIdx <= currentIdx) return false;
    return this.advanceTo(phase);
  }

  onFileWritten(path: string): boolean {
    if (!PLANS_DIR_RE.test(path)) return false;

    if (DESIGN_RE.test(path)) {
      // Only advance if we haven't already passed the brainstorm phase.
      // Writing a design doc during plan/execute/finalize (e.g., updating
      // the plan) must NOT reset workflow state.
      const curIdx = this.state.currentPhase ? WORKFLOW_PHASES.indexOf(this.state.currentPhase) : -1;
      if (curIdx > WORKFLOW_PHASES.indexOf("brainstorm")) {
        return this.recordArtifact("brainstorm", path);
      }
      let changed = false;
      changed = this.recordArtifact("brainstorm", path) || changed;
      // Activate brainstorm phase but do NOT auto-complete.
      // User confirms completion via the reviewable boundary prompt at agent_end.
      changed = this.advanceTo("brainstorm") || changed;
      return changed;
    }

    if (IMPLEMENTATION_RE.test(path)) {
      // Only advance if we haven't already passed the plan phase.
      const curIdx = this.state.currentPhase ? WORKFLOW_PHASES.indexOf(this.state.currentPhase) : -1;
      if (curIdx > WORKFLOW_PHASES.indexOf("plan")) {
        return this.recordArtifact("plan", path);
      }
      let changed = false;
      changed = this.recordArtifact("plan", path) || changed;
      // Activate plan phase but do NOT auto-complete.
      // User confirms completion via the reviewable boundary prompt at agent_end.
      changed = this.advanceTo("plan") || changed;
      return changed;
    }

    return false;
  }

  onPlanTrackerInit(): boolean {
    // Guard: don't advance if already in execute (prevents accidental resets).
    // Also refuse to jump over unresolved phases (e.g., plan still active).
    if (this.state.currentPhase === "execute") return false;
    return this.advanceTo("execute");
  }

  static reconstructFromBranch(branch: SessionEntry[]): WorkflowTrackerState | null {
    let last: WorkflowTrackerState | null = null;

    for (const entry of branch) {
      if (entry.type !== "custom") continue;
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
      if ((entry as any).customType !== WORKFLOW_TRACKER_ENTRY_TYPE) continue;
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
      const data = (entry as any).data as WorkflowTrackerState | undefined;
      if (data && typeof data === "object") {
        last = cloneState(data);
      }
    }

    return last;
  }
}
