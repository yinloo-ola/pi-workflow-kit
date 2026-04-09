import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMockLogger } from "../../helpers/mock-logger.js";
import * as logging from "../../../extensions/lib/logging.js";

vi.mock("../../../extensions/lib/logging.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof logging;
  return { ...actual, log: createMockLogger() };
});

import { getCurrentGitRef } from "../../../extensions/workflow-monitor/git.js";

describe("git.ts error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("logs warning and returns null when not in a git repo", () => {
    const result = getCurrentGitRef("/tmp");
    expect(result).toBeNull();
    expect(logging.log.warn).toHaveBeenCalledWith(expect.stringContaining("git"));
  });

  test("returns branch name without warning in a real repo", () => {
    const result = getCurrentGitRef(process.cwd());
    expect(result).toBeTruthy();
    expect(logging.log.warn).not.toHaveBeenCalled();
  });
});
