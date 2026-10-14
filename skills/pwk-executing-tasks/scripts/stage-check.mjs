#!/usr/bin/env node
/**
 * Fail when the working tree holds changes outside the plan folder.
 *
 * The reviewed diff is a commit range, so anything uncommitted outside docs/plans/ is
 * invisible to the review and can ship unreviewed. The plan folder is exempt: the design,
 * the progress file, and the generated packet are legitimately dirty while a step is in
 * flight. A root that cannot be verified is a failure, never a silent pass.
 *
 * Usage: node stage-check.mjs [root]
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ALLOWED = "docs/plans/";
const root = resolve(process.argv[2] ?? process.cwd());

const probe = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" });
if (probe.status !== 0 || probe.stdout.trim() !== "true") {
  console.error(`stage-check.mjs: ${root} is not a git worktree — nothing can be verified`);
  process.exit(1);
}

const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (status.status !== 0) {
  console.error(`stage-check.mjs: git status failed in ${root}: ${status.stderr.trim()}`);
  process.exit(1);
}

const unquote = (path) => path.replace(/^"(.*)"$/, "$1");
const offenders = [];
for (const line of status.stdout.split("\n")) {
  if (!line.trim()) continue;
  const entry = unquote(line.slice(3).trim());
  const path = entry.includes(" -> ") ? entry.split(" -> ").at(-1).trim() : entry;
  if (!path.startsWith(ALLOWED)) offenders.push(path);
}

if (offenders.length) {
  for (const path of offenders) console.error(`stage-check.mjs: uncommitted outside ${ALLOWED} — ${path}`);
  console.error(
    `stage-check.mjs: ${offenders.length} path(s) would be missing from the reviewed diff; commit or remove them first`,
  );
  process.exit(1);
}
console.log(`stage-check.mjs: nothing uncommitted outside ${ALLOWED}`);
