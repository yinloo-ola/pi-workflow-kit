import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brainstorming = readFileSync("skills/pwk-brainstorming/SKILL.md", "utf8");
const executing = readFileSync("skills/pwk-executing-tasks/SKILL.md", "utf8");
const contract = readFileSync("docs/provider-delegation-contract.md", "utf8");

describe("delegation fallback behavior", () => {
  it("requires inline recon after unavailable, unsafe, failed, or timed-out delegation", () => {
    expect(brainstorming).toMatch(/Scout: unavailable/i);
    expect(brainstorming).toMatch(/inline/i);
    expect(brainstorming).toMatch(/unsafe|cannot enforce/i);
    expect(contract).toMatch(/failed or timed-out/i);
    expect(contract).toMatch(/same logical contract/i);
  });

  it("requires the recon fallback to preserve the five-section cited report", () => {
    expect(brainstorming).toMatch(/Relevant files.*Existing patterns.*Call sites.*Test layout.*Gotchas/s);
    expect(brainstorming).toMatch(/file:line/i);
    expect(contract).toMatch(/five-section observation map/i);
  });

  it("retains successful review reports and recovers missing roles", () => {
    expect(executing).toMatch(/retain successful delegated reports/i);
    expect(executing).toMatch(/missing review work inline/i);
    expect(executing).toMatch(/fully reviewed while a required role is missing/i);
    expect(contract).toMatch(/successful delegated reports remain usable/i);
    expect(contract).toMatch(/required role has neither a delegated result nor an inline result/i);
  });

  it("does not treat skipped or empty outcomes as completed coverage", () => {
    expect(contract).toMatch(/skipped.*not equivalent to completion/i);
    expect(contract).toMatch(/empty report is not a successful result/i);
    expect(contract).toMatch(/missing role is not silently discarded/i);
  });
});
