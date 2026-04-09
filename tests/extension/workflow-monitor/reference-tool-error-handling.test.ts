import { beforeEach, describe, expect, test, vi } from "vitest";
import { createMockLogger } from "../../helpers/mock-logger.js";
import * as logging from "../../../extensions/lib/logging.js";

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: readFileMock,
}));

vi.mock("../../../extensions/lib/logging.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof logging;
  return { ...actual, log: createMockLogger() };
});

import { loadReference } from "../../../extensions/workflow-monitor/reference-tool.js";

describe("reference-tool.ts error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("logs warning when reading a known reference file fails", async () => {
    readFileMock.mockRejectedValueOnce(new Error("permission denied"));

    const result = await loadReference("tdd-rationalizations");

    expect(result).toContain('Error loading reference "tdd-rationalizations"');
    expect(logging.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load reference "tdd-rationalizations"'),
    );
  });

  test("returns error string when topic is unknown", async () => {
    const result = await loadReference("nonexistent-topic");

    expect(result).toContain("Unknown topic");
    expect(result).toContain("nonexistent-topic");
  });
});
