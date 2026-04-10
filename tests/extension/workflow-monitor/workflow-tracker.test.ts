import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import { beforeEach, describe, expect, test } from "vitest";
import {
  parseSkillName,
  resolveSkillPhase,
  SKILL_TO_PHASE,
  WORKFLOW_PHASES,
  WorkflowTracker,
} from "../../../extensions/workflow-monitor/workflow-tracker";

describe("WorkflowTracker", () => {
  let tracker: WorkflowTracker;

  beforeEach(() => {
    tracker = new WorkflowTracker();
  });

  test("starts idle with all phases pending", () => {
    const s = tracker.getState();
    expect(s.currentPhase).toBeNull();
    for (const p of WORKFLOW_PHASES) expect(s.phases[p]).toBe("pending");
  });

  test("advancing to a later phase does NOT mark earlier phases as skipped", () => {
    tracker.advanceTo("execute");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("execute");
    expect(s.phases.brainstorm).toBe("pending");
    expect(s.phases.plan).toBe("pending");
    expect(s.phases.execute).toBe("active");
  });

  test("skipPhase marks a pending phase as skipped", () => {
    const changed = tracker.skipPhase("plan");
    expect(changed).toBe(true);
    expect(tracker.getState().phases.plan).toBe("skipped");
  });

  test("skipPhase marks an active phase as skipped", () => {
    tracker.advanceTo("plan");
    expect(tracker.getState().phases.plan).toBe("active");
    const changed = tracker.skipPhase("plan");
    expect(changed).toBe(true);
    expect(tracker.getState().phases.plan).toBe("skipped");
  });

  test("skipPhase returns false for a complete phase", () => {
    tracker.advanceTo("plan");
    tracker.completeCurrent();
    expect(tracker.getState().phases.plan).toBe("complete");
    const changed = tracker.skipPhase("plan");
    expect(changed).toBe(false);
    expect(tracker.getState().phases.plan).toBe("complete");
  });

  test("skipPhase returns false for an already-skipped phase", () => {
    tracker.skipPhase("plan");
    const changed = tracker.skipPhase("plan");
    expect(changed).toBe(false);
    expect(tracker.getState().phases.plan).toBe("skipped");
  });

  test("skipPhases skips multiple phases in one call", () => {
    tracker.skipPhases(["brainstorm", "plan"]);
    const s = tracker.getState();
    expect(s.phases.brainstorm).toBe("skipped");
    expect(s.phases.plan).toBe("skipped");
  });

  test("advanceTo backward triggers full reset and activates the target phase", () => {
    tracker.advanceTo("plan");
    tracker.recordArtifact("plan", "docs/plans/foo.md");
    tracker.markPrompted("plan");

    const result = tracker.advanceTo("brainstorm");

    const s = tracker.getState();
    expect(result).toBe(true);
    expect(s.currentPhase).toBe("brainstorm");
    expect(s.phases.brainstorm).toBe("active");
    // plan should be wiped by the reset
    expect(s.phases.plan).toBe("pending");
    expect(s.artifacts.plan).toBeNull();
    expect(s.prompted.plan).toBe(false);
  });

  test("advanceTo same phase is a no-op (prevents accidental resets)", () => {
    tracker.advanceTo("plan");
    tracker.completeCurrent();
    expect(tracker.getState().phases.plan).toBe("complete");

    const result = tracker.advanceTo("plan");

    const s = tracker.getState();
    expect(result).toBe(false);
    expect(s.currentPhase).toBe("plan");
    expect(s.phases.plan).toBe("complete");
  });

  test("completeCurrent marks current phase complete and keeps it as current until next advance", () => {
    tracker.advanceTo("plan");
    tracker.completeCurrent();
    const s = tracker.getState();
    expect(s.phases.plan).toBe("complete");
    expect(s.currentPhase).toBe("plan");
  });

  test("records artifacts per phase", () => {
    tracker.recordArtifact("brainstorm", "docs/plans/2026-02-10-x-design.md");
    expect(tracker.getState().artifacts.brainstorm).toBe("docs/plans/2026-02-10-x-design.md");
  });

  test("reset() restores tracker to empty state regardless of prior state", () => {
    tracker.advanceTo("execute");
    tracker.recordArtifact("plan", "docs/plans/2026-02-20-foo.md");
    tracker.markPrompted("brainstorm");

    tracker.reset();

    const s = tracker.getState();
    expect(s.currentPhase).toBeNull();
    for (const p of WORKFLOW_PHASES) expect(s.phases[p]).toBe("pending");
    for (const p of WORKFLOW_PHASES) expect(s.artifacts[p]).toBeNull();
    for (const p of WORKFLOW_PHASES) expect(s.prompted[p]).toBe(false);
  });
});

function custom(data: any): SessionEntry {
  return {
    type: "custom",
    id: "x",
    parentId: null,
    timestamp: Date.now(),
    customType: "workflow_tracker_state",
    data,
  } as any;
}

describe("WorkflowTracker detection helpers", () => {
  test("SKILL_TO_PHASE exposes expected base skill mappings", () => {
    expect(SKILL_TO_PHASE).toEqual({
      brainstorming: "brainstorm",
      "writing-plans": "plan",
      "using-git-worktrees": "plan",
      "executing-tasks": "execute",
      "systematic-debugging": "execute",
      "dispatching-parallel-agents": "execute",
      "test-driven-development": "execute",
      "receiving-code-review": "finalize",
    });
  });

  test("resolveSkillPhase maps executing-tasks to finalize once execute is complete", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("execute");
    tracker.completeCurrent();

    expect(resolveSkillPhase("executing-tasks", tracker.getState())).toBe("finalize");
  });

  test('parseSkillName extracts /skill and <skill name="...">', () => {
    expect(parseSkillName("/skill:writing-plans blah")).toBe("writing-plans");
    expect(parseSkillName('  <skill name="brainstorming" location="/x">')).toBe("brainstorming");
    expect(parseSkillName("nope /skill:writing-plans")).toBeNull();
  });

  test("detects /skill:brainstorming and advances to brainstorm", () => {
    const tracker = new WorkflowTracker();
    const changed = tracker.onInputText("/skill:brainstorming");
    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("brainstorm");
  });

  test("detects /skill token with trailing text at start of a later line", () => {
    const tracker = new WorkflowTracker();
    const changed = tracker.onInputText("status update\n/skill:writing-plans draft initial breakdown");
    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("plan");
  });

  test("detects /skill token on later indented line in multi-line input", () => {
    const tracker = new WorkflowTracker();
    const changed = tracker.onInputText("first line\n  /skill:executing-tasks run tasks");
    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("execute");
  });

  test("continues scanning when first recognized /skill line is a no-op and later line advances", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("plan");

    const changed = tracker.onInputText("/skill:brainstorming\n/skill:executing-tasks run tasks");

    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("execute");
  });

  test("ignores unknown /skill line and advances on later valid /skill line", () => {
    const tracker = new WorkflowTracker();

    const changed = tracker.onInputText("/skill:not-a-real-skill\n/skill:writing-plans");

    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("plan");
  });

  test("does not detect /skill token when not at line start", () => {
    const tracker = new WorkflowTracker();
    const changed = tracker.onInputText("please run /skill:writing-plans draft initial breakdown");
    expect(changed).toBe(false);
    expect(tracker.getState().currentPhase).toBeNull();
  });

  test("onSkillFileRead does not reset state when re-reading a skill used in an earlier phase (finalize scenario)", () => {
    // executing-tasks is mapped to "execute" but is also used during finalize.
    // Reading its SKILL.md while in finalize must NOT trigger a backward reset.
    const tracker = new WorkflowTracker();
    tracker.advanceTo("execute");
    tracker.completeCurrent();
    tracker.advanceTo("finalize");
    expect(tracker.getState().currentPhase).toBe("finalize");

    const changed = tracker.onSkillFileRead("/home/pi/workspace/pi-workflow-kit/skills/executing-tasks/SKILL.md");

    expect(changed).toBe(false);
    const s = tracker.getState();
    expect(s.currentPhase).toBe("finalize");
    expect(s.phases.execute).toBe("complete");
    expect(s.phases.finalize).toBe("active");
  });

  test("onInputText advances executing-tasks to finalize once execute is complete", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("execute");
    tracker.completeCurrent();

    const changed = tracker.onInputText("/skill:executing-tasks to finalize (PR, cleanup, archive).");

    expect(changed).toBe(true);
    const s = tracker.getState();
    expect(s.currentPhase).toBe("finalize");
    expect(s.phases.execute).toBe("complete");
    expect(s.phases.finalize).toBe("active");
  });

  test("onInputText does not reset state when re-invoking a skill in the current finalize phase", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("execute");
    tracker.completeCurrent();
    tracker.advanceTo("finalize");
    expect(tracker.getState().currentPhase).toBe("finalize");

    const changed = tracker.onInputText("/skill:executing-tasks to finalize (PR, cleanup, archive).");

    expect(changed).toBe(false);
    const s = tracker.getState();
    expect(s.currentPhase).toBe("finalize");
    expect(s.phases.execute).toBe("complete");
    expect(s.phases.finalize).toBe("active");
  });

  test("onSkillFileRead advances phase for recognized skill file paths", () => {
    const tracker = new WorkflowTracker();

    const changed = tracker.onSkillFileRead("/home/pi/workspace/pi-workflow-kit/skills/writing-plans/SKILL.md");

    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("plan");
  });

  test("onSkillFileRead returns false for non-skill paths", () => {
    const tracker = new WorkflowTracker();

    expect(tracker.onSkillFileRead("/home/pi/workspace/pi-workflow-kit/skills/writing-plans/README.md")).toBe(false);
    expect(tracker.onSkillFileRead("docs/plans/2026-02-11-foo-implementation.md")).toBe(false);
    expect(tracker.getState().currentPhase).toBeNull();
  });

  test("detects writing a design doc artifact and advances to brainstorm", () => {
    const tracker = new WorkflowTracker();
    tracker.onFileWritten("docs/plans/2026-02-10-foo-design.md");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("brainstorm");
    expect(s.artifacts.brainstorm).toBe("docs/plans/2026-02-10-foo-design.md");
  });

  test("detects writing an implementation plan artifact and advances to plan", () => {
    const tracker = new WorkflowTracker();
    tracker.onFileWritten("docs/plans/2026-02-11-foo-implementation.md");
    const s = tracker.getState();
    expect(s.currentPhase).toBe("plan");
    expect(s.artifacts.plan).toBe("docs/plans/2026-02-11-foo-implementation.md");
  });

  test("detects plan_tracker init and advances to execute", () => {
    const tracker = new WorkflowTracker();
    tracker.onPlanTrackerInit();
    expect(tracker.getState().currentPhase).toBe("execute");
  });

  test("onSkillFileRead advances executing-tasks to finalize once execute is complete", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("execute");
    tracker.completeCurrent();

    const changed = tracker.onSkillFileRead("/home/pi/workspace/pi-workflow-kit/skills/executing-tasks/SKILL.md");

    expect(changed).toBe(true);
    expect(tracker.getState().currentPhase).toBe("finalize");
  });

  test("reconstructFromBranch returns last saved state", () => {
    const tracker = new WorkflowTracker();
    tracker.advanceTo("plan");
    const s1 = tracker.getState();

    tracker.advanceTo("execute");
    const s2 = tracker.getState();

    const reconstructed = WorkflowTracker.reconstructFromBranch([
      custom(s1),
      { type: "message" } as any,
      custom(s2),
    ] as any);

    expect(reconstructed?.currentPhase).toBe("execute");
  });
});
