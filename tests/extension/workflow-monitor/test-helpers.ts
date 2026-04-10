import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, expect } from "vitest";

type Handler = (event: any, ctx: any) => any;

const ORIGINAL_CWD = process.cwd();
const TEMP_DIRS: string[] = [];

/**
 * Change to a temp directory for the duration of the test.
 * Cleaned up automatically via afterEach.
 */
export function withTempCwd(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-test-"));
  TEMP_DIRS.push(dir);
  process.chdir(dir);
  return dir;
}

afterEach(() => {
  if (process.cwd() !== ORIGINAL_CWD) {
    process.chdir(ORIGINAL_CWD);
  }
  for (const dir of TEMP_DIRS.splice(0)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
  }
});

/**
 * Creates a fake pi API for testing.
 * NOTE: Changes process.cwd() to a temp directory to prevent state file
 * pollution. CWD is restored in afterEach.
 */
export function createFakePi(extra?: { withAppendEntry?: boolean }) {
  withTempCwd();

  const handlers = new Map<string, Handler[]>();
  const appendedEntries: any[] = [];

  return {
    handlers,
    appendedEntries,
    api: {
      on(event: string, handler: Handler) {
        const list = handlers.get(event) ?? [];
        list.push(handler);
        handlers.set(event, list);
      },
      registerTool() {},
      registerCommand() {},
      appendEntry(customType: string, data: any) {
        if (extra?.withAppendEntry) appendedEntries.push({ customType, data });
      },
      events: {
        emit() {},
        on() {},
      },
    },
  };
}

export function getSingleHandler(handlers: Map<string, Handler[]>, event: string): Handler {
  const list = handlers.get(event) ?? [];
  expect(list.length).toBeGreaterThan(0);
  return list[0]!;
}

export function getHandlers(handlers: Map<string, Handler[]>, event: string): Handler[] {
  return handlers.get(event) ?? [];
}
