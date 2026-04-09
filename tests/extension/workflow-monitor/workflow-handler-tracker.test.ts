import { beforeEach, describe, expect, test } from "vitest";
import type { PlanTrackerDetails } from "../../../extensions/plan-tracker";
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

  test("plan tracker result enables non-code mode only for active non-code tasks", () => {
    const details: PlanTrackerDetails = {
      action: "update",
      tasks: [
        {
          name: "Document rollout",
          status: "in_progress",
          phase: "verify",
          type: "non-code",
          executeAttempts: 0,
          fixAttempts: 0,
        },
      ],
    };

    const changed = handler.handlePlanTrackerToolResult(details);

    expect(changed).toBe(true);
    expect(handler.getTddState().nonCodeMode).toBe(true);
  });

  test("plan tracker result disables non-code mode when active task is code", () => {
    handler.handlePlanTrackerToolResult({
      action: "update",
      tasks: [
        {
          name: "Document rollout",
          status: "in_progress",
          phase: "verify",
          type: "non-code",
          executeAttempts: 0,
          fixAttempts: 0,
        },
      ],
    });

    const changed = handler.handlePlanTrackerToolResult({
      action: "update",
      tasks: [
        {
          name: "Implement endpoint",
          status: "in_progress",
          phase: "execute",
          type: "code",
          executeAttempts: 1,
          fixAttempts: 0,
        },
      ],
    });

    expect(changed).toBe(true);
    expect(handler.getTddState().nonCodeMode).toBe(false);
  });

  test("plan tracker result completes execute phase when all tasks are terminal", () => {
    handler.handleInputText("/skill:writing-plans");
    handler.handlePlanTrackerToolCall({ action: "init" });
    handler.markWorkflowPrompted("plan");
    expect(handler.getWorkflowState()?.currentPhase).toBe("execute");

    const changed = handler.handlePlanTrackerToolResult({
      action: "update",
      tasks: [
        {
          name: "Task 1",
          status: "complete",
          phase: "complete",
          type: "code",
          executeAttempts: 1,
          fixAttempts: 0,
        },
        {
          name: "Task 2",
          status: "blocked",
          phase: "blocked",
          type: "non-code",
          executeAttempts: 0,
          fixAttempts: 1,
        },
      ],
    });

    expect(changed).toBe(true);
    expect(handler.getWorkflowState()?.phases.execute).toBe("complete");
    expect(computeBoundaryToPrompt(handler.getWorkflowState()!)).toBe("execution_complete");
  });
});
