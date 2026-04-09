import { describe, expect, test, vi } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import {
  type Phase,
  type PhaseStatus,
  WORKFLOW_PHASES,
  WORKFLOW_TRACKER_ENTRY_TYPE,
  type WorkflowTrackerState,
} from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler } from "./test-helpers";

function createWorkflowState(
  overrides: Partial<Record<Phase, PhaseStatus>>,
  currentPhase: Phase | null = null,
): WorkflowTrackerState {
  const phases = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, overrides[p] ?? "pending"])) as Record<
    Phase,
    PhaseStatus
  >;
  const artifacts = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, null])) as Record<Phase, string | null>;
  const prompted = Object.fromEntries(WORKFLOW_PHASES.map((p) => [p, false])) as Record<Phase, boolean>;
  return { phases, currentPhase, artifacts, prompted };
}

function createCtx(state: WorkflowTrackerState, hasUI: boolean, selectResponses: string[] = []) {
  let selectIdx = 0;
  const editorTexts: string[] = [];
  return {
    editorTexts,
    ctx: {
      hasUI,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: state,
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: vi.fn().mockImplementation(async () => selectResponses[selectIdx++]),
        setEditorText: (text: string) => editorTexts.push(text),
        notify: () => {},
      },
    },
  };
}

async function setupExtension(_state: WorkflowTrackerState) {
  const fake = createFakePi({ withAppendEntry: true });
  workflowMonitorExtension(fake.api as any);

  const onSessionStart = getSingleHandler(fake.handlers, "session_start");
  const onToolCall = getSingleHandler(fake.handlers, "tool_call");
  const onToolResult = getSingleHandler(fake.handlers, "tool_result");

  return { fake, onSessionStart, onToolCall, onToolResult };
}

describe("completion-action gating on bash commands", () => {
  test("commit during brainstorm does not prompt completion gate", async () => {
    const state = createWorkflowState(
      { brainstorm: "active" },
      "brainstorm",
    );

    const { onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true, ["Do finalize now"]);

    await onSessionStart({}, ctx);

    await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'docs: brainstorm'" } },
      ctx,
    );

    expect(ctx.ui.select).not.toHaveBeenCalled();
  });

  test("interactive commit with unresolved finalize -> Do now blocks + editor set to /skill:executing-tasks", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { fake, onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx, editorTexts } = createCtx(state, true, ["Do finalize now"]);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'feat: done'" } },
      ctx,
    );

    expect(ctx.ui.select).toHaveBeenCalled();
    expect(result).toEqual({ blocked: true });
    expect(editorTexts.length).toBeGreaterThan(0);
    expect(editorTexts.at(-1)).toBe("/skill:executing-tasks");
  });

  test("interactive commit with unresolved finalize -> Skip allows command, marks finalize skipped, and records waiver", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { fake, onSessionStart, onToolCall, onToolResult } = await setupExtension(state);
    const { ctx } = createCtx(state, true, ["Skip finalize"]);

    await onSessionStart({}, ctx);

    const toolCallResult = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'feat: done'" } },
      ctx,
    );

    expect(toolCallResult?.blocked).not.toBe(true);

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.phases.finalize).toBe("skipped");

    const resultEvent = {
      toolCallId: "tc1",
      toolName: "bash",
      input: { command: "git commit -m 'feat: done'" },
      content: [{ type: "text", text: "commit created" }],
      details: { exitCode: 0 },
    };
    const toolResultOutput = await onToolResult(resultEvent, ctx);

    if (toolResultOutput?.content) {
      const allText = toolResultOutput.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");
      expect(allText).not.toContain("commit-without-verification");
      expect(allText).not.toContain("without running verification");
    }
  });

  test("interactive push with unresolved finalize -> Skip allows and marks finalize skipped", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { fake, onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true, ["Skip finalize"]);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git push origin main" } },
      ctx,
    );

    expect(result?.blocked).not.toBe(true);

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.phases.finalize).toBe("skipped");
  });

  test("interactive gh pr create with unresolved finalize -> cancel blocks command", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { fake, onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true, ["Cancel"]);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "gh pr create --title 'feat'" } },
      ctx,
    );

    expect(result).toEqual({ blocked: true });
  });

  test("non-interactive commit does not prompt and preserves warning behavior", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { fake, onSessionStart, onToolCall, onToolResult } = await setupExtension(state);
    const { ctx } = createCtx(state, false);

    await onSessionStart({}, ctx);

    const toolCallResult = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'feat: stuff'" } },
      ctx,
    );

    expect(ctx.ui.select).not.toHaveBeenCalled();
    expect(toolCallResult?.blocked).not.toBe(true);

    const resultEvent = {
      toolCallId: "tc1",
      toolName: "bash",
      input: { command: "git commit -m 'feat: stuff'" },
      content: [{ type: "text", text: "commit created" }],
      details: { exitCode: 0 },
    };
    const toolResultOutput = await onToolResult(resultEvent, ctx);

    expect(toolResultOutput?.content).toBeDefined();
    const allText = toolResultOutput.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
    expect(allText).toContain("verification");
  });

  test("non-matching bash commands are not gated", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );
    const { onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "ls -la" } },
      ctx,
    );

    expect(ctx.ui.select).not.toHaveBeenCalled();
    expect(result?.blocked).not.toBe(true);
  });

  test("commit during execute phase does not gate (finalize not started yet)", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "execute",
    );
    const { onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'final'" } },
      ctx,
    );

    expect(ctx.ui.select).not.toHaveBeenCalled();
    expect(result?.blocked).not.toBe(true);
  });

  test("git commit during active execution is not gated (suppressed while executing)", async () => {
    const state = createWorkflowState(
      { brainstorm: "complete", plan: "complete", execute: "active" },
      "execute",
    );
    const { onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true);

    await onSessionStart({}, ctx);

    const result = await onToolCall(
      { toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'wip'" } },
      ctx,
    );

    expect(ctx.ui.select).not.toHaveBeenCalled();
    expect(result?.blocked).not.toBe(true);
  });

  test("completion gate prompts with string labels (not objects)", async () => {
    const state = createWorkflowState(
      {
        brainstorm: "complete",
        plan: "complete",
        execute: "complete",
        finalize: "pending",
      },
      "finalize",
    );

    const { onSessionStart, onToolCall } = await setupExtension(state);
    const { ctx } = createCtx(state, true, ["Skip finalize"]);

    await onSessionStart({}, ctx);

    await onToolCall({ toolCallId: "tc1", toolName: "bash", input: { command: "git commit -m 'x'" } }, ctx);

    expect(ctx.ui.select).toHaveBeenCalledTimes(1);
    const [_title, options] = (ctx.ui.select as any).mock.calls[0];
    expect(options).toEqual(["Do finalize now", "Skip finalize", "Cancel"]);
  });
});
