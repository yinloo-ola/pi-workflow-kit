import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = readFileSync("docs/provider-delegation-contract.md", "utf8");

describe("provider delegation contract", () => {
  it("documents advisory role resource hints with silent fallback", () => {
    expect(contract).toContain("## Role resource hints");
    expect(contract).toMatch(/Hints are advisory/i);
    expect(contract).toMatch(/MUST NOT fail the review/i);
    expect(contract).toContain("max_turns");
    expect(contract).toMatch(/per-role instance of `bounded-execution`/);
  });

  it("documents independent logical operations and required capabilities", () => {
    expect(contract).toContain("codebase-recon");
    expect(contract).toContain("feature-review");
    expect(contract).toContain("named-role-dispatch");
    expect(contract).toContain("parallel-review");
    expect(contract).toContain("result-collection");
    expect(contract).toContain("read-only-enforcement");
    expect(contract).toContain("fresh-context");
    expect(contract).toContain("bounded-execution");
  });

  it("documents the normalized outcome statuses and required semantics", () => {
    for (const status of ["completed", "failed", "timed-out", "skipped"]) {
      expect(contract).toContain(`'${status}'`);
    }
    expect(contract).toMatch(/`completed` requires.*non-empty `report`/i);
    expect(contract).toMatch(/empty report is not a successful result/i);
    expect(contract).toMatch(/missing role is not silently discarded/i);
    expect(contract).toContain("runId");
    expect(contract).toContain("provider");
  });

  it("documents capability failure, deterministic selection, and inline fallback", () => {
    expect(contract).toMatch(/cannot satisfy.*reject the delegated operation/i);
    expect(contract).toMatch(/selection must be deterministic/i);
    expect(contract).toContain("Scout: unavailable");
    expect(contract).toMatch(/failed or timed-out role is retried or performed inline/i);
    expect(contract).toMatch(/does not report a complete review while a required role/i);
  });

  it("keeps transport and provider names outside the core contract", () => {
    expect(contract).toMatch(/implementations may use Pi events, tool calls, CLI processes/i);
    expect(contract).toMatch(/does not assume that all Pi extensions are discoverable/i);
    expect(contract).toMatch(/including `@tintinweb\/pi-subagents`/i);
    expect(contract).toMatch(/does not install or configure a provider/i);
  });
});
