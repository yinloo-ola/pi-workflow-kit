import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createLogger } from "../../extensions/lib/logging.js";

describe("logging error handling", () => {
  let tmpDir: string;
  let logPath: string;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sp-log-err-test-"));
    logPath = path.join(tmpDir, "test.log");
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("write failure emits one-time stderr fallback", () => {
    // Point logger at an unwritable path
    const badPath = path.join(tmpDir, "nope", "test.log");
    fs.mkdirSync(path.join(tmpDir, "nope"));
    // Make the directory unwritable so appendFileSync fails
    fs.chmodSync(path.join(tmpDir, "nope"), 0o444);

    const log = createLogger(badPath);
    log.info("should fail");

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("pi-superpowers-plus"));
  });

  test("stderr fallback fires only once even with repeated failures", () => {
    const badPath = path.join(tmpDir, "nope", "test.log");
    fs.mkdirSync(path.join(tmpDir, "nope"));
    fs.chmodSync(path.join(tmpDir, "nope"), 0o444);

    const log = createLogger(badPath);
    log.info("fail 1");
    log.info("fail 2");
    log.info("fail 3");

    expect(stderrSpy).toHaveBeenCalledTimes(1);
  });

  test("logger never throws even when filesystem operations fail", () => {
    const badPath = path.join(tmpDir, "nope", "test.log");
    fs.mkdirSync(path.join(tmpDir, "nope"));
    fs.chmodSync(path.join(tmpDir, "nope"), 0o444);

    const log = createLogger(badPath);

    // None of these should throw
    expect(() => log.info("msg")).not.toThrow();
    expect(() => log.warn("msg")).not.toThrow();
    expect(() => log.error("msg", new Error("boom"))).not.toThrow();
    expect(() => log.debug("msg")).not.toThrow();
  });

  test("rotation failure emits one-time stderr fallback", () => {
    // Create a log file over the size limit
    fs.writeFileSync(logPath, "x".repeat(200));
    // Make the .1 path unwritable by creating a directory there
    fs.mkdirSync(`${logPath}.1`);

    const log = createLogger(logPath, { maxSizeBytes: 100 });
    log.info("should trigger rotation failure");

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("pi-superpowers-plus"));
  });

  test("logger works normally when filesystem is healthy", () => {
    const log = createLogger(logPath);
    log.info("all good");

    expect(stderrSpy).not.toHaveBeenCalled();
    expect(fs.readFileSync(logPath, "utf-8")).toContain("all good");
  });
});
