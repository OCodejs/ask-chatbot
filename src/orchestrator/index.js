import { workflow } from "../workflow/index.js";

export { runConductor } from "./conductor.js";

export async function runAll(prompt) {
  return await workflow(prompt);
}
