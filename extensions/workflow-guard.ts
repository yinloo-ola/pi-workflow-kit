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
  /(^|[^<])>(?!>)/,
  />>/,
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

export function isSafeCommand(command: string): boolean {
  return splitCompoundCommand(command).every((part) => {
    const cleaned = stripHarmlessRedirects(part);
    return !DESTRUCTIVE_PATTERNS.some((p) => p.test(cleaned));
  });
}

const SKILL_TO_PHASE: Record<string, Phase> = {
  "pwk-brainstorming": "brainstorm",
  "pwk-writing-plans": "plan",
};

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

export default function (pi: ExtensionAPI) {
  pi.on("session_start", () => {
    phase = null;
  });

  pi.on("input", (event) => {
    const text = event.text ?? "";
    const match = text.match(/^\/skill:([\w-]+)/);
    if (match) {
      const skill = match[1];
      if (skill in SKILL_TO_PHASE) {
        phase = SKILL_TO_PHASE[skill];
        return;
      }
    }
    // Approving a plan ends the gated plan phase (isolation/branch creation is then allowed).
    // Narrow verbs so design discussion like "should we approve X?" doesn't unlock.
    if (phase === "plan" && /\b(approve[ds]?|approved|accept(ing)?|lgtm|ship\s*it)\b/i.test(text)) {
      phase = null;
      return;
    }
    if (
      text.startsWith("/skill:pwk-executing-tasks") ||
      text.startsWith("/skill:pwk-finalizing") ||
      text.startsWith("/skill:pwk-code-review") ||
      text.startsWith("/skill:pwk-diagnose") ||
      text.startsWith("/skill:pwk-status")
    ) {
      phase = null;
    }
  });

  // Append a short phase reminder after the user's message each turn while a gated phase is active.
  // Returning { message } adds a custom message at the tail of the request (cache-safe: it never
  // touches the cached system-prompt/tools/history prefix).
  pi.on("before_agent_start", async () => {
    if (!phase) return {};
    return {
      message: {
        customType: "pwk-phase-reminder",
        content: PHASE_REMINDERS[phase],
        display: false,
      },
    };
  });

  pi.on("tool_call", (event, ctx) => {
    if (!phase) return;

    if (event.toolName === "bash") {
      const command = (event.input as { command?: string }).command ?? "";
      if (!isSafeCommand(command)) {
        if (ctx.hasUI) {
          ctx.ui.notify(`Blocked bash command during ${phase} phase: ${command}`, "warning");
        }
        return {
          block: true,
          reason: `⚠️ ${phase.toUpperCase()} PHASE: Bash command blocked (destructive). Only read-only commands are permitted during brainstorming and planning.\nCommand: ${command}`,
        };
      }
      return;
    }

    if (event.toolName !== "write" && event.toolName !== "edit") return;

    const filePath = (event.input as { path?: string }).path ?? "";
    if (!filePath) return;

    if (!shouldBlockFilePath(filePath, ctx.cwd)) return;

    if (ctx.hasUI) {
      ctx.ui.notify(
        `Blocked ${event.toolName} to ${filePath} during ${phase} phase. Only docs/plans/ is writable.`,
        "warning",
      );
    }

    return {
      block: true,
      reason: `⚠️ ${phase.toUpperCase()} PHASE: Cannot ${event.toolName} to ${filePath}. Only docs/plans/ is writable during brainstorming and planning.`,
    };
  });
}
