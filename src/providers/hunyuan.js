import OpenAI from "openai";

const DEFAULT_BASE_URL = "https://tokenhub-intl.tencentcloudmaas.com/v1";

export function createHunyuanProvider({
  OpenAIClient = OpenAI,
  env = process.env
} = {}) {
  let client;

  function getClient() {
    if (client) return client;

    const apiKey = env.HUNYUAN_API_KEY;
    if (!apiKey) {
      throw new Error("HUNYUAN_API_KEY not configured");
    }

    const baseURL = env.HUNYUAN_BASE_URL || DEFAULT_BASE_URL;
    let parsed;
    try {
      parsed = new URL(baseURL);
    } catch {
      throw new Error("HUNYUAN_BASE_URL must be a valid HTTPS URL");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("HUNYUAN_BASE_URL must use HTTPS");
    }

    client = new OpenAIClient({
      apiKey,
      baseURL: parsed.toString().replace(/\/$/, ""),
      timeout: 60_000
    });
    return client;
  }

  return async function hunyuanProvider(prompt) {
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Hunyuan prompt must be a non-empty string");
    }

    const response = await getClient().chat.completions.create({
      model: env.HUNYUAN_MODEL || "hy4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192
    });

    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim()) return content;
    if (Array.isArray(content)) {
      const text = content
        .map((part) => typeof part?.text === "string" ? part.text : "")
        .join("");
      if (text.trim()) return text;
    }
    throw new Error("Hunyuan returned an empty response");
  };
}

export const hunyuanProvider = createHunyuanProvider();
