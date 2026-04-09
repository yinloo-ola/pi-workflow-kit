import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { spawnMock, discoverAgentsMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  discoverAgentsMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("../../../extensions/subagent/agents.js", () => ({
  discoverAgents: discoverAgentsMock,
}));

import subagentExtension from "../../../extensions/subagent/index";

function createFakeProcess(exitCode = 0) {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn(() => true);
  queueMicrotask(() => {
    proc.emit("exit", exitCode);
  });
  return proc;
}

function registerTool() {
  let tool: any;
  subagentExtension({
    registerTool: (t: unknown) => {
      tool = t;
    },
    on: vi.fn(),
    registerCommand: vi.fn(),
    appendEntry: vi.fn(),
  } as any);
  return tool;
}

describe("subagent model inheritance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spawnMock.mockImplementation(() => createFakeProcess());
  });

  test("inherits the parent session provider and model for unpinned agents", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [{ name: "test-agent", source: "user", filePath: "/tmp/test-agent.md", systemPrompt: "" }],
      projectAgentsDir: null,
    });

    const tool = registerTool();
    await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
      model: { id: "gpt-5", provider: "openai" },
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][1]).toEqual(expect.arrayContaining(["--provider", "openai", "--model", "gpt-5"]));
  });

  test("keeps an agent's pinned model authoritative", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [
        {
          name: "test-agent",
          source: "user",
          filePath: "/tmp/test-agent.md",
          systemPrompt: "",
          model: "claude-sonnet-4-5",
        },
      ],
      projectAgentsDir: null,
    });

    const tool = registerTool();
    await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
      model: { id: "gpt-5", provider: "openai" },
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][1]).toEqual(expect.arrayContaining(["--model", "claude-sonnet-4-5"]));
    expect(spawnMock.mock.calls[0][1]).not.toEqual(expect.arrayContaining(["--provider", "openai"]));
  });

  test("falls back to the bundled default model when there is no parent session model", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [{ name: "test-agent", source: "user", filePath: "/tmp/test-agent.md", systemPrompt: "" }],
      projectAgentsDir: null,
    });

    const tool = registerTool();
    await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock.mock.calls[0][1]).toEqual(expect.arrayContaining(["--model", "claude-sonnet-4-5"]));
  });

  test("propagates the inherited model to every parallel task", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [
        { name: "agent-a", source: "user", filePath: "/tmp/a.md", systemPrompt: "" },
        { name: "agent-b", source: "user", filePath: "/tmp/b.md", systemPrompt: "" },
      ],
      projectAgentsDir: null,
    });

    const tool = registerTool();
    await tool.execute(
      "id",
      {
        tasks: [
          { agent: "agent-a", task: "task 1" },
          { agent: "agent-b", task: "task 2" },
        ],
      },
      undefined,
      undefined,
      {
        cwd: process.cwd(),
        hasUI: false,
        model: { id: "gpt-5", provider: "openai" },
      },
    );

    expect(spawnMock).toHaveBeenCalledTimes(2);
    for (const call of spawnMock.mock.calls) {
      expect(call[1]).toEqual(expect.arrayContaining(["--provider", "openai", "--model", "gpt-5"]));
    }
  });

  test("propagates the inherited model to every chain step", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [
        { name: "agent-a", source: "user", filePath: "/tmp/a.md", systemPrompt: "" },
        { name: "agent-b", source: "user", filePath: "/tmp/b.md", systemPrompt: "" },
      ],
      projectAgentsDir: null,
    });

    const tool = registerTool();
    await tool.execute(
      "id",
      {
        chain: [
          { agent: "agent-a", task: "task 1" },
          { agent: "agent-b", task: "task 2 {previous}" },
        ],
      },
      undefined,
      undefined,
      {
        cwd: process.cwd(),
        hasUI: false,
        model: { id: "gpt-5", provider: "openai" },
      },
    );

    expect(spawnMock).toHaveBeenCalledTimes(2);
    for (const call of spawnMock.mock.calls) {
      expect(call[1]).toEqual(expect.arrayContaining(["--provider", "openai", "--model", "gpt-5"]));
    }
  });

  test("includes inherited model details in failure diagnostics", async () => {
    discoverAgentsMock.mockReturnValue({
      agents: [{ name: "test-agent", source: "user", filePath: "/tmp/test-agent.md", systemPrompt: "" }],
      projectAgentsDir: null,
    });
    spawnMock.mockImplementation(() => createFakeProcess(1));

    const tool = registerTool();
    const result = await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
      model: { id: "gpt-5", provider: "openai" },
    });

    expect(result.content[0].text).toContain("openai");
    expect(result.content[0].text).toContain("gpt-5");
    expect(result.content[0].text).toContain("inherited");
  });
});
