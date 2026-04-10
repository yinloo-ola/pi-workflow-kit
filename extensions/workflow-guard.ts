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
		for (const [skill, p] of Object.entries(SKILL_TO_PHASE)) {
			if (text.includes(skill)) {
				phase = p;
				return;
			}
		}
		if (
			text.includes("executing-tasks") ||
			text.includes("finalizing")
		) {
			phase = null;
		}
	});

	pi.on("tool_call", (event, ctx) => {
		if (!phase) return;

		if (event.toolName !== "write" && event.toolName !== "edit") return;

		const filePath = (event.input as { path?: string }).path ?? "";
		if (!filePath) return;

		if (filePath.startsWith("docs/plans/")) return;

		if (ctx.hasUI) {
			ctx.ui.notify(
				`Blocked ${event.toolName} to ${filePath} during ${phase} phase. Only docs/plans/ is writable.`,
				"warning",
			);
		}

		return {
			blocked: true,
			reason: `⚠️ ${phase.toUpperCase()} PHASE: Cannot ${event.toolName} to ${filePath}. Only docs/plans/ is writable during brainstorming and planning.`,
		};
	});
}
