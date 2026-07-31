import { resolve } from "node:path";
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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    phase = null;
    pendingPhaseReminder = false;
    guardOverride = null;
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
