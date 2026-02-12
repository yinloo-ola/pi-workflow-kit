import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { getCurrentGitRef } from "../../../extensions/workflow-monitor/git";

const execSyncMock = execSync as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  execSyncMock.mockReset();
});

describe("getCurrentGitRef", () => {
  test("returns branch name when on a branch", () => {
    execSyncMock.mockReturnValueOnce(Buffer.from("feature/xyz\n"));

    expect(getCurrentGitRef()).toBe("feature/xyz");
  });

  test("returns short SHA when detached HEAD (branch name empty)", () => {
    execSyncMock.mockReturnValueOnce(Buffer.from("\n"));
    execSyncMock.mockReturnValueOnce(Buffer.from("abc123\n"));

    expect(getCurrentGitRef()).toBe("abc123");
  });

  test("returns null when not in a git repo (exec throws)", () => {
    execSyncMock.mockImplementation(() => {
      throw new Error("not a git repo");
    });

    expect(getCurrentGitRef()).toBeNull();
  });
});
