/**
 * Workflow Kit monitor extension.
 *
 * Observes tool_call and tool_result events to:
 * - Track TDD phase (RED→GREEN→REFACTOR) and inject warnings on violations
 * - Track debug fix-fail cycles and inject warnings on investigation skips / thrashing
 * - Show workflow state in TUI widget
 * - Register workflow_reference tool for on-demand reference content
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import { PLAN_TRACKER_TOOL_NAME } from "./constants.js";
import { log } from "./lib/logging.js";
import type { PlanTrackerDetails } from "./plan-tracker.js";
import { getCurrentGitRef } from "./workflow-monitor/git";
import { getWorkflowNextCompletions } from "./workflow-monitor/workflow-next-completions";
import { validateNextWorkflowPhase, deriveWorkflowHandoffState } from "./workflow-monitor/workflow-next-state";
import { loadReference, REFERENCE_TOPICS } from "./workflow-monitor/reference-tool";
import { getUnresolvedPhases, getUnresolvedPhasesBefore } from "./workflow-monitor/skip-confirmation";
import type { VerificationViolation } from "./workflow-monitor/verification-monitor";
import {
  type DebugViolationType,
  getDebugViolationWarning,
  getTddViolationWarning,
  getVerificationViolationWarning,
} from "./workflow-monitor/warnings";
import { createWorkflowHandler, DEBUG_DEFAULTS, TDD_DEFAULTS, VERIFICATION_DEFAULTS, type Violation, type WorkflowHandler } from "./workflow-monitor/workflow-handler";
import {
  computeBoundaryToPrompt,
  type Phase,
  parseSkillName,
  resolveSkillPhase,
  type TransitionBoundary,
  WORKFLOW_PHASES,
  WORKFLOW_TRACKER_ENTRY_TYPE,
  type WorkflowTrackerState,
} from "./workflow-monitor/workflow-tracker";
import { getTransitionPrompt } from "./workflow-monitor/workflow-transitions";

type SelectOption<T extends string> = { label: string; value: T };

async function selectValue<T extends string>(
  ctx: ExtensionContext,
  title: string,
  options: SelectOption<T>[],
): Promise<T> {
  const labels = options.map((o) => o.label);
  const pickedLabel = await ctx.ui.select(title, labels);
  const picked = options.find((o) => o.label === pickedLabel);
  return (picked?.value ?? "cancel") as T;
}

const SUPERPOWERS_STATE_ENTRY_TYPE = "superpowers_state";

function getLegacyStateFilePath(): string {
  return path.join(process.cwd(), ".pi", "superpowers-state.json");
}

export function getStateFilePath(): string {
  return path.join(process.cwd(), ".pi", "workflow-kit-state.json");
}

export function reconstructState(ctx: ExtensionContext, handler: WorkflowHandler, stateFilePath?: string | false) {
  handler.resetState();

  // Read both file-based and session-based state, then pick the newer one.
  let fileData: (Record<string, unknown> & { savedAt?: number }) | null = null;
  let sessionData: (Record<string, unknown> & { savedAt?: number }) | null = null;

  if (stateFilePath !== false) {
    try {
      const newPath = stateFilePath ?? getStateFilePath();
      if (fs.existsSync(newPath)) {
        const raw = fs.readFileSync(newPath, "utf-8");
        fileData = JSON.parse(raw);
      } else if (stateFilePath === undefined) {
        // Legacy fallback: try the old filename only when no explicit path is given.
        const legacyPath = getLegacyStateFilePath();
        if (fs.existsSync(legacyPath)) {
          const raw = fs.readFileSync(legacyPath, "utf-8");
          fileData = JSON.parse(raw);
        }
      }
    } catch (err) {
      log.warn(
        `Failed to read state file, falling back to session entries: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  // Scan session branch for most recent superpowers state entry
  const entries = ctx.sessionManager.getBranch();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
    if (entry.type === "custom" && (entry as any).customType === SUPERPOWERS_STATE_ENTRY_TYPE) {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
      sessionData = (entry as any).data;
      break;
    }
    // Migration fallback: old-format workflow-only entries
    // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
    if (entry.type === "custom" && (entry as any).customType === WORKFLOW_TRACKER_ENTRY_TYPE) {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK session entry type
      sessionData = { workflow: (entry as any).data };
      break;
    }
  }

  // Pick the newer source when both are available; otherwise use whichever exists.
  if (fileData && sessionData) {
    const fileSavedAt = fileData.savedAt ?? 0;
    const sessionSavedAt = sessionData.savedAt ?? 0;
    const winner = fileSavedAt >= sessionSavedAt ? fileData : sessionData;
    handler.setFullState(winner);
  } else if (fileData) {
    handler.setFullState(fileData);
  } else if (sessionData) {
    handler.setFullState(sessionData);
  } else {
    // No entries found — reset to fresh defaults
    handler.setFullState({});
  }
}

export default function (pi: ExtensionAPI) {
  const handler = createWorkflowHandler();

  // Pending warnings are keyed by toolCallId to avoid cross-call leakage when
  // tool results are interleaved.
  const pendingViolations = new Map<string, Violation>();
  const pendingVerificationViolations = new Map<string, VerificationViolation>();
  const pendingBranchGates = new Map<string, string>();
  const pendingProcessWarnings = new Map<string, string>();

  type ViolationBucket = "process" | "practice";
  const strikes: Record<ViolationBucket, number> = { process: 0, practice: 0 };
  const sessionAllowed: Partial<Record<ViolationBucket, boolean>> = {};

  async function maybeEscalate(bucket: ViolationBucket, ctx: ExtensionContext): Promise<"allow" | "block"> {
    if (!ctx.hasUI) return "allow";
    if (sessionAllowed[bucket]) return "allow";

    strikes[bucket] += 1;
    if (strikes[bucket] < 2) return "allow";

    const choice = await ctx.ui.select(
      `The agent has repeatedly violated ${bucket} guardrails. Allow it to continue?`,
      ["Yes, continue", "Yes, allow all for this session", "No, stop"],
    );

    if (choice === "Yes, continue") {
      strikes[bucket] = 0;
      return "allow";
    }

    if (choice === "Yes, allow all for this session") {
      sessionAllowed[bucket] = true;
      return "allow";
    }

    return "block";
  }

  let branchNoticeShown = false;
  let branchConfirmed = false;

  const persistState = () => {
    const stateWithTimestamp = { ...handler.getFullState(), savedAt: Date.now() };
    pi.appendEntry(SUPERPOWERS_STATE_ENTRY_TYPE, stateWithTimestamp);
    // Also persist to file for cross-session survival
    try {
      const statePath = getStateFilePath();
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify(stateWithTimestamp, null, 2));
    } catch (err) {
      log.warn(`Failed to persist state file: ${err instanceof Error ? err.message : err}`);
    }
  };

  const phaseToSkill: Record<string, string> = {
    brainstorm: "brainstorming",
    plan: "writing-plans",
    execute: "executing-tasks",
    finalize: "executing-tasks",
  };

  function parseTargetPhase(text: string): Phase | null {
    const lines = text.split(/\r?\n/);
    let furthest: Phase | null = null;
    let furthestIdx = -1;
    const workflowState = handler.getWorkflowState();

    for (const line of lines) {
      const skill = parseSkillName(line);
      if (!skill) continue;
      const phase = resolveSkillPhase(skill, workflowState);
      if (!phase) continue;
      const idx = WORKFLOW_PHASES.indexOf(phase);
      if (idx > furthestIdx) {
        furthest = phase;
        furthestIdx = idx;
      }
    }

    return furthest;
  }

  const boundaryToPhase: Record<TransitionBoundary, keyof typeof phaseToSkill> = {
    design_committed: "brainstorm",
    plan_ready: "plan",
    execution_complete: "execute",
  };

  // --- State reconstruction on session events ---
  function resetSessionState(ctx: ExtensionContext) {
    reconstructState(ctx, handler);
    pendingViolations.clear();
    pendingVerificationViolations.clear();
    pendingBranchGates.clear();
    pendingProcessWarnings.clear();
    strikes.process = 0;
    strikes.practice = 0;
    delete sessionAllowed.process;
    delete sessionAllowed.practice;
    branchNoticeShown = false;
    branchConfirmed = false;
    updateWidget(ctx);
  }

  // session_start covers startup, reload, new, resume, fork (pi v0.65.0+)
  pi.on("session_start", async (_event, ctx) => {
    resetSessionState(ctx);
  });
  // session_tree for /tree navigation where a different session branch is loaded
  pi.on("session_tree", async (_event, ctx) => {
    resetSessionState(ctx);
  });

  // --- Input observation (skill detection + skip-confirmation gate) ---
  pi.on("input", async (event, ctx) => {
    if (event.source === "extension") return;
    const text = (event.text as string | undefined) ?? (event.input as string | undefined) ?? "";

    const targetPhase = parseTargetPhase(text);

    // If no UI or no target phase, just track and proceed
    if (!ctx.hasUI || !targetPhase) {
      if (handler.handleInputText(text)) {
        persistState();
        updateWidget(ctx);
      }
      return;
    }

    const currentState = handler.getWorkflowState();
    if (!currentState) {
      if (handler.handleInputText(text)) {
        persistState();
        updateWidget(ctx);
      }
      return;
    }

    const unresolved = getUnresolvedPhasesBefore(targetPhase, currentState);

    if (unresolved.length === 0) {
      if (handler.handleInputText(text)) {
        persistState();
        updateWidget(ctx);
      }
      return;
    }

    // --- Single unresolved phase ---
    if (unresolved.length === 1) {
      const missing = unresolved[0];
      const missingSkill = phaseToSkill[missing] ?? missing;
      const options = [
        { label: `Do ${missing} now`, value: "do_now" as const },
        { label: `Skip ${missing}`, value: "skip" as const },
        { label: "Cancel", value: "cancel" as const },
      ];
      const choice = await selectValue(ctx, `Phase "${missing}" is unresolved. What would you like to do?`, options);

      if (choice === "skip") {
        handler.skipWorkflowPhases([missing]);
        handler.handleInputText(text);
        persistState();
        updateWidget(ctx);
        return;
      } else if (choice === "do_now") {
        ctx.ui.setEditorText(`/skill:${missingSkill}`);
        return { blocked: true };
      } else {
        // cancel
        return { blocked: true };
      }
    }

    // --- Multiple unresolved phases ---
    const summaryOptions = [
      { label: "Review one-by-one", value: "review_individually" as const },
      { label: "Skip all and continue", value: "skip_all" as const },
      { label: "Cancel", value: "cancel" as const },
    ];
    const summaryChoice = await selectValue(
      ctx,
      `${unresolved.length} phases are unresolved: ${unresolved.join(", ")}. What would you like to do?`,
      summaryOptions,
    );

    if (summaryChoice === "skip_all") {
      handler.skipWorkflowPhases(unresolved);
      handler.handleInputText(text);
      persistState();
      updateWidget(ctx);
      return;
    } else if (summaryChoice === "cancel") {
      return { blocked: true };
    }

    // review_individually: prompt for each
    for (const phase of unresolved) {
      const skill = phaseToSkill[phase] ?? phase;
      const options = [
        { label: `Do ${phase} now`, value: "do_now" as const },
        { label: `Skip ${phase}`, value: "skip" as const },
        { label: "Cancel", value: "cancel" as const },
      ];
      const choice = await selectValue(ctx, `Phase "${phase}" is unresolved. What would you like to do?`, options);

      if (choice === "skip") {
        handler.skipWorkflowPhases([phase]);
        persistState();
        updateWidget(ctx);
      } else if (choice === "do_now") {
        ctx.ui.setEditorText(`/skill:${skill}`);
        return { blocked: true };
      } else {
        // cancel
        return { blocked: true };
      }
    }

    // All individually reviewed (all skipped) - allow transition
    handler.handleInputText(text);
    persistState();
    updateWidget(ctx);
  });

  // --- Completion action gate prompt ---
  // biome-ignore lint/suspicious/noExplicitAny: pi SDK context type
  async function promptCompletionGate(unresolved: Phase[], ctx: any): Promise<"allowed" | "blocked"> {
    if (unresolved.length === 1) {
      const missing = unresolved[0];
      const missingSkill = phaseToSkill[missing] ?? missing;
      const options = [
        { label: `Do ${missing} now`, value: "do_now" as const },
        { label: `Skip ${missing}`, value: "skip" as const },
        { label: "Cancel", value: "cancel" as const },
      ];
      const choice = await selectValue(ctx, `Phase "${missing}" is unresolved. What would you like to do?`, options);

      if (choice === "skip") {
        handler.skipWorkflowPhases([missing]);
        persistState();
        updateWidget(ctx);
        return "allowed";
      } else if (choice === "do_now") {
        ctx.ui.setEditorText(`/skill:${missingSkill}`);
        return "blocked";
      } else {
        return "blocked";
      }
    }

    // Multiple unresolved
    const summaryOptions = [
      { label: "Review one-by-one", value: "review_individually" as const },
      { label: "Skip all and continue", value: "skip_all" as const },
      { label: "Cancel", value: "cancel" as const },
    ];
    const summaryChoice = await selectValue(
      ctx,
      `${unresolved.length} phases are unresolved: ${unresolved.join(", ")}. What would you like to do?`,
      summaryOptions,
    );

    if (summaryChoice === "skip_all") {
      handler.skipWorkflowPhases(unresolved);
      persistState();
      updateWidget(ctx);
      return "allowed";
    } else if (summaryChoice === "cancel") {
      return "blocked";
    }

    // review_individually
    for (const phase of unresolved) {
      const skill = phaseToSkill[phase] ?? phase;
      const options = [
        { label: `Do ${phase} now`, value: "do_now" as const },
        { label: `Skip ${phase}`, value: "skip" as const },
        { label: "Cancel", value: "cancel" as const },
      ];
      const choice = await selectValue(ctx, `Phase "${phase}" is unresolved. What would you like to do?`, options);

      if (choice === "skip") {
        handler.skipWorkflowPhases([phase]);
        persistState();
        updateWidget(ctx);
      } else if (choice === "do_now") {
        ctx.ui.setEditorText(`/skill:${skill}`);
        return "blocked";
      } else {
        return "blocked";
      }
    }

    return "allowed";
  }

  // --- Completion action detection helpers ---
  const COMMIT_RE = /\bgit\s+commit\b/;
  const PUSH_RE = /\bgit\s+push\b/;
  const PR_RE = /\bgh\s+pr\s+create\b/;

  function getCompletionActionTarget(command: string): Phase | null {
    if (COMMIT_RE.test(command)) return "finalize";
    if (PUSH_RE.test(command)) return "finalize";
    if (PR_RE.test(command)) return "finalize";
    return null;
  }

  function getUnresolvedPhasesForAction(_target: Phase, state: WorkflowTrackerState): Phase[] {
    // For all completion actions, check that finalize is complete
    return getUnresolvedPhases(["finalize"], state);
  }

  // --- Tool call observation (detect file writes + verification gate) ---
  pi.on("tool_call", async (event, ctx) => {
    const toolCallId = event.toolCallId;

    if (event.toolName === "bash") {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK event input type
      const command = ((event.input as Record<string, any>).command as string | undefined) ?? "";

      const state = handler.getWorkflowState();
      const phaseIdx = state?.currentPhase ? WORKFLOW_PHASES.indexOf(state.currentPhase) : -1;
      const finalizeIdx = WORKFLOW_PHASES.indexOf("finalize");

      // Completion action gating (interactive only, finalize phase)
      // Suppress during active plan execution — prompts only fire after execution completes
      const isExecuting = state?.currentPhase === "execute" && state.phases.execute === "active";
      if (ctx.hasUI && state && phaseIdx >= finalizeIdx && !isExecuting) {
        const actionTarget = getCompletionActionTarget(command);
        if (actionTarget) {
          const unresolved = getUnresolvedPhasesForAction(actionTarget, state);
          if (unresolved.length > 0) {
            const gateResult = await promptCompletionGate(unresolved, ctx);
            if (gateResult === "blocked") {
              return { blocked: true };
            }
            if (unresolved.length > 0) {
              handler.recordVerificationWaiver();
              persistState();
            }
          }
        }
      }

      const executeIdx = WORKFLOW_PHASES.indexOf("execute");
      if (phaseIdx >= executeIdx) {
        const verificationViolation = handler.checkCommitGate(command);
        if (verificationViolation) {
          pendingVerificationViolations.set(toolCallId, verificationViolation);
        }
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: pi SDK event input type
    const input = event.input as Record<string, any>;
    const result = handler.handleToolCall(event.toolName, input);
    if (result.violation) {
      pendingViolations.set(toolCallId, result.violation);
      persistState();
    }

    let changed = false;

    if (event.toolName === "write" || event.toolName === "edit") {
      const filePath = input.path as string | undefined;
      if (filePath) {
        const state = handler.getWorkflowState();
        const phase = state?.currentPhase;
        const isThinkingPhase = phase === "brainstorm" || phase === "plan";
        let normalizedForCheck = filePath;
        if (normalizedForCheck.startsWith("./")) normalizedForCheck = normalizedForCheck.slice(2);
        const resolved = path.resolve(process.cwd(), normalizedForCheck);
        const plansRoot = path.join(process.cwd(), "docs", "plans") + path.sep;
        const isPlansWrite = resolved.startsWith(plansRoot);

        if (isThinkingPhase && !isPlansWrite) {
          const escalation = await maybeEscalate("process", ctx);
          if (escalation === "block") {
            return { blocked: true };
          }

          pendingProcessWarnings.set(
            toolCallId,
            `⚠️ PROCESS VIOLATION: Wrote ${filePath} during ${phase} phase.\n` +
              "During brainstorming/planning you may only write to docs/plans/. Stop and return to docs/plans/ or advance workflow phases intentionally.",
          );
        }

        changed = handler.handleFileWritten(filePath) || changed;
      }

      if (!branchConfirmed) {
        const ref = getCurrentGitRef();
        branchConfirmed = true;

        if (ref) {
          pendingBranchGates.set(
            toolCallId,
            `⚠️ First write of this session. You're on branch \`${ref}\`.\n` +
              "Confirm with the user this is the correct branch before continuing, or create a new branch/worktree.",
          );
        } else {
          // Not a git repo: disable branch messages silently.
          branchNoticeShown = true;
        }
      }
    }

    // plan-tracker init advances workflow phase to execute — intentional integration contract
    if (event.toolName === PLAN_TRACKER_TOOL_NAME) {
      changed = handler.handlePlanTrackerToolCall(input) || changed;
    }

    if (changed) {
      persistState();
      updateWidget(ctx);
    }
  });

  // --- Tool result modification (inject warnings + track investigation) ---
  pi.on("tool_result", async (event, ctx) => {
    const toolCallId = event.toolCallId;

    if (event.toolName === "read") {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK event input type
      const path = ((event.input as Record<string, any>).path as string) ?? "";
      if (handler.handleSkillFileRead(path)) {
        persistState();
      }
      handler.handleReadOrInvestigation("read", path);
    }

    if (
      event.toolName === PLAN_TRACKER_TOOL_NAME &&
      handler.handlePlanTrackerToolResult(event.details as PlanTrackerDetails | undefined)
    ) {
      persistState();
      updateWidget(ctx);
    }

    const injected: string[] = [];

    // Layer 1: announce current branch on first tool result in session.
    if (!branchNoticeShown) {
      const ref = getCurrentGitRef();
      if (ref) {
        injected.push(`📌 Current branch: \`${ref}\``);
      } else {
        branchConfirmed = true;
      }
      branchNoticeShown = true;
    }

    // Inject violation warning on write/edit for the matching tool call.
    if (event.toolName === "write" || event.toolName === "edit") {
      const violation = pendingViolations.get(toolCallId);
      if (violation) {
        const warningText = formatViolationWarning(violation);
        injected.push(warningText);

        // Wire practice escalation for TDD violations (post-write, warns but never blocks current call)
        const isTddViolation =
          violation.type === "source-before-test" ||
          violation.type === "source-during-red" ||
          violation.type === "existing-tests-not-run-before-change";
        if (isTddViolation) {
          const escalation = await maybeEscalate("practice", ctx);
          if (escalation === "block") {
            injected.push(
              "🛑 STOP: The agent has repeatedly violated TDD practice guardrails. " +
                "Do not write any more source code until you have addressed the TDD violations above. " +
                "Review the test-driven-development skill before proceeding.",
            );
          }
        }
      }
      pendingViolations.delete(toolCallId);

      const processWarning = pendingProcessWarnings.get(toolCallId);
      if (processWarning) {
        injected.push(processWarning);
      }
      pendingProcessWarnings.delete(toolCallId);
    }

    // Handle bash results (test runs, commits, investigation)
    if (event.toolName === "bash") {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK event input type
      const command = ((event.input as Record<string, any>).command as string) ?? "";
      const output = event.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK event details type
      const exitCode = (event.details as any)?.exitCode as number | undefined;
      handler.handleBashResult(command, output, exitCode);
      persistState();

      const verificationViolation = pendingVerificationViolations.get(toolCallId);
      if (verificationViolation) {
        injected.push(getVerificationViolationWarning(verificationViolation.type, verificationViolation.command));
      }
      pendingVerificationViolations.delete(toolCallId);
    }

    if (event.toolName === "write" || event.toolName === "edit") {
      const branchGate = pendingBranchGates.get(toolCallId);
      if (branchGate) {
        injected.push(branchGate);
      }
      pendingBranchGates.delete(toolCallId);
    }

    if (injected.length > 0) {
      updateWidget(ctx);
      return {
        content: [{ type: "text", text: injected.join("\n\n") }, ...event.content],
      };
    }

    updateWidget(ctx);
    return undefined;
  });

  // --- Boundary prompting at natural handoff points ---
  pi.on("agent_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    const latestState = handler.getWorkflowState();
    if (!latestState) return;

    const boundary = computeBoundaryToPrompt(latestState);
    if (!boundary) return;

    const boundaryPhase = boundaryToPhase[boundary];
    const prompt = getTransitionPrompt(boundary, latestState.artifacts[boundaryPhase]);

    const options = prompt.options.map((o) => o.label);
    const pickedLabel = await ctx.ui.select(prompt.title, options);

    const selected = prompt.options.find((o) => o.label === pickedLabel)?.choice ?? null;

    const marked = handler.markWorkflowPrompted(boundaryPhase);
    if (marked) {
      persistState();
      updateWidget(ctx);
    }

    const nextSkill = phaseToSkill[prompt.nextPhase] ?? "writing-plans";
    const nextInSession = `/skill:${nextSkill}`;
    const fresh = `/workflow-next ${prompt.nextPhase}${prompt.artifactPath ? ` ${prompt.artifactPath}` : ""}`;
    const finishReminder =
      "Before finishing:\n" +
      "- Does this work require documentation updates? (README, CHANGELOG, API docs, inline docs)\n" +
      "- What was learned during this implementation? (surprises, codebase knowledge, things to do differently)\n\n";

    if (selected === "next") {
      const advanced = prompt.nextPhase === "finalize" ? handler.advanceWorkflowTo("finalize") : false;
      if (advanced) {
        persistState();
        updateWidget(ctx);
      }
      ctx.ui.setEditorText(prompt.nextPhase === "finalize" ? finishReminder + nextInSession : nextInSession);
    } else if (selected === "fresh") {
      const advanced = prompt.nextPhase === "finalize" ? handler.advanceWorkflowTo("finalize") : false;
      if (advanced) {
        persistState();
        updateWidget(ctx);
      }
      ctx.ui.setEditorText(prompt.nextPhase === "finalize" ? finishReminder + fresh : fresh);
    } else if (selected === "skip") {
      // Explicit user-confirmed skip: mark the next phase as skipped, then move on.
      handler.skipWorkflowPhases([prompt.nextPhase]);

      const nextIdx = WORKFLOW_PHASES.indexOf(prompt.nextPhase);
      const phaseAfterSkip = WORKFLOW_PHASES[nextIdx + 1] ?? null;

      if (phaseAfterSkip) {
        const currentState = handler.getWorkflowState();
        const currentIdx = currentState?.currentPhase ? WORKFLOW_PHASES.indexOf(currentState.currentPhase) : -1;
        const afterSkipIdx = WORKFLOW_PHASES.indexOf(phaseAfterSkip);
        if (afterSkipIdx > currentIdx) {
          handler.advanceWorkflowTo(phaseAfterSkip);
          const skipSkill = phaseToSkill[phaseAfterSkip] ?? "writing-plans";
          ctx.ui.setEditorText(`/skill:${skipSkill}`);
        }
      }

      persistState();
      updateWidget(ctx);
    } else if (selected === "discuss") {
      // Don't advance phase. Set editor text to prompt discussion.
      ctx.ui.setEditorText(
        `Let's discuss before moving to the next step.\n` +
          `We're at: ${prompt.title}\n` +
          `What questions or concerns do you want to work through?`,
      );
    }
  });

  // --- Format violation warning based on type ---
  function formatViolationWarning(violation: Violation): string {
    if (
      violation.type === "source-before-test" ||
      violation.type === "source-during-red" ||
      violation.type === "existing-tests-not-run-before-change"
    ) {
      const phase = handler.getWorkflowState()?.currentPhase;
      return getTddViolationWarning(violation.type, violation.file, phase ?? undefined);
    }
    return getDebugViolationWarning(
      violation.type as DebugViolationType,
      violation.file,
      "fixAttempts" in violation ? violation.fixAttempts : 0,
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: pi SDK theme type
  function formatPhaseStrip(state: WorkflowTrackerState | null, theme: any): string {
    if (!state?.currentPhase) return "";

    const arrow = theme.fg("dim", " → ");
    return WORKFLOW_PHASES.map((phase) => {
      const status = state.phases[phase];
      if (state.currentPhase === phase) return theme.fg("accent", `[${phase}]`);
      if (status === "complete") return theme.fg("success", `✓${phase}`);
      if (status === "skipped") return theme.fg("dim", `–${phase}`);
      return theme.fg("dim", phase);
    }).join(arrow);
  }

  // --- TUI Widget ---
  function updateWidget(ctx: ExtensionContext) {
    if (!ctx.hasUI) return;

    const tddPhase = handler.getTddPhase().toUpperCase();
    const hasDebug = handler.isDebugActive();
    const workflow = handler.getWorkflowState();
    const hasWorkflow = !!workflow?.currentPhase;

    if (!hasWorkflow && tddPhase === "IDLE" && !hasDebug) {
      ctx.ui.setWidget("workflow_monitor", undefined);
      return;
    }

    ctx.ui.setWidget("workflow_monitor", (_tui, theme) => {
      const parts: string[] = [];

      const phaseStrip = formatPhaseStrip(workflow, theme);
      if (phaseStrip) {
        parts.push(phaseStrip);
      }

      // TDD phase
      if (tddPhase !== "IDLE") {
        const colorMap: Record<string, string> = {
          "RED-PENDING": "error",
          RED: "error",
          GREEN: "success",
          REFACTOR: "accent",
        };
        parts.push(theme.fg(colorMap[tddPhase] ?? "muted", `TDD: ${tddPhase}`));
      }

      // Debug state
      if (hasDebug) {
        const attempts = handler.getDebugFixAttempts();
        if (attempts >= 3) {
          parts.push(theme.fg("error", `Debug: ${attempts} fix attempts ⚠️`));
        } else if (attempts > 0) {
          parts.push(theme.fg("warning", `Debug: ${attempts} fix attempt${attempts !== 1 ? "s" : ""}`));
        } else {
          parts.push(theme.fg("accent", "Debug: investigating"));
        }
      }

      return parts.length > 0 ? new Text(parts.join(theme.fg("dim", "  |  ")), 0, 0) : undefined;
    });
  }

  pi.registerCommand("workflow-reset", {
    description: "Reset workflow tracker to fresh state for a new task",
    async handler(_args, ctx) {
      handler.resetState();
      persistState();
      updateWidget(ctx);
      if (ctx.hasUI) {
        ctx.ui.notify("Workflow reset. Ready for a new task.", "info");
      }
    },
  });

  pi.registerCommand("workflow-next", {
    description: "Start a fresh session for the next workflow phase (optionally referencing an artifact path)",
    getArgumentCompletions: getWorkflowNextCompletions,
    async handler(args, ctx) {
      if (!ctx.hasUI) {
        ctx.ui.notify("workflow-next requires interactive mode", "error");
        return;
      }

      const [phase, artifact] = args.trim().split(/\s+/, 2);
      const validPhases = new Set(["brainstorm", "plan", "execute", "finalize"]);
      if (!phase || !validPhases.has(phase)) {
        ctx.ui.notify(
          "Usage: /workflow-next <phase> [artifact-path]  (phase: brainstorm|plan|execute|finalize)",
          "error",
        );
        return;
      }

      // Validate handoff against current workflow state
      const currentWorkflowState = handler.getWorkflowState();
      if (currentWorkflowState && currentWorkflowState.currentPhase) {
        const validationError = validateNextWorkflowPhase(currentWorkflowState, phase as Phase);
        if (validationError) {
          ctx.ui.notify(validationError, "error");
          return;
        }
      }

      // Derive handoff state for session seeding
      const derivedWorkflow = currentWorkflowState
        ? deriveWorkflowHandoffState(currentWorkflowState, phase as Phase)
        : undefined;

      const parentSession = ctx.sessionManager.getSessionFile();
      const res = await ctx.newSession({
        parentSession,
        setup: derivedWorkflow
          ? async (sm) => {
              const fullState = handler.getFullState();
              sm.appendCustomEntry(SUPERPOWERS_STATE_ENTRY_TYPE, {
                ...fullState,
                workflow: derivedWorkflow,
                tdd: { ...TDD_DEFAULTS, testFiles: [], sourceFiles: [] },
                debug: { ...DEBUG_DEFAULTS },
                verification: { ...VERIFICATION_DEFAULTS },
                savedAt: Date.now(),
              });
            }
          : undefined,
      });
      if (res.cancelled) return;

      const lines: string[] = [];
      if (artifact) lines.push(`Continue from artifact: ${artifact}`);

      if (phase === "brainstorm") {
        lines.push("/skill:brainstorming");
      } else if (phase === "plan") {
        lines.push("/skill:writing-plans");
      } else if (phase === "execute") {
        lines.push("/skill:executing-tasks");
        lines.push("Execute the approved plan task-by-task.");
      } else if (phase === "finalize") {
        lines.push("/skill:executing-tasks");
        lines.push("Finalize the completed work (review, PR, docs, archive, cleanup).");
      }

      ctx.ui.setEditorText(lines.join("\n"));
      ctx.ui.notify("New session ready. Submit when ready.", "info");
    },
  });

  // --- Reference Tool ---
  pi.registerTool({
    name: "workflow_reference",
    label: "Workflow Guide",
    description: `Detailed guidance for workflow skills. Topics: ${REFERENCE_TOPICS.join(", ")}`,
    parameters: Type.Object({
      topic: StringEnum(REFERENCE_TOPICS as unknown as readonly [string, ...string[]], {
        description: "Reference topic to load",
      }),
    }),
    async execute(_toolCallId, params) {
      const content = await loadReference(params.topic);
      return {
        content: [{ type: "text", text: content }],
        details: { topic: params.topic },
      };
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("workflow_reference "));
      text += theme.fg("accent", args.topic);
      return new Text(text, 0, 0);
    },
    renderResult(result, _options, theme) {
      // biome-ignore lint/suspicious/noExplicitAny: pi SDK event details type
      const topic = (result.details as any)?.topic ?? "unknown";
      const content = result.content[0];
      const len = content?.type === "text" ? content.text.length : 0;
      return new Text(theme.fg("success", "✓ ") + theme.fg("muted", `${topic} (${len} chars)`), 0, 0);
    },
  });
}
