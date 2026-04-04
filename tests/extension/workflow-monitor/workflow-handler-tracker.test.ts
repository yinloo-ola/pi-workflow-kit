import { beforeEach, describe, expect, test } from "vitest";
import { createWorkflowHandler, type WorkflowHandler } from "../../../extensions/workflow-monitor/workflow-handler";
import { computeBoundaryToPrompt } from "../../../extensions/workflow-monitor/workflow-tracker";

describe("WorkflowHandler workflow-tracker integration", () => {
  let handler: WorkflowHandler;

  beforeEach(() => {
    handler = createWorkflowHandler();
  });

  test("input /skill:writing-plans activates plan phase", () => {
    handler.handleInputText("/skill:writing-plans");
    expect(handler.getWorkflowState()?.currentPhase).toBe("plan");
  });

  test("marks prompted state for boundary phase (not current phase)", () => {
    handler.handleInputText("/skill:writing-plans");
    handler.handleInputText("/skill:executing-tasks");

    const stateBefore = handler.getWorkflowState()!;
    expect(stateBefore.currentPhase).toBe("execute");
    expect(computeBoundaryToPrompt(stateBefore)).toBe("plan_ready");

    const changed = handler.markWorkflowPrompted("plan");
    expect(changed).toBe(true);

    const stateAfter = handler.getWorkflowState()!;
    expect(stateAfter.prompted.plan).toBe(true);
    expect(computeBoundaryToPrompt(stateAfter)).toBeNull();
  });
});
