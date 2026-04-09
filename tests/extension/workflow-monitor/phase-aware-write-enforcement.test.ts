import { describe, expect, test } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import { WORKFLOW_TRACKER_ENTRY_TYPE } from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler } from "./test-helpers";

describe("phase-aware file write enforcement", () => {
  test("blocks writes outside docs/plans during brainstorm phase", async () => {
    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolCall = getSingleHandler(fake.handlers, "tool_call");

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
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "brainstorm",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    const res = await onToolCall({ toolCallId: "w1", toolName: "write", input: { path: "extensions/foo.ts", content: "x" } }, ctx);

    expect(res).toEqual({
      blocked: true,
      reason: expect.stringContaining("PROCESS VIOLATION"),
    });
    expect((res as any).reason).toContain("brainstorm");
    expect((res as any).reason).toContain("docs/plans/");
  });

  test("blocks writes outside docs/plans during plan phase", async () => {
    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolCall = getSingleHandler(fake.handlers, "tool_call");

    const ctx = {
      hasUI: false,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: {
              phases: {
                brainstorm: "complete",
                plan: "active",
                execute: "pending",
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "plan",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    const res = await onToolCall({ toolCallId: "w2", toolName: "edit", input: { path: "src/bar.ts", edits: [] } }, ctx);

    expect(res).toEqual({
      blocked: true,
      reason: expect.stringContaining("PROCESS VIOLATION"),
    });
    expect((res as any).reason).toContain("plan");
  });

  test("writing to ./docs/plans is allowed during brainstorm", async () => {
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
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "brainstorm",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    const callRes = await onToolCall({ toolCallId: "p1", toolName: "write", input: { path: "./docs/plans/x.md", content: "x" } }, ctx);
    expect(callRes).toBeUndefined();

    const res = await onToolResult(
      {
        toolCallId: "p1",
        toolName: "write",
        input: { path: "./docs/plans/x.md", content: "x" },
        content: [{ type: "text", text: "ok" }],
        details: {},
      },
      ctx,
    );

    const text = (res?.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");

    expect(text).not.toContain("⚠️ PROCESS VIOLATION");
  });

  test("writing to absolute path under docs/plans/ is allowed during brainstorm", async () => {
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
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "brainstorm",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    const plansPath = `${process.cwd()}/docs/plans/design.md`;

    const callRes = await onToolCall({ toolCallId: "abs1", toolName: "write", input: { path: plansPath, content: "x" } }, ctx);
    expect(callRes).toBeUndefined();

    const res = await onToolResult(
      {
        toolCallId: "abs1",
        toolName: "write",
        input: { path: plansPath, content: "x" },
        content: [{ type: "text", text: "ok" }],
        details: {},
      },
      ctx,
    );

    const text = (res?.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");

    expect(text).not.toContain("⚠️ PROCESS VIOLATION");
  });

  test("absolute path containing docs/plans is NOT allowed unless under cwd", async () => {
    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onToolCall = getSingleHandler(fake.handlers, "tool_call");

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
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "brainstorm",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: { setWidget: () => {} },
    };

    await onSessionStart({}, ctx);

    const evilPath = "/tmp/evil/docs/plans/attack.ts";

    const res = await onToolCall({ toolCallId: "e1", toolName: "write", input: { path: evilPath, content: "x" } }, ctx);

    expect(res).toEqual({
      blocked: true,
      reason: expect.stringContaining("PROCESS VIOLATION"),
    });
  });
});
