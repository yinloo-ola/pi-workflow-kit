/**
 * File-based logger for pi-superpowers-plus.
 *
 * Default singleton writes to ~/.pi/logs/superpowers-plus.log.
 * Info/warn/error always write. Debug writes only when PI_SUPERPOWERS_DEBUG=1.
 * One-deep rotation when file exceeds 5 MB.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export interface LoggerOptions {
  verbose?: boolean;
  maxSizeBytes?: number;
  rotationCheckInterval?: number;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, err?: unknown): void;
  debug(message: string): void;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ROTATION_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
export const MAX_MESSAGE_LENGTH = 10 * 1024; // 10 KB
const TRUNCATED_MARKER = "...(truncated)";

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ?? `${err.name}: ${err.message}`;
  }
  return String(err);
}

function timestamp(): string {
  // Strip milliseconds + trailing Z so log lines stay compact and second-precision.
  return new Date().toISOString().replace(/\.\d{3}Z$/, "");
}

function truncateMessage(message: string): string {
  if (message.length <= MAX_MESSAGE_LENGTH) return message;
  return message.slice(0, MAX_MESSAGE_LENGTH - TRUNCATED_MARKER.length) + TRUNCATED_MARKER;
}

export function createLogger(logPath: string, options?: LoggerOptions): Logger {
  const verbose = options?.verbose ?? false;
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_MAX_SIZE;
  const rotationCheckInterval = options?.rotationCheckInterval ?? DEFAULT_ROTATION_CHECK_INTERVAL;
  /** Timestamp (ms) of the last rotation size check. Re-checks after rotationCheckInterval. */
  let lastRotationCheck = -Infinity;
  /** Set after the first error is reported to stderr, to avoid spamming. */
  let stderrFallbackFired = false;

  function ensureDir(): void {
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Emit a one-time warning to stderr so the user knows logging is broken.
   * Only fires once per logger instance to avoid spamming.
   */
  function stderrFallback(context: string, err: unknown): void {
    if (stderrFallbackFired) return;
    stderrFallbackFired = true;
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[pi-superpowers-plus] Logger ${context} failed: ${detail}. Further log errors will be silenced.\n`,
    );
  }

  /**
   * Rotate the log file if it exceeds maxSizeBytes.
   * Re-checks at most once per rotationCheckInterval (default 1 hour)
   * so long-running processes can still rotate without checking on every write.
   */
  function rotateIfNeeded(): void {
    const now = Date.now();
    if (now - lastRotationCheck < rotationCheckInterval) return;
    lastRotationCheck = now;
    try {
      const stat = fs.statSync(logPath);
      if (stat.size > maxSizeBytes) {
        fs.renameSync(logPath, `${logPath}.1`);
      }
    } catch (err) {
      // File doesn't exist yet — nothing to rotate. But surface unexpected errors once.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        stderrFallback("rotation", err);
      }
    }
  }

  /**
   * Append a log line to the file. Uses synchronous I/O for simplicity and ordering guarantees — acceptable for low-volume diagnostic logging.
   */
  function write(level: string, message: string): void {
    try {
      ensureDir();
      rotateIfNeeded();
      const line = `${timestamp()} [${level}] ${truncateMessage(message)}\n`;
      fs.appendFileSync(logPath, line, "utf-8");
    } catch (err) {
      // Logger must never crash the application, but surface the first failure.
      stderrFallback("write", err);
    }
  }

  return {
    info(message: string): void {
      write("INFO", message);
    },
    warn(message: string): void {
      write("WARN", message);
    },
    error(message: string, err?: unknown): void {
      const suffix = err ? ` — ${formatError(err)}` : "";
      write("ERROR", message + suffix);
    },
    debug(message: string): void {
      if (!verbose) return;
      write("DEBUG", message);
    },
  };
}

/** Default singleton logger used across all extensions. */
const LOG_PATH = path.join(os.homedir(), ".pi", "logs", "superpowers-plus.log");

export const log: Logger = createLogger(LOG_PATH, {
  verbose: process.env.PI_SUPERPOWERS_DEBUG === "1",
});
