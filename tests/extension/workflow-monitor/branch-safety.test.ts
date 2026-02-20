import { beforeEach, describe, expect, test, vi } from "vitest";
import workflowMonitorExtension from "../../../extensions/workflow-monitor";

type Handler = (event: any, ctx: any) => any;

vi.mock("node:child_process", () => ({ execSync: vi.fn() }));

import { execSync } from "node:child_process";

const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>;

function createFakePi() {
  const handlers = new Map<string, Handler[]>();

  return {
    handlers,
    api: {
      on(event: string, handler: Handler) {
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
      },
      registerTool() {},
      registerCommand() {},
      appendEntry() {},
    },
  };
}

function getSingleHandler(handlers: Map<string, Handler[]>, event: string): Handler {
  const list = handlers.get(event) ?? [];
  expect(list.length).toBeGreaterThan(0);
  return list[0]!;
}

beforeEach(() => {
  execSyncMock.mockReset();
});

describe("branch safety monitor", () => {
  test("prepends current branch notice on the first tool_result of a session", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("my-branch\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const res = await onToolResult(
      {
        toolCallId: "first-bash",
        toolName: "bash",
        input: { command: "echo hi" },
        content: [{ type: "text", text: "hi" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    expect(res?.content?.[0]?.type).toBe("text");
    expect((res.content[0] as any).text).toContain("📌 Current branch: `my-branch`");
    expect((res.content[1] as any).text).toBe("hi");
  });

  test("injects a first-write gate warning on the first write tool_result", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("topic/branch\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolCall = getSingleHandler(fake.handlers, "tool_call");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    await onToolCall({ toolCallId: "first-write", toolName: "write", input: { path: "README.md", content: "x" } }, ctx);

    const res = await onToolResult(
      {
        toolCallId: "first-write",
        toolName: "write",
        input: { path: "README.md", content: "x" },
        content: [{ type: "text", text: "ok" }],
        details: {},
      },
      ctx,
    );

    const text = res.content[0].text as string;
    expect(text).toContain("⚠️ First write of this session.");
    expect(text).toContain("topic/branch");
  });

  test("branch notice is shown again after session_switch resets state", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("branch-a\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolResult = getSingleHandler(fake.handlers, "tool_result");
    const onSessionSwitch = getSingleHandler(fake.handlers, "session_switch");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const res1 = await onToolResult(
      {
        toolCallId: "a1",
        toolName: "bash",
        input: { command: "echo 1" },
        content: [{ type: "text", text: "one" }],
        details: { exitCode: 0 },
      },
      ctx,
    );
    expect(res1.content[0].text as string).toContain("branch-a");

    await onSessionSwitch({}, ctx);

    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("branch-b\n");
      throw new Error("unexpected command");
    });

    const res2 = await onToolResult(
      {
        toolCallId: "a2",
        toolName: "bash",
        input: { command: "echo 2" },
        content: [{ type: "text", text: "two" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    expect(res2.content[0].text as string).toContain("branch-b");
  });

  test("prepends branch notice while preserving non-text tool content", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("safe-branch\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const originalImage = {
      type: "image",
      data: "aGVsbG8=",
      mediaType: "image/png",
    } as any;

    const res = await onToolResult(
      {
        toolCallId: "img-1",
        toolName: "read",
        input: { path: "mock.png" },
        content: [{ type: "text", text: "original text" }, originalImage],
        details: {},
      },
      ctx,
    );

    expect(res?.content?.[0]?.type).toBe("text");
    expect((res?.content?.[0] as any).text).toContain("📌 Current branch: `safe-branch`");
    expect((res?.content?.[1] as any).text).toBe("original text");
    expect(res?.content?.[2]).toEqual(originalImage);
  });

  test("keeps pending violation tied to the matching toolCallId", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("feature/tdd\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolCall = getSingleHandler(fake.handlers, "tool_call");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    await onToolCall({ toolCallId: "write-1", toolName: "write", input: { path: "src/foo.ts", content: "x" } }, ctx);

    await onToolResult(
      {
        toolCallId: "bash-1",
        toolName: "bash",
        input: { command: "echo unrelated" },
        content: [{ type: "text", text: "done" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    const writeRes = await onToolResult(
      {
        toolCallId: "write-1",
        toolName: "write",
        input: { path: "src/foo.ts", content: "x" },
        content: [{ type: "text", text: "ok" }],
        details: {},
      },
      ctx,
    );

    const text = (writeRes.content as any[])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    expect(text).toContain("⚠️ TDD");
  });

  test("does not inject branch notices or first-write gate outside git repos", async () => {
    execSyncMock.mockImplementation(() => {
      throw new Error("not a repo");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);

    const onToolCall = getSingleHandler(fake.handlers, "tool_call");
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const bashRes = await onToolResult(
      {
        toolCallId: "ng-1",
        toolName: "bash",
        input: { command: "echo hi" },
        content: [{ type: "text", text: "hi" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    expect(bashRes).toBeUndefined();

    await onToolCall({ toolCallId: "ng-2", toolName: "write", input: { path: "README.md", content: "x" } }, ctx);
    const writeRes = await onToolResult(
      {
        toolCallId: "ng-2",
        toolName: "write",
        input: { path: "README.md", content: "x" },
        content: [{ type: "text", text: "ok" }],
        details: {},
      },
      ctx,
    );

    if (writeRes) {
      const text = (writeRes.content as any[])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      expect(text).not.toContain("Current branch");
      expect(text).not.toContain("First write of this session");
    }
  });

  test("shows detached HEAD short SHA in branch notice", async () => {
    execSyncMock.mockImplementation((cmd: string) => {
      if (cmd.startsWith("git branch")) return Buffer.from("\n");
      if (cmd.startsWith("git rev-parse --short HEAD")) return Buffer.from("abc123\n");
      throw new Error("unexpected command");
    });

    const fake = createFakePi();
    workflowMonitorExtension(fake.api as any);
    const onToolResult = getSingleHandler(fake.handlers, "tool_result");

    const ctx = {
      hasUI: false,
      sessionManager: { getBranch: () => [] },
      ui: { setWidget: () => {} },
    };

    const res = await onToolResult(
      {
        toolCallId: "det-1",
        toolName: "bash",
        input: { command: "echo hi" },
        content: [{ type: "text", text: "hi" }],
        details: { exitCode: 0 },
      },
      ctx,
    );

    const text = (res.content as any[])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    expect(text).toContain("📌 Current branch: `abc123`");
  });
});
