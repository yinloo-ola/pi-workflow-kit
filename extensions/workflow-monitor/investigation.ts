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
