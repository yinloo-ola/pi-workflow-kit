import { describe, expect, test } from "vitest";
import { getTransitionPrompt } from "../../../extensions/workflow-monitor/workflow-transitions";

describe("workflow transitions", () => {
  test("design-committed prompt targets plan", () => {
    const p = getTransitionPrompt("design_committed", "docs/plans/x-design.md");
    expect(p.title).toMatch(/Design committed/i);
    expect(p.nextPhase).toBe("plan");
    expect(p.options).toHaveLength(4);
  });

  test("execution-complete prompt targets finalize", () => {
    const p = getTransitionPrompt("execution_complete", "docs/plans/x-implementation.md");
    expect(p.title).toMatch(/All tasks complete/i);
    expect(p.nextPhase).toBe("finalize");
    expect(p.options).toHaveLength(4);
  });
});
