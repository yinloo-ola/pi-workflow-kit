import { resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Workflow Guard extension.
 *
 * Blocks write/edit outside docs/plans/ and unsafe bash during brainstorm and plan phases.
 * You control phases explicitly via /skill: commands — no auto-detection,
 * no state persistence, no prompts.
 */

type Phase = "brainstorm" | "plan" | null;

// Destructive commands blocked in brainstorm/plan phases
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
	/\bgit\s+(add|commit|push|pull|merge|rebase|reset|checkout|branch\s+-[dD]|stash|cherry-pick|revert|tag|init|clone)/i,
	/\bsudo\b/i,
	/\bsu\b/i,
	/\bkill\b/i,
	/\bpkill\b/i,
	/\bkillall\b/i,
	/\breboot\b/i,
	/\bshutdown\b/i,
	/\bsystemctl\s+(start|stop|restart|enable|disable)/i,
	/\bservice\s+\S+\s+(start|stop|restart)/i,
	/\b(vim?|nano|emacs|code|subl)\b/i,
];

const SAFE_PATTERNS = [
	/^\s*cat\b/,
	/^\s*head\b/,
	/^\s*tail\b/,
	/^\s*less\b/,
	/^\s*more\b/,
	/^\s*grep\b/,
	/^\s*find\b/,
	/^\s*ls\b/,
	/^\s*pwd\b/,
	/^\s*echo\b/,
	/^\s*printf\b/,
	/^\s*wc\b/,
	/^\s*sort\b/,
	/^\s*uniq\b/,
	/^\s*diff\b/,
	/^\s*file\b/,
	/^\s*stat\b/,
	/^\s*du\b/,
	/^\s*df\b/,
	/^\s*tree\b/,
	/^\s*which\b/,
	/^\s*whereis\b/,
	/^\s*type\b/,
	/^\s*env\b/,
	/^\s*printenv\b/,
	/^\s*uname\b/,
	/^\s*whoami\b/,
	/^\s*id\b/,
	/^\s*date\b/,
	/^\s*cal\b/,
	/^\s*uptime\b/,
	/^\s*ps\b/,
	/^\s*top\b/,
	/^\s*htop\b/,
	/^\s*free\b/,
	/^\s*git\s+(status|log|diff|show|branch|remote|config\s+--get)/i,
	/^\s*git\s+ls-/i,
	/^\s*npm\s+(list|ls|view|info|search|outdated|audit)/i,
	/^\s*yarn\s+(list|info|why|audit)/i,
	/^\s*node\s+--version/i,
	/^\s*python\s+--version/i,
	/^\s*curl\s/i,
	/^\s*wget\s+-O\s*-/i,
	/^\s*jq\b/,
	/^\s*sed\s+-n/i,
	/^\s*awk\b/,
	/^\s*rg\b/,
	/^\s*fd\b/,
	/^\s*bat\b/,
	/^\s*eza\b/,
	/^\s*cd\b/,
	/^\s*gh\s+pr\s+(view|list|diff|checks|status)\b/i,
	/^\s*gh\s+issue\s+(view|list)\b/i,
	/^\s*gh\s+repo\s+(view|fork|list)\b/i,
	/^\s*gh\s+release\s+(view|list|download)\b/i,
	/^\s*gh\s+run\s+(view|list)\b/i,
	/^\s*git\s+blame\b/,
	/^\s*git\s+shortlog\b/,
	/^\s*git\s+stash\s+list\b/i,
	/^\s*git\s+tag\s+(-l|--list)\b/i,
	/^\s*git\s+describe\b/,
];

/** Split a compound command into individual sub-commands.
 * Handles &&, ||, ;, and | (pipe) operators, ignoring leading whitespace.
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
	const parts = splitCompoundCommand(command);
	return parts.every(
		(part) => {
			const cleaned = stripHarmlessRedirects(part);
			const isDestructive = DESTRUCTIVE_PATTERNS.some((p) => p.test(cleaned));
			const isSafe = SAFE_PATTERNS.some((p) => p.test(cleaned));
			return !isDestructive && isSafe;
		},
	);
}

const SKILL_TO_PHASE: Record<string, Phase> = {
	brainstorming: "brainstorm",
	"writing-plans": "plan",
};

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
		if (
			text.startsWith("/skill:executing-tasks") ||
			text.startsWith("/skill:finalizing")
		) {
			phase = null;
		}
	});

	pi.on("tool_call", (event, ctx) => {
		if (!phase) return;

		if (event.toolName === "bash") {
			const command = (event.input as { command?: string }).command ?? "";
			if (!isSafeCommand(command)) {
				if (ctx.hasUI) {
					ctx.ui.notify(
						`Blocked bash command during ${phase} phase: ${command}`,
						"warning",
					);
				}
				return {
					block: true,
					reason: `⚠️ ${phase.toUpperCase()} PHASE: Bash command blocked (not allowlisted). Only read-only commands are permitted during brainstorming and planning.\nCommand: ${command}`,
				};
			}
			return;
		}

		if (event.toolName !== "write" && event.toolName !== "edit") return;

		const filePath = (event.input as { path?: string }).path ?? "";
		if (!filePath) return;

		const absolute = resolve(ctx.cwd, filePath);
		const plansDir = resolve(ctx.cwd, "docs/plans");
		if (absolute.startsWith(plansDir + "/")) return;

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
