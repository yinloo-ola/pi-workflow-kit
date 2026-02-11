import { describe, test, expect } from "vitest";
import { getTransitionPrompt } from "../../../extensions/workflow-monitor/workflow-transitions";

describe("workflow transitions", () => {
  test("design-committed prompt targets plan", () => {
    const p = getTransitionPrompt("design_committed", "docs/plans/x-design.md");
    expect(p.title).toMatch(/Design committed/i);
    expect(p.nextPhase).toBe("plan");
    expect(p.options).toHaveLength(4);
  });
});
