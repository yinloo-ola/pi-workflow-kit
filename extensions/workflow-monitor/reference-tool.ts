import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { log } from "../lib/logging.js";

// extensions/workflow-monitor/reference-tool.ts is 2 levels below package root
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const TOPIC_MAP: Record<string, string> = {
  "tdd-rationalizations": "skills/test-driven-development/reference/rationalizations.md",
  "tdd-examples": "skills/test-driven-development/reference/examples.md",
  "tdd-when-stuck": "skills/test-driven-development/reference/when-stuck.md",
  "tdd-anti-patterns": "skills/test-driven-development/testing-anti-patterns.md",
  "debug-rationalizations": "skills/systematic-debugging/reference/rationalizations.md",
  "debug-tracing": "skills/systematic-debugging/root-cause-tracing.md",
  "debug-defense-in-depth": "skills/systematic-debugging/defense-in-depth.md",
  "debug-condition-waiting": "skills/systematic-debugging/condition-based-waiting.md",
  "brainstorming-guide": "skills/brainstorming/SKILL.md",
  "writing-plans-guide": "skills/writing-plans/SKILL.md",
  "executing-tasks-guide": "skills/executing-tasks/SKILL.md",
  "dispatching-agents-guide": "skills/dispatching-parallel-agents/SKILL.md",
  "receiving-review-guide": "skills/receiving-code-review/SKILL.md",
  "worktree-guide": "skills/using-git-worktrees/SKILL.md",
};

export const REFERENCE_TOPICS = Object.keys(TOPIC_MAP);

export async function loadReference(topic: string): Promise<string> {
  const relativePath = TOPIC_MAP[topic];
  if (!relativePath) {
    return `Unknown topic: "${topic}". Available topics: ${REFERENCE_TOPICS.join(", ")}`;
  }

  const fullPath = resolve(PACKAGE_ROOT, relativePath);

  try {
    return await readFile(fullPath, "utf-8");
  } catch (err) {
    log.warn(`Failed to load reference "${topic}" from ${fullPath}: ${err instanceof Error ? err.message : err}`);
    return `Error loading reference "${topic}": file not found at ${fullPath}`;
  }
}
