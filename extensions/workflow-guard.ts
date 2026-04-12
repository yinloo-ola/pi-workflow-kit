import { resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

/**
 * Workflow Guard extension.
 *
 * Blocks write/edit outside docs/plans/ during brainstorm and plan phases.
 * You control phases explicitly via /skill: commands — no auto-detection,
 * no state persistence, no prompts.
 */

type Phase = "brainstorm" | "plan" | null;

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
