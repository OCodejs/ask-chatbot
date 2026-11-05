import { describe, expect, it, vi } from "vitest";
import { runConductor } from "../src/orchestrator/conductor.js";

describe("Conductor orchestration", () => {
  it("dispatches specialist tasks across configured providers and returns a report", async () => {
    const alpha = vi.fn(async (prompt) => `alpha handled ${prompt.split("\n")[0]}`);
    const beta = vi.fn(async (prompt) => `beta handled ${prompt.split("\n")[0]}`);

    const report = await runConductor("Build a secure API", {
      providers: { alpha, beta },
      maxConcurrency: 2
    });

    expect(report).toContain("# Conductor — parallel agent report");
    expect(report).toContain("## review agent · alpha");
    expect(report).toContain("## security agent · beta");
    expect(alpha).toHaveBeenCalled();
    expect(beta).toHaveBeenCalled();
  });

  it("rejects a request when no provider is configured", async () => {
    await expect(runConductor("inspect", { providers: {} }))
      .rejects.toThrow("at least one configured AI provider");
  });
});
