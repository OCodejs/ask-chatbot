export async function execute(plan, workers, prompt, options = {}) {
  if (!Array.isArray(plan)) {
    throw new TypeError("Execution plan must be an array");
  }

  const requestedLimit = Number(options.maxConcurrency ?? 4);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(8, Math.floor(requestedLimit)))
    : 4;
  const result = {};
  let cursor = 0;

  async function drainQueue() {
    while (cursor < plan.length) {
      const task = plan[cursor++];
      if (!task || typeof task.agent !== "string") continue;

      if (options.signal?.aborted) {
        result[task.agent] = "Agent cancelled before execution.";
        continue;
      }

      const worker = workers?.[task.agent];
      if (typeof worker !== "function") {
        result[task.agent] = `Agent unavailable: ${task.agent}`;
        continue;
      }

      try {
        result[task.agent] = await worker(prompt, {
          task,
          signal: options.signal
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result[task.agent] = `Agent failed: ${message}`;
      }
    }
  }

  const workerCount = Math.min(limit, plan.length);
  await Promise.all(Array.from({ length: workerCount }, () => drainQueue()));
  return result;
}
