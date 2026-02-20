import { describe, expect, test } from "vitest";
import {
  getUnresolvedPhases,
  getUnresolvedPhasesBefore,
  isPhaseUnresolved,
} from "../../../extensions/workflow-monitor/skip-confirmation";
import {
  type Phase,
  type PhaseStatus,
  WORKFLOW_PHASES,
  type WorkflowTrackerState,
} from "../../../extensions/workflow-monitor/workflow-tracker";

function createState(overrides: Partial<Record<Phase, PhaseStatus>>): WorkflowTrackerState {
  const phases = Object.fromEntries(WORKFLOW_PHASES.map((phase) => [phase, overrides[phase] ?? "complete"])) as Record<
    Phase,
    PhaseStatus
  >;

  const artifacts = Object.fromEntries(WORKFLOW_PHASES.map((phase) => [phase, null])) as Record<Phase, string | null>;

  const prompted = Object.fromEntries(WORKFLOW_PHASES.map((phase) => [phase, false])) as Record<Phase, boolean>;

  return {
    phases,
    currentPhase: null,
    artifacts,
    prompted,
  };
}

describe("skip-confirmation helpers", () => {
  test("treats only pending as unresolved; active, complete, skipped are resolved", () => {
    expect(isPhaseUnresolved("pending")).toBe(true);
    expect(isPhaseUnresolved("active")).toBe(false);
    expect(isPhaseUnresolved("complete")).toBe(false);
    expect(isPhaseUnresolved("skipped")).toBe(false);
  });

  test("returns unresolved phases strictly before target (active is not unresolved)", () => {
    const state = createState({
      plan: "pending",
      execute: "active",
      verify: "pending",
    });

    // execute is "active" (already engaged) so not unresolved; only plan is
    expect(getUnresolvedPhasesBefore("verify", state)).toEqual(["plan"]);
  });

  test("returns empty list for brainstorm boundary target", () => {
    const state = createState({ brainstorm: "pending" });

    expect(getUnresolvedPhasesBefore("brainstorm", state)).toEqual([]);
  });

  test("returns only unresolved phases before finish (active is not unresolved)", () => {
    const state = createState({
      brainstorm: "pending",
      plan: "complete",
      review: "active",
      finish: "pending",
    });

    // review is "active" (engaged), so only brainstorm is unresolved
    expect(getUnresolvedPhasesBefore("finish", state)).toEqual(["brainstorm"]);
  });

  test("returns empty list when no prior phases are unresolved", () => {
    const state = createState({
      brainstorm: "complete",
      plan: "skipped",
      execute: "complete",
      review: "complete",
      finish: "pending",
    });

    expect(getUnresolvedPhasesBefore("finish", state)).toEqual([]);
  });

  test("excludes active and target phase — only pending phases before target are unresolved", () => {
    const state = createState({
      brainstorm: "active",
      plan: "pending",
      execute: "pending",
    });

    // brainstorm is "active" (engaged); only pending plan is unresolved
    expect(getUnresolvedPhasesBefore("execute", state)).toEqual(["plan"]);
  });

  test("returns empty list for runtime-invalid target value", () => {
    const state = createState({
      brainstorm: "pending",
      plan: "active",
      review: "pending",
    });

    expect(() => getUnresolvedPhasesBefore("invalid-phase" as Phase, state)).not.toThrow();
    expect(getUnresolvedPhasesBefore("invalid-phase" as Phase, state)).toEqual([]);
  });

  test("excludes skipped phases from unresolved lists", () => {
    const state = createState({
      brainstorm: "skipped",
      plan: "pending",
      execute: "complete",
    });

    expect(getUnresolvedPhases(["brainstorm", "plan", "execute"], state)).toEqual(["plan"]);
  });

  test("filters unresolved phases from required set in input order (active is not unresolved)", () => {
    const state = createState({
      review: "active",
      finish: "pending",
      plan: "complete",
    });

    // review is "active" (engaged), so only finish (pending) is unresolved
    expect(getUnresolvedPhases(["review", "finish", "plan"], state)).toEqual(["finish"]);
  });
});
