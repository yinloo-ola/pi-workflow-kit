import { describe, expect, test, vi } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

/**
 * Boots the extension and returns a map of { commandName → handler }.
 * Also captures appendedEntries so we can inspect persisted state.
 */
function setup() {
  const commands = new Map<string, (args: string, ctx: any) => Promise<void>>();
  const appendedEntries: Array<{ customType: string; data: any }> = [];

  const fakePi: any = {
    on() {},
    registerTool() {},
    appendEntry(customType: string, data: any) {
      appendedEntries.push({ customType, data });
    },
    registerCommand(name: string, opts: any) {
      commands.set(name, opts.handler);
    },
  };

  workflowMonitorExtension(fakePi);
  return { commands, appendedEntries };
}

describe("/workflow-reset command", () => {
  test("command is registered with the expected name and description", () => {
    const descriptions = new Map<string, string>();
    const fakePi: any = {
      on() {},
      registerTool() {},
      appendEntry() {},
      registerCommand(name: string, opts: any) {
        descriptions.set(name, opts.description);
      },
    };
    workflowMonitorExtension(fakePi);
    expect(descriptions.has("workflow-reset")).toBe(true);
    expect(descriptions.get("workflow-reset")).toMatch(/reset/i);
  });

  test("resets persisted state — workflow, tdd, debug, verification all return to defaults", async () => {
    const { commands, appendedEntries } = setup();

    const ctx: any = {
      hasUI: false,
      ui: { notify: vi.fn(), setWidget: () => {} },
    };

    // Call the command
    const handler = commands.get("workflow-reset");
    expect(handler).toBeDefined();
    await handler!("", ctx);

    // State should have been persisted
    expect(appendedEntries.length).toBeGreaterThan(0);
    const lastEntry = appendedEntries.at(-1)!;
    expect(lastEntry.data.workflow).toBeDefined();

    // Workflow should be empty
    const wf = lastEntry.data.workflow;
    expect(wf.currentPhase).toBeNull();
    for (const phase of ["brainstorm", "plan", "execute", "verify", "review", "finish"]) {
      expect(wf.phases[phase]).toBe("pending");
    }

    // TDD, debug, verification should be at defaults
    expect(lastEntry.data.tdd.phase).toBe("idle");
    expect(lastEntry.data.debug.active).toBe(false);
    expect(lastEntry.data.verification.verified).toBe(false);
  });

  test("notifies user with info level when UI is present", async () => {
    const { commands } = setup();

    const notifications: Array<[string, string]> = [];
    const ctx: any = {
      hasUI: true,
      ui: {
        notify: (msg: string, level: string) => notifications.push([msg, level]),
        setWidget: () => {},
      },
    };

    const handler = commands.get("workflow-reset");
    await handler!("", ctx);

    expect(notifications.length).toBe(1);
    expect(notifications[0]![1]).toBe("info");
    expect(notifications[0]![0]).toMatch(/reset/i);
  });

  test("does not throw and does not notify when UI is absent", async () => {
    const { commands } = setup();

    const ctx: any = {
      hasUI: false,
      ui: { notify: vi.fn(), setWidget: () => {} },
    };

    const handler = commands.get("workflow-reset");
    await expect(handler!("", ctx)).resolves.not.toThrow();
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });
});
