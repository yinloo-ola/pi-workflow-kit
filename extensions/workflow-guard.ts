import {
  closeSync,
  constants,
  fstatSync,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  writeSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Workflow Guard extension.
 *
 * Blocks write/edit outside docs/plans/ and destructive bash during brainstorm and plan phases.
 * Bash uses a simple common-blacklist (DESTRUCTIVE_PATTERNS) — a command is allowed unless it matches
 * a destructive pattern. A short phase reminder is appended after the user's message each turn via
 * before_agent_start. You control phases explicitly via /skill: commands — no auto-detection, no prompts.
 */

type Phase = "brainstorm" | "plan" | null;

type DelegationStatus = "completed" | "failed" | "timed-out" | "skipped";

export interface DelegationOutcome {
  role: string;
  status: DelegationStatus;
  report?: string;
  error?: string;
  provider?: string;
  runId?: string;
}

export interface DelegationCoverage {
  complete: boolean;
  missing: string[];
  retainedReports: string[];
}

/** Summarize role outcomes without treating failed or empty outcomes as coverage. */
export function assessDelegationCoverage(
  requiredRoles: readonly string[],
  outcomes: readonly DelegationOutcome[],
): DelegationCoverage {
  const completedReports = new Map<string, string>();
  for (const outcome of outcomes) {
    if (outcome.status === "completed" && outcome.report) {
      completedReports.set(outcome.role, outcome.report);
    }
  }

  const missing = requiredRoles.filter((role) => !completedReports.has(role));
  return {
    complete: missing.length === 0,
    missing,
    retainedReports: [...completedReports.values()],
  };
}

export const ROLE_NAMES = [
  "pwk-recon-scout",
  "pwk-spec-reviewer",
  "pwk-tracing-reviewer",
  "pwk-smell-reviewer",
  "pwk-hazard-reviewer",
] as const;

const REVIEWER_ROLES = ["pwk-spec-reviewer", "pwk-tracing-reviewer", "pwk-smell-reviewer", "pwk-hazard-reviewer"];
const FAST_TIER_ROLES = ["pwk-smell-reviewer", "pwk-hazard-reviewer"];

const FAST_MODEL_PLACEHOLDER = "# model: <fast-tier> — set yours via /pwk-setup";

/** Apply a fast-tier model hint to a role definition.
 *
 * Replaces an existing `model:` line; else swaps the commented placeholder for
 * `model: <model>`; else inserts after `systemPromptMode:` when `insertIfAbsent`
 * (the all-four path for judgment roles, which ship no placeholder). Pure: same
 * input always yields the same output, so install comparisons stay byte-exact.
 */
export function applyFastModelHint(content: string, model: string, opts?: { insertIfAbsent?: boolean }): string {
  const trimmed = model.trim();
  if (!trimmed || /\s/.test(trimmed)) throw new Error(`Invalid fast model name: ${JSON.stringify(model)}`);
  if (/^model: /m.test(content)) {
    return content.replace(/^model: .*$/m, `model: ${trimmed}`);
  }
  if (content.includes(FAST_MODEL_PLACEHOLDER)) {
    return content.replace(FAST_MODEL_PLACEHOLDER, `model: ${trimmed}`);
  }
  if (opts?.insertIfAbsent) {
    return content.replace("systemPromptMode: replace\n", `systemPromptMode: replace\nmodel: ${trimmed}\n`);
  }
  return content;
}

/** True when the only difference between two contents is the model hint line
 * (an uncommented `model:` line or the commented placeholder). Such deltas are
 * kit-managed config and auto-update without --force; anything else conflicts.
 */
function differsOnlyByHint(a: string, b: string): boolean {
  const strip = (content: string) =>
    content
      .split("\n")
      .filter((line) => !/^model: \S/.test(line) && line !== FAST_MODEL_PLACEHOLDER)
      .join("\n");
  return strip(a) === strip(b);
}

const CANONICAL_AGENTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "agents");

function setupUsageError(): Error {
  return new Error("Usage: /pwk-setup [--force] [--fast-model <model>] [--all-roles]");
}

function parseSetupArgs(args: string): { force: boolean; fastModel?: string; allRoles: boolean } {
  const tokens = args.trim().split(/\s+/).filter(Boolean);
  let force = false;
  let allRoles = false;
  let fastModel: string | undefined;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--force") {
      force = true;
    } else if (token === "--all-roles") {
      allRoles = true;
    } else if (token.startsWith("--fast-model=")) {
      fastModel = token.slice("--fast-model=".length);
    } else if (token === "--fast-model") {
      const next = tokens[i + 1];
      if (next === undefined) throw setupUsageError();
      fastModel = next;
      i += 1;
    } else {
      throw setupUsageError();
    }
  }
  if (fastModel !== undefined && !fastModel.trim()) throw setupUsageError();
  return { force, fastModel, allRoles };
}

function ensureDirectory(path: string): void {
  const stats = statNoFollow(path);
  if (!stats) {
    mkdirSync(path);
    return;
  }
  if (stats.isSymbolicLink()) throw new Error(`Refusing symlink destination: ${path}`);
  if (!stats.isDirectory()) throw new Error(`Destination is not a directory: ${path}`);
}

/** lstat without following symlinks; null when the path does not exist. */
function statNoFollow(path: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

/** Read exactly `size` bytes from `fd` starting at position 0, regardless of the fd's cursor. */
function readAllFromFd(fd: number, size: number): string {
  const buffer = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const bytesRead = readSync(fd, buffer, offset, size - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return buffer.toString("utf8");
}

/** Write `content` to `fd` at position 0 (truncating first) and verify by reading the same fd back. */
function overwriteFd(fd: number, content: string, path: string): void {
  ftruncateSync(fd, 0);
  const buffer = Buffer.from(content, "utf8");
  writeSync(fd, buffer, 0, buffer.length, 0);
  if (readAllFromFd(fd, buffer.length) !== content) throw new Error(`Verification failed after writing: ${path}`);
}

function writeNewFile(path: string, content: string): void {
  const noFollow = constants.O_NOFOLLOW ?? 0;
  const flags = constants.O_RDWR | noFollow | constants.O_CREAT | constants.O_EXCL;
  const fd = openSync(path, flags, 0o644);
  try {
    overwriteFd(fd, content, path);
  } finally {
    closeSync(fd);
  }
}

function installRoleFiles(
  cwd: string,
  opts: { force: boolean; hint?: { model: string; allRoles: boolean } },
): { installed: string[]; skipped: string[] } {
  const projectAgentsDir = join(cwd, ".agents");
  const targetDir = join(projectAgentsDir, "agents");
  ensureDirectory(projectAgentsDir);
  ensureDirectory(targetDir);

  const installed: string[] = [];
  const skipped: string[] = [];
  const failures: string[] = [];
  const noFollow = constants.O_NOFOLLOW ?? 0;

  for (const roleName of ROLE_NAMES) {
    const sourcePath = join(CANONICAL_AGENTS_DIR, `${roleName}.md`);
    const targetPath = join(targetDir, `${roleName}.md`);

    try {
      // Read inside the try: one broken canonical source becomes a per-role failure
      // instead of aborting the whole install and hiding other roles' results.
      const canonical = readFileSync(sourcePath, "utf8");
      const hintApplies =
        opts.hint !== undefined && (opts.hint.allRoles ? REVIEWER_ROLES : FAST_TIER_ROLES).includes(roleName);
      const content =
        hintApplies && opts.hint ? applyFastModelHint(canonical, opts.hint.model, { insertIfAbsent: true }) : canonical;

      // Open the existing target (if any) once and do every check/read/write through
      // that single fd — the fd names one fixed inode, so nothing swapped in on the
      // path between checks (TOCTOU) can affect what gets read or written.
      let fd: number | null;
      try {
        fd = openSync(targetPath, constants.O_RDWR | noFollow);
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          fd = null;
        } else if (err.code === "ELOOP") {
          throw new Error(`Refusing symlink destination: ${targetPath}`);
        } else {
          throw error;
        }
      }

      if (fd === null) {
        writeNewFile(targetPath, content);
        installed.push(roleName);
        continue;
      }

      try {
        const stats = fstatSync(fd);
        if (!stats.isFile()) throw new Error(`Refusing non-regular destination: ${targetPath}`);

        const existing = readAllFromFd(fd, stats.size);
        if (existing === content) {
          skipped.push(roleName);
          continue;
        }
        if (differsOnlyByHint(existing, content)) {
          overwriteFd(fd, content, targetPath);
          installed.push(roleName);
          continue;
        }
        if (!opts.force) {
          failures.push(`${targetPath}: conflict (use /pwk-setup --force to replace it)`);
          continue;
        }

        overwriteFd(fd, content, targetPath);
        installed.push(roleName);
      } finally {
        closeSync(fd);
      }
    } catch (error) {
      failures.push(`${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures.length > 0) {
    const partial =
      installed.length + skipped.length > 0
        ? ` (${installed.length} installed, ${skipped.length} skipped before failure — installation is partial)`
        : "";
    throw new Error(`PWK setup incomplete${partial}:\n${failures.join("\n")}`);
  }
  return { installed, skipped };
}

/** Minimal structural view of the command context the fast-model prompt needs. */
interface FastModelPromptContext {
  cwd: string;
  hasUI?: boolean;
  scopedModels?: { model?: string }[];
  ui?: {
    select?: (title: string, options: { value: string; label: string; description: string }[]) => Promise<string>;
    confirm?: (title: string, message: string) => Promise<boolean>;
  };
}

/** True when an installed fast-tier role already carries a model hint. */
function installedHintPresent(cwd: string): boolean {
  for (const role of FAST_TIER_ROLES) {
    try {
      if (/^model: /m.test(readFileSync(join(cwd, ".agents", "agents", `${role}.md`), "utf8"))) return true;
    } catch {
      // not installed yet — keep looking
    }
  }
  return false;
}

/** Ask for the fast-tier model once, only when a picker is available, no hint is
 * installed, and no --fast-model argument was given. Headless hosts skip silently
 * and reviewers stay on default models. */
async function promptFastModelChoice(
  ctx: FastModelPromptContext,
): Promise<{ model: string; allRoles: boolean } | undefined> {
  const ui = ctx.ui;
  if (typeof ui?.select !== "function" || ctx.hasUI === false) return undefined;
  if (installedHintPresent(ctx.cwd)) return undefined;
  const scoped = Array.isArray(ctx.scopedModels) ? ctx.scopedModels : [];
  const models = scoped
    .map((entry) => (typeof entry?.model === "string" ? entry.model : undefined))
    .filter((model): model is string => model !== undefined && model.length > 0);
  const options = [
    ...models.map((model) => ({ value: model, label: model, description: "fast-tier reviewer model" })),
    { value: "skip", label: "skip", description: "reviewers run on default models" },
  ];
  const choice = await ui.select("Fast-tier model for smell/hazard reviewers", options);
  if (!choice || choice === "skip") return undefined;
  const allRoles = (await ui.confirm?.("Apply to all four reviewers?", "No = smell+hazard only")) ?? false;
  return { model: choice, allRoles };
}

// Destructive commands blocked in brainstorm/plan phases (simple common blacklist)
const DESTRUCTIVE_PATTERNS = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bchgrp\b/i,
  /\bln\b/i,
  /\btee\b/i,
  /\btruncate\b/i,
  /\bdd\b/i,
  /\bshred\b/i,
  /\bnpm\s+(install|uninstall|update|ci|link|publish)/i,
  /\byarn\s+(add|remove|install|publish)/i,
  /\bpnpm\s+(add|remove|install|publish)/i,
  /\bpip\s+(install|uninstall)/i,
  /\bapt(-get)?\s+(install|remove|purge|update|upgrade)/i,
  /\bbrew\s+(install|uninstall|upgrade)/i,
  // git add/commit/apply merge files and are blocked below. Plain `git branch`/`checkout`/`switch`
  // only create or move between branches (no source-file changes), so they are intentionally allowed
  // during gated phases — pwk-writing-plans creates the feature branch before authoring the plan.
  /\bgit\s+(add|commit|push|pull|merge|rebase|reset|branch\s+-[dD]|stash(?!\s+list)|cherry-pick|revert|tag(?!\s+(-l|--list))|init|clone|apply)/i,
  // Edit-via-bash vectors: in-place editors, patch appliers, find-delete (bypass the write/edit tool block)
  /\bsed\b.*\s-i\b/i,
  /\bperl\b.*\s-[a-z]*i\b/i,
  /\bawk\b.*-i\s+inplace\b/i,
  /^\s*patch\b/i, // command-position only — avoids FP on "patch" in paths/searches (grep/cat/cd)
  /\bfind\b.*\s-delete\b/i,
  /\bsudo\b/i,
  /\bsu\b/i,
  /\bkill\b/i,
  /\bpkill\b/i,
  /\bkillall\b/i,
  /\breboot\b/i,
  /\bshutdown\b/i,
  /\bsystemctl\s+(start|stop|restart|enable|disable)/i,
  /\bservice\s+\S+\s+(start|stop|restart)/i,
  /^\s*(vim?|nano|emacs|code|subl)\b/i,
];

// Redirect operators — tested on a quote-stripped command so '>' inside quoted
// arguments (e.g. grep 'x > y') doesn't false-positive.
const REDIRECT_PATTERNS = [/(^|[^<])>(?!>)/, />>/];

/** Split a compound command into individual sub-commands.
 * Splits on &&, ||, and ; operators, ignoring leading whitespace.
 * Does NOT split on | (pipe) to allow piping (e.g. `git log | head`).
 */
function splitCompoundCommand(command: string): string[] {
  // Match sub-commands separated by &&, ||, ; (with optional whitespace)
  // We don't split on | to allow piping (e.g. `git log | head`)
  return command
    .split(/&&|\|\||;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Strip stderr redirects that are purely cosmetic (no side effects). */
function stripHarmlessRedirects(cmd: string): string {
  return cmd.replace(/\s*2\s*>\s*(\/dev\/null|&1)\b/g, "");
}

/** Blank out single- and double-quoted substrings so operators (>,
 *  >>, &&) inside quoted arguments don't trigger destructive-pattern
 *  false-positives. Replaces quoted content and quote chars with spaces,
 *  preserving length so operators outside quotes still match.
 *  Advisory only — not a full shell parser. */
function stripQuoted(cmd: string): string {
  let out = "";
  let i = 0;
  let inQuote = false;
  while (i < cmd.length) {
    const ch = cmd[i];
    const code = cmd.charCodeAt(i);
    if (inQuote) {
      if (code === 0x5c) {
        out += "  ";
        i += 2;
        continue;
      }
      out += " ";
      if (code === 0x22 || code === 0x27) {
        inQuote = false;
      }
      i++;
      continue;
    }
    if (code === 0x22 || code === 0x27) {
      inQuote = true;
      out += " ";
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

export function isSafeCommand(command: string): boolean {
  return splitCompoundCommand(command).every((part) => {
    const cleaned = stripHarmlessRedirects(part);
    if (REDIRECT_PATTERNS.some((p) => p.test(stripQuoted(cleaned)))) return false;
    return !DESTRUCTIVE_PATTERNS.some((p) => p.test(cleaned));
  });
}

const SKILL_TO_PHASE: Record<string, Phase> = {
  "pwk-brainstorming": "brainstorm",
  "pwk-writing-plans": "plan",
};

/** Skills whose invocation exits a gated phase (used by the input handler; exported for tests/
 *  skill-lint). Deliberately excludes pwk-status (read-only by design; stays gated). */
export const UNLOCK_SKILLS = ["pwk-executing-tasks", "pwk-finalizing", "pwk-code-review", "pwk-diagnose"] as const;

/** Phase-aware reminder appended after the user's message each turn while a gated phase is active.
 *  Returned as a message (not a system-prompt change) so it sits at the tail of the request and
 *  never invalidates the cached prefix. */
const PHASE_REMINDERS: Record<Exclude<Phase, null>, string> = {
  brainstorm:
    "[pi-workflow-kit] BRAINSTORM phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
  plan: "[pi-workflow-kit] PLAN phase: read-only. No source edits; writes only under docs/plans/. No mutations.",
};

/** Determine if a write/edit to filePath should be blocked during the given phase.
 *  Only writes under docs/plans/ are allowed during brainstorm and plan phases.
 */
export function shouldBlockFilePath(filePath: string, cwd: string): boolean {
  const absolute = resolve(cwd, filePath);
  const plansDir = resolve(cwd, "docs/plans");
  return !absolute.startsWith(`${plansDir}/`);
}

export function getCurrentPhase(): Phase {
  return phase;
}

let phase: Phase = null;
// True on the turn a gated phase is entered; consumed once by before_agent_start so the reminder
// is shown only on the first turn of the phase (and re-armed on any later phase change into it).
let pendingPhaseReminder = false;

/**
 * Manual guard override set by `/pwk-guard`.
 * - null  → "auto": enforcement follows the skill-driven phase (default).
 * - "on"  → force a read-only lock (enforce regardless of phase).
 * - "off" → disable the guard entirely (escape hatch).
 * Skill transitions still update `phase` while an override is active, so returning
 * to `auto` recovers the correct state; enforcement itself ignores `phase`.
 */
let guardOverride: "on" | "off" | null = null;

/** Is the guard actively enforcing read-only right now? */
function enforceActive(): boolean {
  if (guardOverride === "off") return false;
  if (guardOverride === "on") return true;
  return phase !== null;
}

/** Label for the current enforcement context, used in block reasons and reminders. */
function enforceLabel(): string {
  return guardOverride === "on" ? "GUARD ON" : phase ? phase.toUpperCase() : "";
}

/**
 * Is `/pwk-setup` blocked right now? Deliberately NOT `enforceActive()`: setup must
 * refuse during a gated phase even when the tool-call guard is manually disabled
 * (`/pwk-guard off`), since its own banner promises writes stay confined to
 * docs/plans/ for the whole gated phase, override or not.
 */
function setupBlocked(): boolean {
  return phase !== null || guardOverride === "on";
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    phase = null;
    pendingPhaseReminder = false;
    guardOverride = null;
  });

  // --- Project role setup -------------------------------------------------
  // This command writes through Node rather than the write tool, so it enforces
  // the gated-phase boundary itself instead of relying on tool_call interception.
  pi.registerCommand("pwk-setup", {
    description: "Install PWK role agents into .agents/agents/",
    handler: async (args, ctx) => {
      // Refuse whenever the session is read-only in fact: gated phase (even with the
      // tool-call guard manually disabled — the design mandates that) or the manual
      // read-only lock, whose banner promises "writes only under docs/plans/".
      if (setupBlocked()) {
        const scope =
          guardOverride === "on"
            ? "the manual read-only lock (/pwk-guard on)"
            : `${(phase as string).toUpperCase()} phase`;
        const message = `Cannot run /pwk-setup during ${scope}. Run it before entering the gated workflow or after leaving it (guard auto/off).`;
        ctx.ui.notify(message, "warning");
        throw new Error(message);
      }

      const { force, fastModel, allRoles } = parseSetupArgs(args ?? "");
      try {
        const hint = fastModel !== undefined ? { model: fastModel, allRoles } : await promptFastModelChoice(ctx);
        const result = installRoleFiles(ctx.cwd, { force, hint });
        const parts = [`PWK setup complete: ${result.installed.length} installed`];
        if (result.skipped.length > 0) parts.push(`${result.skipped.length} skipped`);
        if (force) parts.push("forced conflicts replaced");
        if (hint) {
          const scope = hint.allRoles ? "all four reviewers" : "smell+hazard reviewers";
          parts.push(`fast model ${hint.model} (${scope})`);
        }
        ctx.ui.notify(`${parts.join(", ")}. Providers may require /reload to discover updated roles.`, "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(message, "error");
        throw error;
      }
    },
  });

  // --- Manual override (escape hatch) -----------------------------------
  // Phases are driven by `/skill:` commands; `/pwk-guard` lets the user pin the
  // guard regardless of phase. `/pwk-guard auto` returns control to skill transitions.
  pi.registerCommand("pwk-guard", {
    description:
      "Manual guard override: /pwk-guard on (force read-only lock) | off (disable guard) | auto (skill-driven phases, default).",
    getArgumentCompletions: (prefix) => {
      const p = (prefix ?? "").trim().toLowerCase();
      const opts = [
        { value: "on", label: "on", description: "Force read-only lock (ignore skill phases)" },
        { value: "off", label: "off", description: "Disable the guard entirely" },
        { value: "auto", label: "auto", description: "Follow skill-driven phases (default)" },
      ];
      const matched = opts.filter((o) => o.value.startsWith(p));
      return matched.length ? matched : opts;
    },
    handler: async (args, ctx) => {
      const arg = (args ?? "").trim().toLowerCase();
      if (arg === "auto") {
        guardOverride = null;
        if (phase) pendingPhaseReminder = true; // re-announce the active gated phase, if any
        ctx.ui.notify("Guard AUTO — enforcement follows skill-driven phases.", "info");
        return;
      }
      if (arg !== "on" && arg !== "off") {
        ctx.ui.notify("Usage: /pwk-guard on | off | auto", "info");
        return;
      }
      guardOverride = arg;
      pendingPhaseReminder = false; // override announces itself via the message below
      pi.sendMessage({
        customType: "pwk-guard:override",
        content:
          arg === "on"
            ? "[pi-workflow-kit] GUARD ON (manual override): read-only lock active — no source edits; writes only under docs/plans/. No mutations. Use /pwk-guard auto to resume skill-driven phases."
            : "[pi-workflow-kit] GUARD OFF (manual override): enforcement disabled — writes and bash are unrestricted. Use /pwk-guard auto to resume skill-driven phases.",
        display: false,
      });
      ctx.ui.notify(
        arg === "on"
          ? "Guard ON — read-only lock active (skill phases ignored)."
          : "Guard OFF — enforcement disabled (skill phases ignored).",
        arg === "on" ? "warning" : "info",
      );
    },
  });

  pi.on("input", (event) => {
    const text = event.text ?? "";
    const match = text.match(/^\/skill:([\w-]+)/);
    if (match) {
      const skill = match[1];
      if (skill in SKILL_TO_PHASE) {
        const nextPhase = SKILL_TO_PHASE[skill];
        if (phase !== nextPhase) {
          phase = nextPhase;
          // The reminder is a phase-entry cue; only relevant when the guard is auto-driven.
          if (guardOverride === null) pendingPhaseReminder = true;
        }
        return;
      }
    }
    // Phase transitions happen only via skills — no message keyword unlocks the plan phase.
    // Run /skill:pwk-executing-tasks (or another write-needing skill) to leave a gated phase.
    //
    // Unlock list rationale: execute/finalize/code-review/diagnose all need to write source
    // (implement, edit review fixes, add [DEBUG-] instrumentation), so they exit the gate.
    // pwk-status is NOT here on purpose: it is read-only orientation, so it stays inside the
    // gated phase and never drops the write boundary the user is relying on.
    // (Orientation never needs write access; see skills/pwk-status.)
    if (UNLOCK_SKILLS.some((s) => text.startsWith(`/skill:${s}`))) {
      phase = null;
    }
  });

  // Show the phase reminder exactly once: on the first turn of a gated phase (before_agent_start
  // fires before the LLM is called). It is NOT repeated every turn. Re-armed on any phase change.
  // Returned as a tail-appended custom message so it never touches the cached system-prompt prefix.
  //
  // Note: a soft reminder on every *permitted* bash call is not possible — tool_call can only
  // return { block, reason }, not a message. So at bash time the reminder surfaces only when a
  // destructive command is actually blocked (the reactive `reason` in the tool_call handler).
  pi.on("before_agent_start", async () => {
    if (!phase || !pendingPhaseReminder) return {};
    pendingPhaseReminder = false;
    // Override states announce themselves via the /pwk-guard handler; this reminder
    // is the auto-mode phase-entry cue only.
    if (guardOverride !== null) return {};
    return {
      message: {
        customType: "pwk-phase-reminder",
        content: PHASE_REMINDERS[phase],
        display: false,
      },
    };
  });

  pi.on("tool_call", (event, ctx) => {
    if (!enforceActive()) return;
    const label = enforceLabel();
    const manual = guardOverride === "on";
    const scope = manual ? "manual read-only lock" : `${label.toLowerCase()} phase`;

    if (event.toolName === "bash") {
      const command = (event.input as { command?: string }).command ?? "";
      if (!isSafeCommand(command)) {
        if (ctx.hasUI) {
          ctx.ui.notify(`Blocked bash command (${scope}): ${command}`, "warning");
        }
        return {
          block: true,
          reason: `⚠️ ${label}: read-only — no source writes or destructive bash. Only read-only commands are permitted.\nBlocked command: ${command}`,
        };
      }
      return;
    }

    if (event.toolName !== "write" && event.toolName !== "edit") return;

    const filePath = (event.input as { path?: string }).path ?? "";
    if (!filePath) return;

    if (!shouldBlockFilePath(filePath, ctx.cwd)) return;

    if (ctx.hasUI) {
      ctx.ui.notify(`Blocked ${event.toolName} to ${filePath} (${scope}). Only docs/plans/ is writable.`, "warning");
    }

    return {
      block: true,
      reason: `⚠️ ${label}: Cannot ${event.toolName} to ${filePath}. Only docs/plans/ is writable${
        manual ? " under the manual read-only lock" : " during brainstorming and planning"
      }.`,
    };
  });
}
