/**
 * Plan Tracker Extension
 *
 * A native pi tool for tracking plan progress with per-task phase and attempt tracking.
 * State is stored in tool result details for proper branching support.
 * Shows a persistent TUI widget above the editor.
 */

import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { type Static, Type } from "@sinclair/typebox";

type TaskStatus = "pending" | "in_progress" | "complete" | "blocked";
type TaskPhase = "pending" | "define" | "approve" | "execute" | "verify" | "review" | "fix" | "complete" | "blocked";
type TaskType = "code" | "non-code";

interface Task {
  name: string;
  status: TaskStatus;
  phase: TaskPhase;
  type: TaskType;
  executeAttempts: number;
  fixAttempts: number;
}

interface PlanTrackerDetails {
  action: "init" | "update" | "status" | "clear";
  tasks: Task[];
  error?: string;
}

const TASK_PHASES: readonly string[] = [
  "pending", "define", "approve", "execute", "verify", "review", "fix", "complete", "blocked",
] as const;

const TASK_STATUSES: readonly string[] = ["pending", "in_progress", "complete", "blocked"] as const;

const PlanTrackerParams = Type.Object({
  action: StringEnum(["init", "update", "status", "clear"] as const, {
    description: "Action to perform",
  }),
  tasks: Type.Optional(
    Type.Array(Type.String(), {
      description: "Task names (for init)",
    }),
  ),
  index: Type.Optional(
    Type.Integer({
      minimum: 0,
      description: "Task index, 0-based (for update)",
    }),
  ),
  status: Type.Optional(
    StringEnum(TASK_STATUSES as unknown as readonly [string, ...string[]], {
      description: "New status (for update)",
    }),
  ),
  phase: Type.Optional(
    StringEnum(TASK_PHASES as unknown as readonly [string, ...string[]], {
      description: "New phase (for update)",
    }),
  ),
  type: Type.Optional(
    StringEnum(["code", "non-code"] as const, {
      description: "Task type (for update)",
    }),
  ),
  attempts: Type.Optional(
    Type.Integer({
      minimum: 0,
      description: "Attempt count — increments executeAttempts or fixAttempts depending on current phase (for update)",
    }),
  ),
});

export type PlanTrackerInput = Static<typeof PlanTrackerParams>;

function createDefaultTask(name: string): Task {
  return {
    name,
    status: "pending",
    phase: "pending",
    type: "code",
    executeAttempts: 0,
    fixAttempts: 0,
  };
}

function phaseIcon(status: TaskStatus, phase: TaskPhase): string {
  if (status === "complete" || phase === "complete") return "✓";
  if (status === "blocked" || phase === "blocked") return "⛔";
  if (phase === "define") return "📝";
  if (phase === "approve") return "👀";
  if (phase === "execute") return "⚙";
  if (phase === "verify") return "✓";
  if (phase === "review") return "🔍";
  if (phase === "fix") return "🔧";
  if (status === "in_progress") return "→";
  return "○";
}

function formatWidget(tasks: Task[], theme: Theme): string {
  if (tasks.length === 0) return "";

  const complete = tasks.filter((t) => t.status === "complete").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const icons = tasks.map((t) => {
    switch (t.status) {
      case "complete":
        return theme.fg("success", "✓");
      case "blocked":
        return theme.fg("error", "⛔");
      case "in_progress":
        return theme.fg("warning", "→");
      default:
        return theme.fg("dim", "○");
    }
  }).join("");

  const summary = theme.fg("muted", `(${complete}/${tasks.length})`);
  const blockedNote = blocked > 0 ? ` ${theme.fg("error", `${blocked} blocked`)}` : "";

  // Show current task with phase
  const current = tasks.find((t) => t.status === "in_progress") ?? tasks.find((t) => t.status === "pending");
  const currentInfo = current && current.status === "in_progress"
    ? `  ${theme.fg("muted", current.name)} — ${theme.fg("dim", current.phase)}${current.phase === "fix" || current.phase === "execute" ? ` (${current.phase === "fix" ? current.fixAttempts : current.executeAttempts}/3)` : ""}`
    : current ? `  ${theme.fg("muted", current.name)}`
    : "";

  return `${theme.fg("muted", "Tasks:")} ${icons} ${summary}${blockedNote}${currentInfo}`;
}

function formatStatus(tasks: Task[]): string {
  if (tasks.length === 0) return "No plan active.";

  const complete = tasks.filter((t) => t.status === "complete").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;

  const lines: string[] = [];
  lines.push(`Plan: ${complete}/${tasks.length} complete (${inProgress} in progress, ${pending} pending${blocked > 0 ? `, ${blocked} blocked` : ""})`);
  lines.push("");
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const icon = phaseIcon(t.status, t.phase);
    const phaseStr = t.status === "in_progress" ? ` [${t.phase}]` : "";
    const attemptsStr = t.status === "in_progress" && (t.phase === "execute" || t.phase === "fix")
      ? ` (${t.phase === "fix" ? t.fixAttempts : t.executeAttempts}/3)`
      : "";
    const typeStr = t.type === "non-code" ? " 📋" : "";
    lines.push(`  ${icon} [${i}] ${t.name}${typeStr}${phaseStr}${attemptsStr}`);
  }
  return lines.join("\n");
}

function statusToPhase(status: TaskStatus): TaskPhase {
  switch (status) {
    case "complete":
      return "complete";
    case "blocked":
      return "blocked";
    default:
      return undefined as unknown as TaskPhase;
  }
}

export default function (pi: ExtensionAPI) {
  let tasks: Task[] = [];

  const reconstructState = (ctx: ExtensionContext) => {
    tasks = [];
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type !== "message") continue;
      const msg = entry.message;
      if (msg.role !== "toolResult" || msg.toolName !== "plan_tracker") continue;
      const details = msg.details as PlanTrackerDetails | undefined;
      if (details && !details.error) {
        tasks = details.tasks;
      }
    }
  };

  const updateWidget = (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;
    if (tasks.length === 0) {
      ctx.ui.setWidget("plan_tracker", undefined);
    } else {
      ctx.ui.setWidget("plan_tracker", (_tui, theme) => {
        return new Text(formatWidget(tasks, theme), 0, 0);
      });
    }
  };

  // Reconstruct state + widget on session events
  for (const event of ["session_start", "session_switch", "session_fork", "session_tree"] as const) {
    pi.on(event, async (_event, ctx) => {
      reconstructState(ctx);
      updateWidget(ctx);
    });
  }

  pi.registerTool({
    name: "plan_tracker",
    label: "Plan Tracker",
    description:
      "Track implementation plan progress with per-task phase and attempt tracking. Actions: init (set task list), update (change task status/phase/type/attempts), status (show current state), clear (remove plan).",
    parameters: PlanTrackerParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      switch (params.action) {
        case "init": {
          if (!params.tasks || params.tasks.length === 0) {
            return {
              content: [{ type: "text", text: "Error: tasks array required for init" }],
              details: {
                action: "init",
                tasks: [...tasks],
                error: "tasks required",
              } as PlanTrackerDetails,
            };
          }
          tasks = params.tasks.map((name) => createDefaultTask(name));
          updateWidget(ctx);
          return {
            content: [
              {
                type: "text",
                text: `Plan initialized with ${tasks.length} tasks.\n${formatStatus(tasks)}`,
              },
            ],
            details: { action: "init", tasks: [...tasks] } as PlanTrackerDetails,
          };
        }

        case "update": {
          if (params.index === undefined) {
            return {
              content: [{ type: "text", text: "Error: index required for update" }],
              details: {
                action: "update",
                tasks: [...tasks],
                error: "index required",
              } as PlanTrackerDetails,
            };
          }
          if (tasks.length === 0) {
            return {
              content: [{ type: "text", text: "Error: no plan active. Use init first." }],
              details: {
                action: "update",
                tasks: [],
                error: "no plan active",
              } as PlanTrackerDetails,
            };
          }
          if (params.index < 0 || params.index >= tasks.length) {
            return {
              content: [
                {
                  type: "text",
                  text: `Error: index ${params.index} out of range (0-${tasks.length - 1})`,
                },
              ],
              details: {
                action: "update",
                tasks: [...tasks],
                error: `index ${params.index} out of range`,
              } as PlanTrackerDetails,
            };
          }

          const task = tasks[params.index];
          const updates: string[] = [];

          // Update status (backward compatible)
          if (params.status) {
            task.status = params.status;
            // Auto-sync phase from terminal statuses
            if (params.status === "complete" || params.status === "blocked") {
              task.phase = statusToPhase(params.status);
            } else if (params.status === "in_progress" && task.phase === "pending") {
              task.phase = "define";
            }
            updates.push(`status → ${params.status}`);
          }

          // Update phase
          if (params.phase) {
            task.phase = params.phase;
            // Auto-sync status from phase
            if (params.phase === "complete") task.status = "complete";
            else if (params.phase === "blocked") task.status = "blocked";
            else if (params.status !== "in_progress") task.status = "in_progress";
            updates.push(`phase → ${params.phase}`);
          }

          // Update type
          if (params.type) {
            task.type = params.type;
            updates.push(`type → ${params.type}`);
          }

          // Update attempts
          if (params.attempts !== undefined) {
            if (task.phase === "fix") {
              task.fixAttempts = params.attempts;
              updates.push(`fixAttempts → ${params.attempts}`);
            } else if (task.phase === "execute") {
              task.executeAttempts = params.attempts;
              updates.push(`executeAttempts → ${params.attempts}`);
            } else {
              // Default to execute attempts if phase is ambiguous
              task.executeAttempts = params.attempts;
              updates.push(`executeAttempts → ${params.attempts}`);
            }
          }

          updateWidget(ctx);

          const updateSummary = updates.length > 0 ? ` (${updates.join(", ")})` : "";
          return {
            content: [
              {
                type: "text",
                text: `Task ${params.index} "${task.name}"${updateSummary}\n${formatStatus(tasks)}`,
              },
            ],
            details: { action: "update", tasks: [...tasks] } as PlanTrackerDetails,
          };
        }

        case "status": {
          return {
            content: [{ type: "text", text: formatStatus(tasks) }],
            details: { action: "status", tasks: [...tasks] } as PlanTrackerDetails,
          };
        }

        case "clear": {
          const count = tasks.length;
          tasks = [];
          updateWidget(ctx);
          return {
            content: [
              {
                type: "text",
                text: count > 0 ? `Plan cleared (${count} tasks removed).` : "No plan was active.",
              },
            ],
            details: { action: "clear", tasks: [] } as PlanTrackerDetails,
          };
        }

        default:
          return {
            content: [{ type: "text", text: `Unknown action: ${params.action}` }],
            details: {
              action: "status",
              tasks: [...tasks],
              error: `unknown action`,
            } as PlanTrackerDetails,
          };
      }
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("plan_tracker "));
      text += theme.fg("muted", args.action);
      if (args.action === "update" && args.index !== undefined) {
        text += ` ${theme.fg("accent", `[${args.index}]`)}`;
        const parts: string[] = [];
        if (args.status) parts.push(args.status);
        if (args.phase) parts.push(args.phase);
        if (args.type) parts.push(args.type);
        if (args.attempts !== undefined) parts.push(`attempt ${args.attempts}`);
        if (parts.length > 0) text += ` → ${theme.fg("dim", parts.join(", "))}`;
      }
      if (args.action === "init" && args.tasks) {
        text += ` ${theme.fg("dim", `(${args.tasks.length} tasks)`)}`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme) {
      const details = result.details as PlanTrackerDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.error) {
        return new Text(theme.fg("error", `Error: ${details.error}`), 0, 0);
      }

      const taskList = details.tasks;
      switch (details.action) {
        case "init":
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", `Plan initialized with ${taskList.length} tasks`),
            0,
            0,
          );
        case "update": {
          const complete = taskList.filter((t) => t.status === "complete").length;
          return new Text(
            theme.fg("success", "✓ ") + theme.fg("muted", `Updated (${complete}/${taskList.length} complete)`),
            0,
            0,
          );
        }
        case "status": {
          if (taskList.length === 0) {
            return new Text(theme.fg("dim", "No plan active"), 0, 0);
          }
          const complete = taskList.filter((t) => t.status === "complete").length;
          let text = theme.fg("muted", `${complete}/${taskList.length} complete`);
          for (const t of taskList) {
            const icon =
              t.status === "complete"
                ? theme.fg("success", "✓")
                : t.status === "blocked"
                  ? theme.fg("error", "⛔")
                  : t.status === "in_progress"
                    ? theme.fg("warning", "→")
                    : theme.fg("dim", "○");
            const phaseStr = t.status === "in_progress" ? ` [${t.phase}]` : "";
            text += `\n${icon} ${theme.fg("muted", t.name)}${phaseStr}`;
          }
          return new Text(text, 0, 0);
        }
        case "clear":
          return new Text(theme.fg("success", "✓ ") + theme.fg("muted", "Plan cleared"), 0, 0);
        default:
          return new Text(theme.fg("dim", "Done"), 0, 0);
      }
    },
  });
}
