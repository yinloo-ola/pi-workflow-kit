import { describe, expect, test } from "vitest";
import { __internal } from "../../../extensions/subagent/index";

describe("subagent model resolution", () => {
  test("prefers the agent's pinned model over the parent session model", () => {
    const selection = __internal.resolveModelSelection("claude-sonnet-4-5", {
      id: "gpt-5",
      provider: "openai",
    });

    expect(selection).toEqual({
      model: "claude-sonnet-4-5",
      provider: undefined,
      source: "agent",
    });
  });

  test("uses the parent session provider and model when the agent is not pinned", () => {
    const selection = __internal.resolveModelSelection(undefined, {
      id: "gpt-5",
      provider: "openai",
    });

    expect(selection).toEqual({
      model: "gpt-5",
      provider: "openai",
      source: "parent",
    });
  });

  test("falls back to the bundled default model when no parent session model exists", () => {
    const selection = __internal.resolveModelSelection(undefined, undefined);

    expect(selection).toEqual({
      model: "claude-sonnet-4-5",
      provider: undefined,
      source: "default",
    });
  });
});
