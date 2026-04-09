import { describe, expect, test } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import { PLAN_TRACKER_TOOL_NAME } from "../../../extensions/constants";
import { WORKFLOW_TRACKER_ENTRY_TYPE } from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler } from "./test-helpers";

describe("workflow monitor plan-tracker integration", () => {
  test("plan_tracker results persist non-code mode from the active task", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: true,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: {
              phases: {
                brainstorm: "complete",
                plan: "complete",
                execute: "active",
                finalize: "pending",
              },
              currentPhase: "execute",
              artifacts: { brainstorm: null, plan: null, execute: null, finalize: null },
              prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Discuss",
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onToolResult(
      {
        toolCallId: "pt1",
        toolName: PLAN_TRACKER_TOOL_NAME,
        input: { action: "update", index: 1, phase: "verify" },
        content: [{ type: "text", text: "ok" }],
        details: {
          action: "update",
          tasks: [
            {
              name: "Implement feature",
              status: "complete",
              phase: "complete",
              type: "code",
              executeAttempts: 1,
              fixAttempts: 0,
            },
            {
              name: "Update docs",
              status: "in_progress",
              phase: "verify",
              type: "non-code",
              executeAttempts: 1,
              fixAttempts: 0,
            },
          ],
        },
      },
      ctx,
    );

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.tdd.nonCodeMode).toBe(true);
  });

  test("plan_tracker results mark execute complete when all tasks are terminal", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: true,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: {
              phases: {
                brainstorm: "complete",
                plan: "complete",
                execute: "active",
                finalize: "pending",
              },
              currentPhase: "execute",
              artifacts: { brainstorm: null, plan: null, execute: null, finalize: null },
              prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Discuss",
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onToolResult(
      {
        toolCallId: "pt2",
        toolName: PLAN_TRACKER_TOOL_NAME,
        input: { action: "update", index: 1, status: "complete" },
        content: [{ type: "text", text: "done" }],
        details: {
          action: "update",
          tasks: [
            {
              name: "Implement feature",
              status: "complete",
              phase: "complete",
              type: "code",
              executeAttempts: 1,
              fixAttempts: 0,
            },
            {
              name: "Update docs",
              status: "blocked",
              phase: "blocked",
              type: "non-code",
              executeAttempts: 1,
              fixAttempts: 1,
            },
          ],
        },
      },
      ctx,
    );

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.phases.execute).toBe("complete");
  });
});
