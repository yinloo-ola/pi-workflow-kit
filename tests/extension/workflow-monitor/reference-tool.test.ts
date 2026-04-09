import { describe, expect, test } from "vitest";
import { loadReference, REFERENCE_TOPICS } from "../../../extensions/workflow-monitor/reference-tool";

describe("REFERENCE_TOPICS", () => {
  test("includes tdd topics", () => {
    expect(REFERENCE_TOPICS).toContain("tdd-rationalizations");
    expect(REFERENCE_TOPICS).toContain("tdd-examples");
    expect(REFERENCE_TOPICS).toContain("tdd-when-stuck");
    expect(REFERENCE_TOPICS).toContain("tdd-anti-patterns");
  });

  test("includes debug topics", () => {
    expect(REFERENCE_TOPICS).toContain("debug-rationalizations");
    expect(REFERENCE_TOPICS).toContain("debug-tracing");
    expect(REFERENCE_TOPICS).toContain("debug-defense-in-depth");
    expect(REFERENCE_TOPICS).toContain("debug-condition-waiting");
  });

  test("includes executing-tasks-guide", () => {
    expect(REFERENCE_TOPICS).toContain("executing-tasks-guide");
  });
});

describe("loadReference", () => {
  test("loads tdd-rationalizations", async () => {
    const content = await loadReference("tdd-rationalizations");
    expect(content).toContain("Rationalizations");
    expect(content).toContain("Too simple to test");
  });

  test("loads tdd-anti-patterns (existing file)", async () => {
    const content = await loadReference("tdd-anti-patterns");
    expect(content).toContain("Anti-Pattern");
  });

  test("loads tdd-examples", async () => {
    const content = await loadReference("tdd-examples");
    expect(content).toContain("retryOperation");
  });

  test("loads tdd-when-stuck", async () => {
    const content = await loadReference("tdd-when-stuck");
    expect(content).toContain("When Stuck");
  });

  test("loads debug-rationalizations topic", async () => {
    const content = await loadReference("debug-rationalizations");
    expect(content).toContain("Rationalizations");
    expect(content).not.toContain("file not found");
  });

  test("loads debug-tracing topic", async () => {
    const content = await loadReference("debug-tracing");
    expect(content).toContain("Root Cause");
    expect(content).not.toContain("file not found");
  });

  test("loads debug-defense-in-depth topic", async () => {
    const content = await loadReference("debug-defense-in-depth");
    expect(content).toContain("Defense");
    expect(content).not.toContain("file not found");
  });

  test("loads debug-condition-waiting topic", async () => {
    const content = await loadReference("debug-condition-waiting");
    expect(content).toContain("condition");
    expect(content).not.toContain("file not found");
  });

  test("loads executing-tasks-guide", async () => {
    const content = await loadReference("executing-tasks-guide");
    expect(content).toContain("executing-tasks");
    expect(content).not.toContain("file not found");
  });

  test("returns error for unknown topic", async () => {
    const content = await loadReference("nonexistent-topic");
    expect(content).toContain("Unknown topic");
  });
});
