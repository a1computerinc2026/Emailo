import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAiClient } from "./ai-client";
import {
  summarizeThread,
  categorizeThread,
  askInbox,
} from "./ai-features";

/**
 * Verify the provider-agnostic AI client + feature functions against a mocked
 * fetch. This confirms the request shape, response parsing, and JSON contracts
 * work for each provider without hitting real APIs.
 */

function mockFetch(responseBody: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => responseBody,
    text: async () => JSON.stringify(responseBody),
  });
}

describe("AiClient", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("calls OpenAI and returns content", async () => {
    const f = mockFetch({ choices: [{ message: { content: "hello" } }] });
    vi.stubGlobal("fetch", f);
    const client = createAiClient({ provider: "openai", model: "gpt-4o-mini", apiKey: "k" });
    expect(await client.complete({ system: "s", user: "u" })).toBe("hello");
    const [url, opts] = f.mock.calls[0];
    expect(url).toContain("openai.com");
    expect(opts.headers.Authorization).toBe("Bearer k");
  });

  it("calls Anthropic and returns content", async () => {
    const f = mockFetch({ content: [{ type: "text", text: "claude says hi" }] });
    vi.stubGlobal("fetch", f);
    const client = createAiClient({ provider: "anthropic", model: "m", apiKey: "k" });
    expect(await client.complete({ system: "s", user: "u" })).toBe("claude says hi");
    const [url, opts] = f.mock.calls[0];
    expect(url).toContain("anthropic.com");
    expect(opts.headers["x-api-key"]).toBe("k");
  });

  it("calls Google and returns content", async () => {
    const f = mockFetch({ candidates: [{ content: { parts: [{ text: "gemini hi" }] } }] });
    vi.stubGlobal("fetch", f);
    const client = createAiClient({ provider: "google", model: "m", apiKey: "k" });
    expect(await client.complete({ system: "s", user: "u" })).toBe("gemini hi");
  });

  it("throws when API key missing", () => {
    expect(() => createAiClient({ provider: "openai", model: "m", apiKey: "" })).toThrow();
  });

  it("parses JSON responses (strips markdown fences)", async () => {
    const f = mockFetch({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] });
    vi.stubGlobal("fetch", f);
    const client = createAiClient({ provider: "openai", model: "m", apiKey: "k" });
    const out = await client.completeJson<{ a: number }>({ system: "s", user: "u" });
    expect(out.a).toBe(1);
  });
});

describe("AI features", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  const cfg = { provider: "openai" as const, model: "m", apiKey: "k" };

  it("summarizeThread returns structured summary", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        choices: {
          0: undefined,
        },
      }),
    );
    // Use a proper choices array
    vi.stubGlobal(
      "fetch",
      mockFetch({
        choices: [
          {
            message: {
              content: JSON.stringify({
                tldr: "Short summary",
                bullets: ["a", "b"],
                actionItems: ["do x"],
                sentiment: "positive",
              }),
            },
          },
        ],
      }),
    );
    const out = await summarizeThread(cfg, "Subject", [
      { from: "a@b.com", direction: "inbound", body: "hi" },
    ]);
    expect(out.tldr).toBe("Short summary");
    expect(out.bullets).toHaveLength(2);
    expect(out.sentiment).toBe("positive");
  });

  it("categorizeThread returns a category + confidence", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        choices: [
          { message: { content: JSON.stringify({ category: "newsletters", confidence: 0.9 }) } },
        ],
      }),
    );
    const out = await categorizeThread(cfg, "Weekly digest", "news@x.com", "Issue 42");
    expect(out.category).toBe("newsletters");
    expect(out.confidence).toBeGreaterThan(0.8);
  });

  it("askInbox returns answer with citations", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({
        choices: [
          {
            message: {
              content: JSON.stringify({ answer: "Yes, Sarah said yes.", citations: [0] }),
            },
          },
        ],
      }),
    );
    const out = await askInbox(cfg, "Did Sarah approve?", [
      { subject: "Re: contract", from: "sarah@x.com", date: "2026-01-01", snippet: "approved" },
    ]);
    expect(out.answer).toContain("Sarah");
    expect(out.citations).toEqual([0]);
  });
});