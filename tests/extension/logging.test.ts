import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// We'll test the internal createLogger factory, not the singleton,
// so each test gets its own log file in a temp dir.
import { createLogger, MAX_MESSAGE_LENGTH } from "../../extensions/lib/logging.js";

describe("logging", () => {
  let tmpDir: string;
  let logPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp-log-test-"));
    logPath = path.join(tmpDir, "test.log");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("info writes a timestamped line to the log file", () => {
    const log = createLogger(logPath);
    log.info("hello world");

    const content = fs.readFileSync(logPath, "utf-8");
    expect(content).toContain("[INFO] hello world");
    // Timestamp format: YYYY-MM-DDTHH:MM:SS
    expect(content).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test("warn writes with WARN level", () => {
    const log = createLogger(logPath);
    log.warn("something off");

    const content = fs.readFileSync(logPath, "utf-8");
    expect(content).toContain("[WARN] something off");
  });

  test("error writes with ERROR level", () => {
    const log = createLogger(logPath);
    log.error("bad thing", new Error("boom"));

    const content = fs.readFileSync(logPath, "utf-8");
    expect(content).toContain("[ERROR] bad thing");
    expect(content).toContain("boom");
  });

  test("debug is silent when verbose is false", () => {
    const log = createLogger(logPath, { verbose: false });
    log.debug("secret details");

    expect(fs.existsSync(logPath)).toBe(false);
  });

  test("debug writes when verbose is true", () => {
    const log = createLogger(logPath, { verbose: true });
    log.debug("secret details");

    const content = fs.readFileSync(logPath, "utf-8");
    expect(content).toContain("[DEBUG] secret details");
  });

  test("multiple writes append to the same file", () => {
    const log = createLogger(logPath);
    log.info("line one");
    log.info("line two");

    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("line one");
    expect(lines[1]).toContain("line two");
  });

  test("creates parent directories if they don't exist", () => {
    const nestedPath = path.join(tmpDir, "a", "b", "deep.log");
    const log = createLogger(nestedPath);
    log.info("nested");

    expect(fs.readFileSync(nestedPath, "utf-8")).toContain("nested");
  });

  test("rotates when file exceeds maxSize", () => {
    // Write a file that's already over the limit
    fs.writeFileSync(logPath, "x".repeat(200));

    // Create logger with tiny maxSize to trigger rotation
    const log = createLogger(logPath, { maxSizeBytes: 100 });
    log.info("after rotation");

    // Old content should be in .1 file
    const rotated = `${logPath}.1`;
    expect(fs.existsSync(rotated)).toBe(true);
    expect(fs.readFileSync(rotated, "utf-8")).toBe("x".repeat(200));

    // New file should only have the new line
    const content = fs.readFileSync(logPath, "utf-8");
    expect(content).toContain("after rotation");
    expect(content).not.toContain("x".repeat(50));
  });

  test("rotation overwrites existing .1 file", () => {
    const rotatedPath = `${logPath}.1`;
    fs.writeFileSync(rotatedPath, "old-rotated");
    fs.writeFileSync(logPath, "x".repeat(200));

    const log = createLogger(logPath, { maxSizeBytes: 100 });
    log.info("fresh");

    expect(fs.readFileSync(rotatedPath, "utf-8")).toBe("x".repeat(200));
  });

  test("rotation can run again after rotationCheckInterval", () => {
    const rotatedPath = `${logPath}.1`;
    const nowSpy = vi.spyOn(Date, "now");

    fs.writeFileSync(logPath, "x".repeat(200));
    nowSpy.mockReturnValue(0);

    const log = createLogger(logPath, {
      maxSizeBytes: 100,
      rotationCheckInterval: 1000,
    });

    log.info("first");
    expect(fs.readFileSync(rotatedPath, "utf-8")).toBe("x".repeat(200));

    fs.writeFileSync(logPath, "y".repeat(200));
    nowSpy.mockReturnValue(1500);

    log.info("second");
    expect(fs.readFileSync(rotatedPath, "utf-8")).toBe("y".repeat(200));
  });

  test("messages over 10KB are truncated with a marker", () => {
    const log = createLogger(logPath);
    const marker = "...(truncated)";
    const originalMessage = "a".repeat(MAX_MESSAGE_LENGTH + 64);

    log.info(originalMessage);

    const content = fs.readFileSync(logPath, "utf-8");
    const line = content.trimEnd();
    const loggedMessage = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2} \[INFO\] /, "");

    expect(loggedMessage.length).toBe(MAX_MESSAGE_LENGTH);
    expect(loggedMessage.endsWith(marker)).toBe(true);
    expect(loggedMessage).toBe("a".repeat(MAX_MESSAGE_LENGTH - marker.length) + marker);
  });
});
