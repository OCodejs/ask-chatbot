import { bus } from "../events/bus.js";
import models from "../config/models.js";

import { runAll, runConductor } from "../orchestrator/index.js";

import { openaiProvider } from "../providers/openai.js";
import { claudeProvider } from "../providers/claude.js";
import { geminiProvider } from "../providers/gemini.js";
import { qwenProvider } from "../providers/qwen.js";
import { ohmabaProvider } from "../providers/ohmaba.js";
import { hunyuanProvider } from "../providers/hunyuan.js";
import { zskProvider } from "../providers/zsk.js";

const providers = {
  openai: openaiProvider,
  claude: claudeProvider,
  gemini: geminiProvider,
  qwen: qwenProvider,
  ohmaba: ohmabaProvider,
  hunyuan: hunyuanProvider,
  zsk: zskProvider
};

export async function router(prompt, provider) {
  const targetProvider = provider || models.default;

  if (targetProvider === "all") {
    return await runAll(prompt);
  }

  if (targetProvider === "conductor") {
    try {
      const configuredProviders = Object.fromEntries(
        Object.entries(providers).filter(([name]) => name !== "zsk" && models.providers[name])
      );
      if (!Object.keys(configuredProviders).length) {
        return "Conductor is not configured yet. Add a server-side provider API key in Vercel Environment Variables; for Hy4, also set HUNYUAN_ENABLE_PUBLIC_API=true after reviewing access and usage limits.";
      }
      const configuredLimit = Number.parseInt(process.env.AGENT_MAX_CONCURRENCY || "4", 10);
      const response = await runConductor(prompt, {
        providers: configuredProviders,
        maxConcurrency: Number.isFinite(configuredLimit) ? configuredLimit : 4
      });

      bus.emit("ai", {
        model: targetProvider,
        response
      });
      return response;
    } catch (error) {
      console.error("Conductor orchestration failed:", error);
      return "Conductor orchestration is currently unavailable. Check the configured AI providers and try again.";
    }
  }

  if (targetProvider === "hunyuan" && !models.providers.hunyuan) {
    return "Hunyuan is disabled. Configure HUNYUAN_API_KEY and explicitly set HUNYUAN_ENABLE_PUBLIC_API=true after reviewing API access and usage limits.";
  }

  const providerFn = providers[targetProvider];
  if (!providerFn) {
    throw new Error(`Unknown provider: ${targetProvider}`);
  }

  try {
    const result = await providerFn(prompt);

    bus.emit("ai", {
      model: targetProvider,
      response: result
    });

    return result;
  } catch (error) {
    console.error(`Provider ${targetProvider} failed:`, error);
    return `Provider ${targetProvider} is currently unavailable. Please try another provider or configure its server-side credentials.`;
  }
}
