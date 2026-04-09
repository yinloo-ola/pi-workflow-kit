import { execSync } from "node:child_process";
import { log } from "../lib/logging.js";

/**
 * Returns the current git branch name, or (if detached) the short HEAD SHA.
 * Returns null if the current working directory is not in a git repo.
 */
export function getCurrentGitRef(cwd: string = process.cwd()): string | null {
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (branch) return branch;

    const sha = execSync("git rev-parse --short HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    return sha || null;
  } catch (err) {
    log.warn(`Failed to determine git ref in ${cwd}: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}
