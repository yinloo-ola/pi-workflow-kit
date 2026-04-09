import { describe, expect, test } from "vitest";
import planTrackerExtension from "../../extensions/plan-tracker";
import type { PlanTrackerInput } from "../../extensions/plan-tracker";

/**
 * Integration tests for plan-tracker extension.
 * Exercises the actual execute function via a mock ExtensionAPI.
 */

// --- Mock setup ---

type ToolExecuteFn = (
  toolCallId: string,
  params: PlanTrackerInput,
  signal: AbortSignal,
  onUpdate: (text: string) => void,
  ctx: any,
) => Promise<any>;

function createFakePi() {
  let executeFn: ToolExecuteFn | undefined;

  return {
    get executeFn() {
      return executeFn!;
    },
    api: {
      on() {},
      registerTool(opts: any) {
        executeFn = opts.execute;
      },
    } as any,
  };
}

function createFakeCtx() {
  const widgetCalls: Array<[string, any]> = [];
  return {
    widgetCalls,
    ctx: {
      hasUI: true,
      ui: {
        setWidget: (name: string, renderer: any) => widgetCalls.push([name, renderer]),
      },
      sessionManager: { getBranch: () => [] },
    } as any,
  };
}

/** Call execute with minimal boilerplate. */
async function callExecute(fake: ReturnType<typeof createFakePi>, ctx: any, params: PlanTrackerInput) {
  return fake.executeFn!("test-id", params, new AbortController().signal, () => {}, ctx);
}

// --- Helpers ---

function parseDetails(result: any) {
  return result.details as { action: string; tasks: any[]; error?: string };
}

function parseTasks(result: any) {
  return parseDetails(result).tasks;
}

// --- Tests ---

describe("plan-tracker init", () => {
  test("creates tasks with default state", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "init", tasks: ["Task A", "Task B"] });

    const tasks = parseTasks(result);
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toEqual({
      name: "Task A",
      status: "pending",
      phase: "pending",
      type: "code",
      executeAttempts: 0,
      fixAttempts: 0,
    });
    expect(tasks[1].name).toBe("Task B");
  });

  test("error when tasks array is empty", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "init", tasks: [] });

    expect(parseDetails(result).error).toBe("tasks required");
  });

  test("error when tasks array is missing", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "init" });

    expect(parseDetails(result).error).toBe("tasks required");
  });

  test("sets widget on init", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx, widgetCalls } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });

    expect(widgetCalls).toHaveLength(1);
    expect(widgetCalls[0][0]).toBe("plan_tracker");
    expect(widgetCalls[0][1]).toBeDefined(); // renderer function
  });

  test("accepts typed task objects on init", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, {
      action: "init",
      tasks: [
        { name: "Implement API", type: "code" },
        { name: "Update docs", type: "non-code" },
      ],
    });

    const tasks = parseTasks(result);
    expect(tasks[0].type).toBe("code");
    expect(tasks[1].type).toBe("non-code");
    expect(result.content[0].text).toContain("Update docs");
    expect(result.content[0].text).toContain("📋");
  });
});

describe("plan-tracker update", () => {
  test("error when index is missing", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "update" });

    expect(parseDetails(result).error).toBe("index required");
  });

  test("error when no plan is active", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "update", index: 0 });

    expect(parseDetails(result).error).toBe("no plan active");
  });

  test("error when index out of range", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["A", "B"] });
    const result = await callExecute(fake, ctx, { action: "update", index: 5 });

    expect(parseDetails(result).error).toMatch(/out of range/);
  });

  test("sets status to in_progress and auto-syncs phase to define", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("define"); // auto-synced from pending
  });

  test("sets status to complete and auto-syncs phase to complete", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, status: "complete" });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("complete");
    expect(tasks[0].phase).toBe("complete");
  });

  test("sets status to blocked and auto-syncs phase to blocked", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, status: "blocked" });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("blocked");
    expect(tasks[0].phase).toBe("blocked");
  });

  test("sets phase to execute and auto-syncs status to in_progress", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("execute");
  });

  test("sets phase to fix and auto-syncs status to in_progress", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, status: "complete" });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, phase: "fix" });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("fix");
  });

  test("BUG FIX: both status and phase provided — both are respected, no silent override", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });

    // Set both status and phase explicitly — status should NOT be overridden by phase auto-sync
    const result = await callExecute(fake, ctx, {
      action: "update",
      index: 0,
      status: "in_progress",
      phase: "execute",
    });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress"); // caller's explicit value
    expect(tasks[0].phase).toBe("execute"); // caller's explicit value
  });

  test("BUG FIX: phase complete + status in_progress — status takes priority (no override)", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });

    // Explicitly set both: the caller is in control
    const result = await callExecute(fake, ctx, {
      action: "update",
      index: 0,
      status: "in_progress",
      phase: "verify",
    });

    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("verify");
  });

  test("sets type to non-code", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, type: "non-code" });

    const tasks = parseTasks(result);
    expect(tasks[0].type).toBe("non-code");
  });

  test("sets executeAttempts", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, attempts: 2 });

    const tasks = parseTasks(result);
    expect(tasks[0].executeAttempts).toBe(2);
    expect(tasks[0].fixAttempts).toBe(0);
  });

  test("sets fixAttempts", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "fix" });
    const result = await callExecute(fake, ctx, { action: "update", index: 0, attempts: 3 });

    const tasks = parseTasks(result);
    expect(tasks[0].fixAttempts).toBe(3);
    expect(tasks[0].executeAttempts).toBe(0);
  });

  test("defaults to executeAttempts when phase is not fix or execute", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    // Phase is still "pending"
    const result = await callExecute(fake, ctx, { action: "update", index: 0, attempts: 1 });

    const tasks = parseTasks(result);
    expect(tasks[0].executeAttempts).toBe(1);
  });
});

describe("plan-tracker status", () => {
  test("returns no plan message when empty", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "status" });

    expect(result.content[0].text).toBe("No plan active.");
    expect(parseTasks(result)).toHaveLength(0);
  });

  test("returns formatted status with all tasks", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A", "Task B", "Task C"] });
    await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });
    await callExecute(fake, ctx, { action: "update", index: 1, status: "complete" });
    const result = await callExecute(fake, ctx, { action: "status" });

    const text = result.content[0].text as string;
    expect(text).toContain("1/3 complete");
    expect(text).toContain("[execute]");
  });
});

describe("plan-tracker clear", () => {
  test("clears all tasks", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A", "Task B"] });
    const result = await callExecute(fake, ctx, { action: "clear" });

    expect(result.content[0].text).toContain("2 tasks removed");
    expect(parseTasks(result)).toHaveLength(0);
  });

  test("returns message when no plan was active", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    const result = await callExecute(fake, ctx, { action: "clear" });

    expect(result.content[0].text).toBe("No plan was active.");
  });
});

describe("plan-tracker widget", () => {
  test("clears widget on clear", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx, widgetCalls } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    widgetCalls.length = 0; // reset

    await callExecute(fake, ctx, { action: "clear" });

    // Should have been called with undefined to clear
    expect(widgetCalls).toHaveLength(1);
    expect(widgetCalls[0][1]).toBeUndefined();
  });
});

describe("plan-tracker auto-sync semantics", () => {
  test("setting phase only — status auto-syncs to in_progress for non-terminal phases", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });

    // Task starts at status=pending, phase=pending
    const result = await callExecute(fake, ctx, { action: "update", index: 0, phase: "review" });
    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("review");
  });

  test("setting phase complete — status auto-syncs to complete", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });

    const result = await callExecute(fake, ctx, { action: "update", index: 0, phase: "complete" });
    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("complete");
    expect(tasks[0].phase).toBe("complete");
  });

  test("setting status only — phase auto-syncs to define from pending", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });

    const result = await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });
    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("define"); // pending → define
  });

  test("setting status in_progress when phase is already non-pending — phase is NOT overridden", async () => {
    const fake = createFakePi();
    planTrackerExtension(fake.api);

    const { ctx } = createFakeCtx();
    await callExecute(fake, ctx, { action: "init", tasks: ["Task A"] });
    await callExecute(fake, ctx, { action: "update", index: 0, phase: "execute" });

    const result = await callExecute(fake, ctx, { action: "update", index: 0, status: "in_progress" });
    const tasks = parseTasks(result);
    expect(tasks[0].status).toBe("in_progress");
    expect(tasks[0].phase).toBe("execute"); // NOT overridden to define
  });
});
