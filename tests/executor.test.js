import { describe, expect, it, vi } from "vitest";
import { execute } from "../src/executor/index.js";

describe("parallel executor", () => {
  it("runs planned workers concurrently without exceeding the limit", async () => {
    let active = 0;
    let peak = 0;
    const worker = vi.fn(async (_prompt, { task }) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 10));
      active -= 1;
      return `done:${task.agent}`;
    });

    const plan = ["review", "security", "performance", "architecture"]
      .map((agent, index) => ({ id: index + 1, agent }));
    const workers = Object.fromEntries(plan.map(({ agent }) => [agent, worker]));

    const result = await execute(plan, workers, "inspect", { maxConcurrency: 2 });

    expect(peak).toBe(2);
    expect(worker).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      review: "done:review",
      security: "done:security",
      performance: "done:performance",
      architecture: "done:architecture"
    });
  });

  it("records a failed worker and continues the remaining plan", async () => {
    const plan = [{ agent: "review" }, { agent: "security" }];
    const result = await execute(plan, {
      review: async () => { throw new Error("provider offline"); },
      security: async () => "security report"
    }, "inspect", { maxConcurrency: 2 });

    expect(result.review).toContain("Agent failed: provider offline");
    expect(result.security).toBe("security report");
  });
});
