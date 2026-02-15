const INVESTIGATION_PATTERNS = [
  /\bgrep\b/,
  /\brg\b/,
  /\bag\b/,
  /\bgit\s+(log|diff|show|blame)\b/,
  /\bfind\b/,
  /\bls\b/,
  /\bcat\b/,
  /\bhead\b/,
  /\btail\b/,
  /\bless\b/,
  /\bwc\b/,
  /\becho\b/,
  /\bprintf\b/,
  /\benv\b/,
  /\bprintenv\b/,
];

export function isInvestigationCommand(command: string): boolean {
  return INVESTIGATION_PATTERNS.some((p) => p.test(command));
}

const INVESTIGATION_TOOL_NAMES = new Set([
  "kota_search",
  "kota_deps",
  "kota_usages",
  "kota_impact",
  "kota_task_context",
  "web_search",
  "fetch_content",
]);

const INVESTIGATION_LSP_ACTIONS = new Set([
  "definition",
  "references",
  "hover",
  "symbols",
  "diagnostics",
  "workspace-diagnostics",
]);

export function isInvestigationToolCall(toolName: string, params?: Record<string, unknown>): boolean {
  if (INVESTIGATION_TOOL_NAMES.has(toolName)) {
    return true;
  }

  if (toolName === "lsp" && params?.action && INVESTIGATION_LSP_ACTIONS.has(params.action as string)) {
    return true;
  }

  return false;
}
