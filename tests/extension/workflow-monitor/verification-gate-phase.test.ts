import { describe, expect, test } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import { WORKFLOW_TRACKER_ENTRY_TYPE } from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler } from "./test-helpers";

describe("verification gate phase-awareness", () => {
  test("does not inject verification warning for git commit during brainstorm", async () => {
    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolCall = getSingleHandler(fake.handlers, "tool_call");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: {
              phases: {
                brainstorm: "active",
                plan: "pending",
                execute: "pending",
                finalize: "pending",
              },
              currentPhase: "brainstorm",
              artifacts: { brainstorm: null, plan: null, execute: null, finalize: null },
              prompted: { brainstorm: false, plan: false, execute: false, finalize: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    await onToolCall({ toolCallId: "c1", toolName: "bash", input: { command: "git commit -m 'docs'" } }, ctx);

    const res = await onToolResult(
      {
        toolCallId: "c1",
        toolName: "bash",
        input: { command: "git commit -m 'docs'" },
        content: [{ type: "text", text: "ok" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    const text = (res?.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");

    expect(text).not.toContain("VERIFICATION REQUIRED");
    expect(text).not.toContain("without running verification");
  });
});
