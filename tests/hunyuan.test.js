import { describe, expect, it, vi } from "vitest";
import { createHunyuanProvider } from "../src/providers/hunyuan.js";

describe("Hunyuan provider", () => {
  it("uses the official TokenHub endpoint and the Hy4 model by default", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "Hy4 response" } }]
    });
    let clientOptions;
    class FakeOpenAI {
      constructor(options) {
        clientOptions = options;
        this.chat = { completions: { create } };
      }
    }

    const provider = createHunyuanProvider({
      OpenAIClient: FakeOpenAI,
      env: { HUNYUAN_API_KEY: "test-key" }
    });

    await expect(provider("Review this code")).resolves.toBe("Hy4 response");
    expect(clientOptions).toMatchObject({
      apiKey: "test-key",
      baseURL: "https://tokenhub-intl.tencentcloudmaas.com/v1"
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: "hy4",
      messages: [{ role: "user", content: "Review this code" }]
    }));
  });

  it("requires a server-side API key", async () => {
    const provider = createHunyuanProvider({
      OpenAIClient: class {},
      env: {}
    });
    await expect(provider("hello")).rejects.toThrow("HUNYUAN_API_KEY not configured");
  });

  it("rejects non-HTTPS custom endpoints", async () => {
    const provider = createHunyuanProvider({
      OpenAIClient: class {},
      env: {
        HUNYUAN_API_KEY: "test-key",
        HUNYUAN_BASE_URL: "http://localhost:8080/v1"
      }
    });
    await expect(provider("hello")).rejects.toThrow("must use HTTPS");
  });
});
