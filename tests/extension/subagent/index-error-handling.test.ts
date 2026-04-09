import { EventEmitter } from "node:events";
import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMockLogger } from "../../helpers/mock-logger.js";
import * as logging from "../../../extensions/lib/logging.js";

const { spawnMock, discoverAgentsMock, unlinkSyncMock, rmSyncMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  discoverAgentsMock: vi.fn(),
  unlinkSyncMock: vi.fn(),
  rmSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  unlinkSyncMock.mockImplementation(actual.unlinkSync);
  rmSyncMock.mockImplementation(actual.rmSync);
  return {
    ...actual,
    unlinkSync: unlinkSyncMock,
    rmSync: rmSyncMock,
  };
});

vi.mock("../../../extensions/subagent/agents.js", () => ({
  discoverAgents: discoverAgentsMock,
}));

vi.mock("../../../extensions/lib/logging.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof logging;
  return { ...actual, log: createMockLogger() };
});

import subagentExtension, { INACTIVITY_TIMEOUT_MS } from "../../../extensions/subagent/index";

type Handler = (event: any, ctx: any) => any;

function createFakeProcess() {
  const proc = new EventEmitter() as any;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.kill = vi.fn(() => {
    proc.killed = true;
    return true;
  });
  proc.killed = false;
  return proc;
}

function registerTool() {
  let tool: any;
  subagentExtension({
    registerTool: (t: unknown) => {
      tool = t;
    },
    on: vi.fn() as unknown as Handler,
    registerCommand: vi.fn(),
    appendEntry: vi.fn(),
  } as any);
  return tool;
}

describe("subagent/index error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    discoverAgentsMock.mockReturnValue({
      agents: [
        {
          name: "test-agent",
          source: "user",
          filePath: "/tmp/test-agent.md",
          systemPrompt: "system prompt",
        },
      ],
      projectAgentsDir: null,
    });
  });

  test("logs debug when subagent stdout line is not JSON", async () => {
    spawnMock.mockImplementation(() => {
      const proc = createFakeProcess();
      queueMicrotask(() => {
        proc.stdout.emit("data", Buffer.from("not-json\n"));
        proc.emit("exit", 0);
      });
      return proc;
    });

    const tool = registerTool();
    await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
    });

    expect(logging.log.debug).toHaveBeenCalledWith(
      expect.stringContaining("Ignoring non-JSON line from subagent stdout"),
    );
  });

  test("logs debug when temp cleanup fails", async () => {
    spawnMock.mockImplementation(() => {
      const proc = createFakeProcess();
      queueMicrotask(() => {
        proc.emit("exit", 0);
      });
      return proc;
    });

    unlinkSyncMock.mockImplementation(() => {
      throw new Error("unlink failed");
    });
    rmSyncMock.mockImplementation(() => {
      throw new Error("rm failed");
    });

    const tool = registerTool();
    await tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
    });

    expect(fs.unlinkSync).toHaveBeenCalled();
    expect(fs.rmSync).toHaveBeenCalled();
    expect(logging.log.debug).toHaveBeenCalledWith(expect.stringContaining("Failed to clean up temp prompt file"));
    expect(logging.log.debug).toHaveBeenCalledWith(expect.stringContaining("Failed to clean up temp directory"));
  });

  test("resolves when subagent process exits even if close never fires", async () => {
    spawnMock.mockImplementation(() => {
      const proc = createFakeProcess();
      queueMicrotask(() => {
        proc.emit("exit", 0);
      });
      return proc;
    });

    const tool = registerTool();
    await expect(
      Promise.race([
        tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
          cwd: process.cwd(),
          hasUI: false,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timed out waiting for execute")), 3000)),
      ]),
    ).resolves.toBeDefined();
  });

  test("exports inactivity timeout constant", () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(120_000);
  });

  test("respects concurrency cap for parallel tasks", async () => {
    // Set concurrency to 1 to verify serialization
    const originalConcurrency = process.env.PI_SUBAGENT_CONCURRENCY;
    process.env.PI_SUBAGENT_CONCURRENCY = "1";

    let activeSpawns = 0;
    let maxActiveSpawns = 0;

    spawnMock.mockImplementation(() => {
      activeSpawns++;
      maxActiveSpawns = Math.max(maxActiveSpawns, activeSpawns);
      const proc = createFakeProcess();
      queueMicrotask(() => {
        activeSpawns--;
        proc.emit("exit", 0);
      });
      return proc;
    });

    // Re-register agent with two-agent list
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
      { cwd: process.cwd(), hasUI: false },
    );

    // With concurrency cap of 1, max active spawns should be 1
    expect(maxActiveSpawns).toBe(1);

    process.env.PI_SUBAGENT_CONCURRENCY = originalConcurrency;
  });

  test("kills subagent after absolute timeout", async () => {
    vi.useFakeTimers();
    // Set absolute timeout shorter than inactivity timeout (120s)
    const originalTimeout = process.env.PI_SUBAGENT_TIMEOUT_MS;
    process.env.PI_SUBAGENT_TIMEOUT_MS = "30000"; // 30s

    const proc = createFakeProcess();
    spawnMock.mockReturnValue(proc);

    const tool = registerTool();
    const resultPromise = tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
    });

    // Advance past the 30s absolute timeout but before 120s inactivity
    await vi.advanceTimersByTimeAsync(35_000);

    const result = await resultPromise;
    expect(proc.kill).toHaveBeenCalledWith("SIGTERM");
    expect(result.content[0].text).toContain("timed out");

    process.env.PI_SUBAGENT_TIMEOUT_MS = originalTimeout;
    vi.useRealTimers();
  });

  test("escalates to SIGKILL when process does not exit after SIGTERM timeout", async () => {
    vi.useFakeTimers();
    const originalTimeout = process.env.PI_SUBAGENT_TIMEOUT_MS;
    process.env.PI_SUBAGENT_TIMEOUT_MS = "10000"; // 10s

    const proc = createFakeProcess();
    // Realistic kill: sets proc.killed = true like Node.js does
    const killCalls: string[] = [];
    proc.kill = vi.fn((sig: string) => {
      killCalls.push(sig);
      proc.killed = true; // Node.js sets this after ANY signal
      return true;
    });
    spawnMock.mockReturnValue(proc);

    const tool = registerTool();
    const resultPromise = tool.execute("id", { agent: "test-agent", task: "do work" }, undefined, undefined, {
      cwd: process.cwd(),
      hasUI: false,
    });

    // Advance past absolute timeout (10s)
    await vi.advanceTimersByTimeAsync(11_000);
    // Advance past SIGKILL grace period (5s)
    await vi.advanceTimersByTimeAsync(6_000);

    // Manually emit exit so the promise resolves
    proc.emit("exit", 1);
    await vi.advanceTimersByTimeAsync(3_000);

    await resultPromise;
    expect(killCalls).toContain("SIGTERM");
    expect(killCalls).toContain("SIGKILL");

    process.env.PI_SUBAGENT_TIMEOUT_MS = originalTimeout;
    vi.useRealTimers();
  });

  test("returns error when cwd is a file not a directory", async () => {
    // Create a temp file to use as cwd — use os.tmpdir to avoid mock interference
    const os = await import("node:os");
    const tmpFile = path.join(os.tmpdir(), `subagent-test-${Date.now()}.txt`);
    const { writeFileSync, unlinkSync } = await import("node:fs");
    writeFileSync(tmpFile, "hello");

    try {
      const tool = registerTool();
      const result = await tool.execute(
        "id",
        { agent: "test-agent", task: "do work", cwd: tmpFile },
        undefined,
        undefined,
        { cwd: process.cwd(), hasUI: false },
      );

      expect(spawnMock).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain("cwd is not a directory");
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {}
    }
  });

  test("returns error when cwd does not exist", async () => {
    const tool = registerTool();
    const result = await tool.execute(
      "id",
      { agent: "test-agent", task: "do work", cwd: "/nonexistent/path/that/does/not/exist" },
      undefined,
      undefined,
      {
        cwd: process.cwd(),
        hasUI: false,
      },
    );

    expect(spawnMock).not.toHaveBeenCalled();
    expect(result.content[0].text).toContain("cwd does not exist");
    expect(result.content[0].text).toContain("/nonexistent/path/that/does/not/exist");
  });
});
