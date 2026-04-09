import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMockLogger } from "../../helpers/mock-logger.js";
import * as logging from "../../../extensions/lib/logging.js";

vi.mock("../../../extensions/lib/logging.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof logging;
  return { ...actual, log: createMockLogger() };
});

import { discoverAgents, loadAgentsFromDir } from "../../../extensions/subagent/agents.js";

describe("agents error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("logs warning when directory is unreadable", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-dir-err-"));

    try {
      fs.chmodSync(tmpDir, 0o000);
      const result = loadAgentsFromDir(tmpDir, "user");

      expect(result).toEqual([]);
      expect(logging.log.warn).toHaveBeenCalledWith(expect.stringContaining(tmpDir));
    } finally {
      try {
        fs.chmodSync(tmpDir, 0o755);
      } catch {}
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("logs warning when agent file is unreadable", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-file-err-"));
    const agentFile = path.join(tmpDir, "broken.md");

    fs.writeFileSync(agentFile, "---\nname: broken\ndescription: desc\n---\nbody");

    try {
      fs.chmodSync(agentFile, 0o000);
      const result = loadAgentsFromDir(tmpDir, "user");

      expect(result).toEqual([]);
      expect(logging.log.warn).toHaveBeenCalledWith(expect.stringContaining(agentFile));
    } finally {
      try {
        fs.chmodSync(agentFile, 0o644);
      } catch {}
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("logs debug for isDirectory stat failures", () => {
    const result = discoverAgents("/nonexistent/path", "both");

    expect(result.projectAgentsDir).toBeNull();
    expect(logging.log.debug).toHaveBeenCalledWith(expect.stringContaining("stat failed for"));
  });
});
