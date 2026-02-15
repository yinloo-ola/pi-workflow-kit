import { describe, expect, test } from "vitest";
import { isInvestigationCommand, isInvestigationToolCall } from "../../../extensions/workflow-monitor/investigation";

describe("isInvestigationCommand", () => {
  // grep variants
  test("matches grep", () => {
    expect(isInvestigationCommand("grep -rn 'error' src/")).toBe(true);
  });
  test("matches rg (ripgrep)", () => {
    expect(isInvestigationCommand("rg 'pattern' src/")).toBe(true);
  });
  test("matches ag (silver searcher)", () => {
    expect(isInvestigationCommand("ag 'pattern' src/")).toBe(true);
  });

  // git investigation
  test("matches git log", () => {
    expect(isInvestigationCommand("git log --oneline -10")).toBe(true);
  });
  test("matches git diff", () => {
    expect(isInvestigationCommand("git diff HEAD~1")).toBe(true);
  });
  test("matches git show", () => {
    expect(isInvestigationCommand("git show abc123")).toBe(true);
  });
  test("matches git blame", () => {
    expect(isInvestigationCommand("git blame src/foo.ts")).toBe(true);
  });

  // directory/file inspection
  test("matches find", () => {
    expect(isInvestigationCommand("find src -name '*.ts'")).toBe(true);
  });
  test("matches ls", () => {
    expect(isInvestigationCommand("ls -la src/")).toBe(true);
  });
  test("matches cat", () => {
    expect(isInvestigationCommand("cat src/foo.ts")).toBe(true);
  });
  test("matches head/tail", () => {
    expect(isInvestigationCommand("head -20 src/foo.ts")).toBe(true);
    expect(isInvestigationCommand("tail -50 src/foo.ts")).toBe(true);
  });

  // diagnostic instrumentation
  test("matches echo (diagnostic output)", () => {
    expect(isInvestigationCommand("echo $PATH")).toBe(true);
  });
  test("matches env/printenv", () => {
    expect(isInvestigationCommand("env | grep NODE")).toBe(true);
    expect(isInvestigationCommand("printenv NODE_ENV")).toBe(true);
  });

  // NOT investigation
  test("does not match test commands", () => {
    expect(isInvestigationCommand("npx vitest run")).toBe(false);
    expect(isInvestigationCommand("npm test")).toBe(false);
    expect(isInvestigationCommand("pytest")).toBe(false);
  });
  test("does not match build commands", () => {
    expect(isInvestigationCommand("npm run build")).toBe(false);
    expect(isInvestigationCommand("tsc")).toBe(false);
  });
  test("does not match git commit", () => {
    expect(isInvestigationCommand("git commit -m 'fix'")).toBe(false);
  });
  test("does not match git add", () => {
    expect(isInvestigationCommand("git add .")).toBe(false);
  });
});

describe("isInvestigationToolCall", () => {
  test("matches LSP definition action", () => {
    expect(isInvestigationToolCall("lsp", { action: "definition" })).toBe(true);
  });

  test("matches LSP references action", () => {
    expect(isInvestigationToolCall("lsp", { action: "references" })).toBe(true);
  });

  test("matches LSP hover action", () => {
    expect(isInvestigationToolCall("lsp", { action: "hover" })).toBe(true);
  });

  test("matches LSP symbols action", () => {
    expect(isInvestigationToolCall("lsp", { action: "symbols" })).toBe(true);
  });

  test("does not match LSP rename action", () => {
    expect(isInvestigationToolCall("lsp", { action: "rename" })).toBe(false);
  });

  test("matches kota_search", () => {
    expect(isInvestigationToolCall("kota_search", {})).toBe(true);
  });

  test("matches kota_deps", () => {
    expect(isInvestigationToolCall("kota_deps", {})).toBe(true);
  });

  test("matches kota_usages", () => {
    expect(isInvestigationToolCall("kota_usages", {})).toBe(true);
  });

  test("matches kota_impact", () => {
    expect(isInvestigationToolCall("kota_impact", {})).toBe(true);
  });

  test("matches web_search", () => {
    expect(isInvestigationToolCall("web_search", {})).toBe(true);
  });

  test("matches fetch_content", () => {
    expect(isInvestigationToolCall("fetch_content", {})).toBe(true);
  });

  test("does not match write tool", () => {
    expect(isInvestigationToolCall("write", {})).toBe(false);
  });

  test("does not match edit tool", () => {
    expect(isInvestigationToolCall("edit", {})).toBe(false);
  });
});
