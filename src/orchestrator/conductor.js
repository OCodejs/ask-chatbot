import { createPlan } from "../planner/index.js";
import { execute } from "../executor/index.js";

const ROLE_GUIDANCE = {
  review: "Review the request and identify correctness risks, missing requirements, and acceptance criteria.",
  security: "Perform a security-focused analysis. Identify trust boundaries, secrets, authorization, injection, and data exposure risks.",
  performance: "Analyze performance, scalability, latency, cost, and resource usage. Recommend measurable improvements.",
  architecture: "Analyze system boundaries, interfaces, failure modes, and maintainability. Recommend a coherent implementation approach."
};

function asText(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Run the existing specialist task plan concurrently.
 * Providers are assigned round-robin so configured backends can participate
 * without making any one provider mandatory.
 */
export async function runConductor(prompt, {
  providers = {},
  maxConcurrency = 4,
  signal
} = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("Conductor prompt must be a non-empty string");
  }

  const available = Object.entries(providers).filter(([, runner]) => typeof runner === "function");
  if (!available.length) {
    throw new Error("Conductor requires at least one configured AI provider");
  }

  const plan = createPlan(prompt);
  const assignments = {};
  const workers = {};

  plan.forEach((task, index) => {
    const [providerName, runner] = available[index % available.length];
    assignments[task.agent] = providerName;
    workers[task.agent] = (input) => runner([
      `You are the ${task.agent} specialist in a coordinated software engineering review.`,
      ROLE_GUIDANCE[task.agent] || task.task,
      "Return concise findings, evidence, risks, and actionable recommendations. Do not claim to have edited files, run commands, or deployed anything.",
      "User request:",
      input
    ].join("\n\n"));
  });

  const results = await execute(plan, workers, prompt, {
    maxConcurrency,
    signal
  });

  return [
    "# Conductor — parallel agent report",
    `Completed ${plan.length} specialist tasks with a concurrency limit of ${Math.max(1, Math.min(8, Number(maxConcurrency) || 4))}.`,
    ...plan.map((task) => [
      `## ${task.agent} agent · ${assignments[task.agent]}`,
      asText(results[task.agent] ?? "No result returned.")
    ].join("\n\n"))
  ].join("\n\n");
}
