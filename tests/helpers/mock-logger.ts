/**
 * Shared logger mock factory for tests that need to assert on log calls.
 *
 * Usage in test files:
 *
 * ```ts
 * import { vi } from "vitest";
 * import { createMockLogger } from "../../helpers/mock-logger.js";
 *
 * vi.mock("../../../extensions/lib/logging.js", async (importOriginal) => {
 *   const actual = await importOriginal<typeof import("../../../extensions/lib/logging.js")>();
 *   return { ...actual, log: createMockLogger() };
 * });
 * ```
 *
 * Note: vi.mock is hoisted, so the mock call must remain in each test file.
 * This helper eliminates the duplicated mock object literal.
 */
import { vi } from "vitest";
import type { Logger } from "../../extensions/lib/logging.js";

export interface MockLogger extends Logger {
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

export function createMockLogger(): MockLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}
