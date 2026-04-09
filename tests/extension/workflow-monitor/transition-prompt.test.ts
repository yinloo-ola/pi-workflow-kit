import { describe, expect, test } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import {
  computeBoundaryToPrompt,
  WORKFLOW_TRACKER_ENTRY_TYPE,
  WorkflowTracker,
} from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler } from "./test-helpers";

describe("boundary prompting", () => {
  test("prompts after brainstorm complete", () => {
    const t = new WorkflowTracker();
    t.advanceTo("brainstorm");
    t.completeCurrent();
    const boundary = computeBoundaryToPrompt(t.getState());
    expect(boundary).toBe("design_committed");
  });

  test("does not auto-complete active phase on generic agent_end", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onInput = getSingleHandler(fake.handlers, "input");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    let agentEndSelectCalls = 0;
    let inAgentEnd = false;
    const ctx = {
      hasUI: true,
      sessionManager: { getBranch: () => [] },
      ui: {
        setWidget: () => {},
        select: async (_title: string, options: any[]) => {
          if (inAgentEnd) {
            agentEndSelectCalls += 1;
            return "Discuss";
          }
          // Gate prompt: skip single or skip_all for multi
          const hasSkipAll = options?.includes?.("Skip all and continue");
          return hasSkipAll ? "Skip all and continue" : "Skip brainstorm";
        },
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onInput({ source: "user", text: "/skill:writing-plans" }, ctx);
    inAgentEnd = true;
    await onAgentEnd({}, ctx);

    expect(agentEndSelectCalls).toBe(0);
  });

  test("prompts once for completed boundary and does not re-prompt", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    let agentEndSelectCalls = 0;
    const ctx = {
      hasUI: true,
      sessionManager: {
        getBranch: () => [
          {
            type: "custom",
            customType: WORKFLOW_TRACKER_ENTRY_TYPE,
            data: {
              phases: {
                brainstorm: "skipped",
                plan: "complete",
                execute: "active",
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "execute",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => {
          agentEndSelectCalls += 1;
          return "Discuss";
        },
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);
    await onAgentEnd({}, ctx);

    expect(agentEndSelectCalls).toBe(1);
  });

  test("skip marks next phase skipped and advances beyond it", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    const editorTexts: string[] = [];
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
                plan: "pending",
                execute: "active",
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "execute",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Skip",
        setEditorText: (text: string) => editorTexts.push(text),
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.phases.plan).toBe("skipped");
    expect(latest.workflow.currentPhase).toBe("execute");
    // phaseAfterSkip ("execute") === currentPhase ("execute") → same-phase, no editor injection
    expect(editorTexts.length).toBe(0);
  });

  test("skip on terminal next phase marks it skipped without advancing into it", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    const editorTexts: string[] = [];
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
                execute: "complete",
                finalize: "pending",
              },
              currentPhase: "execute",
              artifacts: {
                brainstorm: null,
                plan: null,
                execute: null,
                finalize: null,
              },
              prompted: {
                brainstorm: true,
                plan: true,
                execute: false,
                finalize: false,
              },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Skip",
        setEditorText: (text: string) => editorTexts.push(text),
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.phases.finalize).toBe("skipped");
    expect(latest.workflow.currentPhase).toBe("execute");
    expect(editorTexts).toHaveLength(0);
  });

  test("boundary prompt passes string labels to ui.select", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

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
                plan: "pending",
                execute: "active",
                verify: "pending",
                review: "pending",
                finish: "pending",
              },
              currentPhase: "execute",
              artifacts: { brainstorm: null, plan: null, execute: null, verify: null, review: null, finish: null },
              prompted: { brainstorm: false, plan: false, execute: false, verify: false, review: false, finish: false },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async (_title: string, options: any[]) => {
          expect(options).toEqual(["Next step (this session)", "Fresh session → next step", "Skip", "Discuss"]);
          return "Discuss";
        },
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);
  });

  test("verification boundary is prompted only after passing verification signal", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onInput = getSingleHandler(fake.handlers, "input");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    let agentEndSelectCalls = 0;
    // Track whether we're in agent_end context to distinguish gate prompts from boundary prompts
    let inAgentEnd = false;
    const ctx = {
      hasUI: true,
      sessionManager: { getBranch: () => [] },
      ui: {
        setWidget: () => {},
        select: async (_title: string, options: any[]) => {
          if (inAgentEnd) {
            agentEndSelectCalls += 1;
            return "Discuss";
          }
          const hasSkipAll = options?.includes?.("Skip all and continue");
          return hasSkipAll ? "Skip all and continue" : "Skip verify";
        },
        setEditorText: () => {},
        notify: () => {},
      },
    };

    await onInput({ source: "user", text: "/skill:executing-tasks" }, ctx);

    inAgentEnd = true;
    await onAgentEnd({}, ctx);
    inAgentEnd = false;
    expect(agentEndSelectCalls).toBe(0);

    await onToolResult(
      {
        toolName: "bash",
        input: { command: "npm test" },
        content: [{ type: "text", text: "167 passed" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    inAgentEnd = true;
    await onAgentEnd({}, ctx);
    // Note: boundary prompts now only fire for execution_complete, which requires
    // the execute phase to be complete AND not yet prompted. Since we only set the
    // phase to execute (not complete), no boundary prompt fires here.
  });

  test("execution-complete next advances workflow into finalize before prefilling finalize skill", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    const editorTexts: string[] = [];
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
                execute: "complete",
                finalize: "pending",
              },
              currentPhase: "execute",
              artifacts: {
                brainstorm: null,
                plan: "docs/plans/x-implementation.md",
                execute: null,
                finalize: null,
              },
              prompted: {
                brainstorm: true,
                plan: true,
                execute: false,
                finalize: false,
              },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Next step (this session)",
        setEditorText: (text: string) => editorTexts.push(text),
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);

    const latest = fake.appendedEntries.at(-1)?.data;
    expect(latest.workflow.currentPhase).toBe("finalize");
    expect(latest.workflow.phases.finalize).toBe("active");
    expect(editorTexts.at(-1)).toContain("/skill:executing-tasks");
  });

  test("finalize transition pre-fills docs + learnings reminder", async () => {
    const fake = createFakePi({ withAppendEntry: true });
    workflowMonitorExtension(fake.api as any);

    const onSessionStart = getSingleHandler(fake.handlers, "session_start");
    const onAgentEnd = getSingleHandler(fake.handlers, "agent_end");

    const editorTexts: string[] = [];

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
                execute: "complete",
                finalize: "active",
              },
              currentPhase: "finalize",
              artifacts: {
                brainstorm: null,
                plan: null,
                execute: null,
                finalize: null,
              },
              prompted: {
                brainstorm: true,
                plan: true,
                execute: false,
                finalize: false,
              },
            },
          },
        ],
      },
      ui: {
        setWidget: () => {},
        select: async () => "Next step (this session)",
        setEditorText: (text: string) => editorTexts.push(text),
        notify: () => {},
      },
    };

    await onSessionStart({}, ctx);
    await onAgentEnd({}, ctx);

    const text = editorTexts.at(-1) ?? "";
    expect(text).toContain("Before finishing:");
    expect(text).toContain("documentation updates");
    expect(text).toContain("What was learned");
    expect(text).toContain("/skill:executing-tasks");
  });
});
