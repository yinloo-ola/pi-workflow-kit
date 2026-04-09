import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, test } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";
import {
  DEBUG_DEFAULTS,
  TDD_DEFAULTS,
  VERIFICATION_DEFAULTS,
  type SuperpowersStateSnapshot,
} from "../../../extensions/workflow-monitor/workflow-handler";
import { type WorkflowTrackerState } from "../../../extensions/workflow-monitor/workflow-tracker";
import { createFakePi, getSingleHandler, withTempCwd } from "./test-helpers";

function getWorkflowNextCommand() {
  let command: any;
  const fakePi: any = {
    on() {},
    registerTool() {},
    appendEntry() {},
    registerCommand(name: string, opts: any) {
      if (name === "workflow-next") command = opts;
    },
  };

  workflowMonitorExtension(fakePi);
  expect(command).toBeTruthy();
  return command;
}

/**
 * Boots the extension in a temp dir, seeds internal workflow state via
 * session_start reconstruction, and returns the workflow-next command handler
 * along with a base ctx for further customization.
 */
function setupWithState(seedState: Partial<SuperpowersStateSnapshot> = {}) {
  const appendedEntries: Array<{ customType: string; data: any }> = [];
  let workflowNextHandler: any;
  const handlers = new Map<string, any[]>();

  const fakePi: any = {
    on(event: string, handler: any) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    registerTool() {},
    appendEntry(customType: string, data: any) {
      appendedEntries.push({ customType, data });
    },
    registerCommand(name: string, opts: any) {
      if (name === "workflow-next") workflowNextHandler = opts.handler;
    },
  };

  workflowMonitorExtension(fakePi);

  // Seed internal handler via session_start → reconstructState path.
  const snapshot: SuperpowersStateSnapshot = {
    workflow: seedState.workflow ?? {
      phases: { brainstorm: "pending", plan: "pending", execute: "pending", finalize: "pending" },
      currentPhase: null,
      artifacts: { brainstorm: null, plan: null, execute: null, finalize: null },
      prompted: { brainstorm: false, plan: false, execute: false, finalize: false },
    },
    tdd: seedState.tdd ?? { ...TDD_DEFAULTS, testFiles: [], sourceFiles: [] },
    debug: seedState.debug ?? { ...DEBUG_DEFAULTS },
    verification: seedState.verification ?? { ...VERIFICATION_DEFAULTS },
  };

  const sessionEntries = [
    { type: "custom", customType: "superpowers_state", data: snapshot },
  ];

  // Trigger session_start to reconstruct state into the internal handler
  const sessionStartHandlers = handlers.get("session_start") ?? [];
  const baseCtx: any = {
    hasUI: true,
    sessionManager: {
      getSessionFile: () => "/tmp/session.jsonl",
      getBranch: () => sessionEntries,
    },
    ui: { setWidget: () => {} },
  };

  for (const h of sessionStartHandlers) {
    h({}, baseCtx);
  }

  return { appendedEntries, workflowNextHandler, snapshot, baseCtx };
}

describe("/workflow-next", () => {
  test("creates new session and prefills kickoff message", async () => {
    let handler: any;
    const fakePi: any = {
      on() {},
      registerTool() {},
      appendEntry() {},
      registerCommand(_name: string, opts: any) {
        handler = opts.handler;
      },
    };

    workflowMonitorExtension(fakePi);

    const calls: any[] = [];
    const ctx: any = {
      hasUI: true,
      sessionManager: { getSessionFile: () => "/tmp/session.jsonl" },
      ui: {
        setEditorText: (t: string) => calls.push(["setEditorText", t]),
        notify: () => {},
      },
      newSession: async () => ({ cancelled: false }),
    };

    await handler("plan docs/plans/2026-02-10-x-design.md", ctx);

    expect(calls[0][0]).toBe("setEditorText");
    expect(calls[0][1]).toMatch(/Continue from artifact: docs\/plans\/2026-02-10-x-design\.md/);
    expect(calls[0][1]).toContain("/skill:writing-plans");
  });

  test("prefills actionable finalize kickoff", async () => {
    let handler: any;
    const fakePi: any = {
      on() {},
      registerTool() {},
      appendEntry() {},
      registerCommand(_name: string, opts: any) {
        handler = opts.handler;
      },
    };

    workflowMonitorExtension(fakePi);

    const calls: any[] = [];
    const ctx: any = {
      hasUI: true,
      sessionManager: { getSessionFile: () => "/tmp/session.jsonl" },
      ui: {
        setEditorText: (t: string) => calls.push(["setEditorText", t]),
        notify: () => {},
      },
      newSession: async () => ({ cancelled: false }),
    };

    await handler("finalize docs/plans/2026-02-10-x-implementation.md", ctx);

    expect(calls[0][1]).toContain("Continue from artifact: docs/plans/2026-02-10-x-implementation.md");
    expect(calls[0][1]).toContain("/skill:executing-tasks");
    expect(calls[0][1]).toContain("Finalize the completed work");
  });

  test("returns all workflow phases when no args are typed", async () => {
    const command = getWorkflowNextCommand();
    const items = await command.getArgumentCompletions("");

    expect(items).toEqual([
      { value: "brainstorm", label: "brainstorm" },
      { value: "plan", label: "plan" },
      { value: "execute", label: "execute" },
      { value: "finalize", label: "finalize" },
    ]);
  });

  test("keeps suggesting phases until the first arg is an exact valid phase", async () => {
    const command = getWorkflowNextCommand();
    const items = await command.getArgumentCompletions("pla docs/plans/");

    expect(items).toEqual([{ value: "plan", label: "plan" }]);
  });

  test("suggests only design artifacts for plan phase", async () => {
    const tempDir = withTempCwd();
    const plansDir = path.join(tempDir, "docs", "plans");
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-implementation.md"), "");

    const command = getWorkflowNextCommand();
    const items = await command.getArgumentCompletions("plan ");

    expect(items).toEqual([
      {
        value: "docs/plans/2026-04-09-alpha-design.md",
        label: "docs/plans/2026-04-09-alpha-design.md",
      },
    ]);
  });

  test("filters plan artifact suggestions by typed prefix", async () => {
    const tempDir = withTempCwd();
    const plansDir = path.join(tempDir, "docs", "plans");
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
    fs.writeFileSync(path.join(plansDir, "2026-04-09-beta-design.md"), "");

    const command = getWorkflowNextCommand();
    const items = await command.getArgumentCompletions("plan docs/plans/2026-04-09-al");

    expect(items).toEqual([
      {
        value: "docs/plans/2026-04-09-alpha-design.md",
        label: "docs/plans/2026-04-09-alpha-design.md",
      },
    ]);
  });

  test("suggests only implementation artifacts for execute and finalize", async () => {
    const tempDir = withTempCwd();
    const plansDir = path.join(tempDir, "docs", "plans");
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-implementation.md"), "");

    const command = getWorkflowNextCommand();

    await expect(command.getArgumentCompletions("execute ")).resolves.toEqual([
      {
        value: "docs/plans/2026-04-09-alpha-implementation.md",
        label: "docs/plans/2026-04-09-alpha-implementation.md",
      },
    ]);

    await expect(command.getArgumentCompletions("finalize ")).resolves.toEqual([
      {
        value: "docs/plans/2026-04-09-alpha-implementation.md",
        label: "docs/plans/2026-04-09-alpha-implementation.md",
      },
    ]);
  });

  test("returns null for brainstorm artifact completion", async () => {
    const command = getWorkflowNextCommand();

    await expect(command.getArgumentCompletions("brainstorm ")).resolves.toBeNull();
  });

  test("returns null when docs/plans is missing or has no matching files", async () => {
    withTempCwd();
    const command = getWorkflowNextCommand();
    await expect(command.getArgumentCompletions("execute ")).resolves.toBeNull();

    const plansDir = path.join(process.cwd(), "docs", "plans");
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(path.join(plansDir, "2026-04-09-alpha-design.md"), "");
    await expect(command.getArgumentCompletions("execute ")).resolves.toBeNull();
  });

  test("rejects invalid phase values", async () => {
    let handler: any;
    const fakePi: any = {
      on() {},
      registerTool() {},
      appendEntry() {},
      registerCommand(_name: string, opts: any) {
        handler = opts.handler;
      },
    };

    workflowMonitorExtension(fakePi);

    let newSessionCalls = 0;
    const notifications: Array<[string, string]> = [];

    const ctx: any = {
      hasUI: true,
      sessionManager: { getSessionFile: () => "/tmp/session.jsonl" },
      ui: {
        setEditorText: () => {},
        notify: (message: string, level: string) => notifications.push([message, level]),
      },
      newSession: async () => {
        newSessionCalls += 1;
        return { cancelled: false };
      },
    };

    await handler("nonsense docs/plans/foo.md", ctx);

    expect(newSessionCalls).toBe(0);
    expect(notifications[0]?.[0]).toMatch(/Usage: \/workflow-next <phase>/);
    expect(notifications[0]?.[1]).toBe("error");
  });
});

describe("/workflow-next handoff validation", () => {
  test("allows plan -> execute only when plan is complete", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "complete",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "plan",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: "docs/plans/impl.md",
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
      },
    });

    let newSessionCalls: Array<{ parentSession: string; setup: any }> = [];
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: () => {}, setEditorText: () => {} },
      newSession: async (opts: any) => {
        newSessionCalls.push(opts);
        return { cancelled: false };
      },
    };

    await workflowNextHandler("execute docs/plans/impl.md", ctx);

    expect(newSessionCalls.length).toBe(1);
    expect(newSessionCalls[0]!.setup).toBeDefined();
  });

  test("rejects same-phase handoff", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "complete",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "plan",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: null,
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: false, execute: false, finalize: false },
      },
    });

    let newSessionCalls = 0;
    const notifications: Array<[string, string]> = [];
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: (msg: string, level: string) => notifications.push([msg, level]), setEditorText: () => {} },
      newSession: async () => {
        newSessionCalls += 1;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("plan docs/plans/design.md", ctx);

    expect(newSessionCalls).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.[1]).toBe("error");
    expect(notifications[0]?.[0]).toMatch(/same|reset|new task/i);
  });

  test("rejects backward handoff", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "complete",
          execute: "complete",
          finalize: "pending",
        },
        currentPhase: "execute",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: "docs/plans/impl.md",
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
      },
    });

    let newSessionCalls = 0;
    const notifications: Array<[string, string]> = [];
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: (msg: string, level: string) => notifications.push([msg, level]), setEditorText: () => {} },
      newSession: async () => {
        newSessionCalls += 1;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("plan docs/plans/design.md", ctx);

    expect(newSessionCalls).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.[1]).toBe("error");
    expect(notifications[0]?.[0]).toMatch(/backward|cannot hand off/i);
  });

  test("rejects direct jump handoff", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "pending",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "brainstorm",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: null,
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: false, execute: false, finalize: false },
      },
    });

    let newSessionCalls = 0;
    const notifications: Array<[string, string]> = [];
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: (msg: string, level: string) => notifications.push([msg, level]), setEditorText: () => {} },
      newSession: async () => {
        newSessionCalls += 1;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("execute docs/plans/impl.md", ctx);

    expect(newSessionCalls).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.[1]).toBe("error");
    expect(notifications[0]?.[0]).toMatch(/immediate next/i);
  });

  test("rejects handoff when current phase is active", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "active",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "plan",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: null,
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: false, execute: false, finalize: false },
      },
    });

    let newSessionCalls = 0;
    const notifications: Array<[string, string]> = [];
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: (msg: string, level: string) => notifications.push([msg, level]), setEditorText: () => {} },
      newSession: async () => {
        newSessionCalls += 1;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("execute docs/plans/impl.md", ctx);

    expect(newSessionCalls).toBe(0);
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]?.[1]).toBe("error");
    expect(notifications[0]?.[0]).toMatch(/not complete/i);
  });

  test("seeds new session setup with derived workflow state preserving earlier completed phases, artifacts, and prompted flags", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "complete",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "plan",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: "docs/plans/impl.md",
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
      },
    });

    let capturedSetup: any;
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: () => {}, setEditorText: () => {} },
      newSession: async (opts: any) => {
        capturedSetup = opts.setup;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("execute docs/plans/impl.md", ctx);

    expect(capturedSetup).toBeDefined();

    // Run the setup callback with a fake session manager that captures custom entries
    const appendedEntries: any[] = [];
    const fakeSessionManager = {
      appendCustomEntry: (customType: string, data: any) => {
        appendedEntries.push({ customType, data });
      },
    };
    await capturedSetup(fakeSessionManager);

    expect(appendedEntries.length).toBeGreaterThan(0);
    const stateEntry = appendedEntries.find((e) => e.customType === "superpowers_state");
    expect(stateEntry).toBeDefined();

    const wf = stateEntry.data.workflow;
    expect(wf.phases.brainstorm).toBe("complete");
    expect(wf.phases.plan).toBe("complete");
    expect(wf.phases.execute).toBe("active");
    expect(wf.phases.finalize).toBe("pending");
    expect(wf.currentPhase).toBe("execute");

    // Artifacts preserved for earlier phases
    expect(wf.artifacts.brainstorm).toBe("docs/plans/design.md");
    expect(wf.artifacts.plan).toBe("docs/plans/impl.md");
    expect(wf.artifacts.execute).toBeNull();

    // Prompted flags preserved for earlier phases
    expect(wf.prompted.brainstorm).toBe(true);
    expect(wf.prompted.plan).toBe(true);
    expect(wf.prompted.execute).toBe(false);
  });

  test("resets TDD/debug/verification state in seeded session snapshot", async () => {
    const { workflowNextHandler, baseCtx } = setupWithState({
      workflow: {
        phases: {
          brainstorm: "complete",
          plan: "complete",
          execute: "pending",
          finalize: "pending",
        },
        currentPhase: "plan",
        artifacts: {
          brainstorm: "docs/plans/design.md",
          plan: "docs/plans/impl.md",
          execute: null,
          finalize: null,
        },
        prompted: { brainstorm: true, plan: true, execute: false, finalize: false },
      },
      tdd: {
        phase: "green",
        testFiles: ["tests/foo.test.ts"],
        sourceFiles: ["src/foo.ts"],
        redVerificationPending: false,
        nonCodeMode: false,
      },
      debug: { active: true, investigated: true, fixAttempts: 3 },
      verification: { verified: true, verificationWaived: true },
    });

    let capturedSetup: any;
    const ctx: any = {
      ...baseCtx,
      ui: { ...baseCtx.ui, notify: () => {}, setEditorText: () => {} },
      newSession: async (opts: any) => {
        capturedSetup = opts.setup;
        return { cancelled: false };
      },
    };

    await workflowNextHandler("execute docs/plans/impl.md", ctx);

    const appendedEntries: any[] = [];
    const fakeSessionManager = {
      appendCustomEntry: (customType: string, data: any) => {
        appendedEntries.push({ customType, data });
      },
    };
    await capturedSetup(fakeSessionManager);

    const stateEntry = appendedEntries.find((e) => e.customType === "superpowers_state");
    expect(stateEntry).toBeDefined();

    // TDD should be fresh defaults
    expect(stateEntry.data.tdd).toEqual({ ...TDD_DEFAULTS, testFiles: [], sourceFiles: [] });
    // Debug should be fresh defaults
    expect(stateEntry.data.debug).toEqual({ ...DEBUG_DEFAULTS });
    // Verification should be fresh defaults
    expect(stateEntry.data.verification).toEqual({ ...VERIFICATION_DEFAULTS });
    // savedAt should be a number
    expect(typeof stateEntry.data.savedAt).toBe("number");
  });
});
