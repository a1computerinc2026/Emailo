/**
 * Provider-agnostic AI client. Supports OpenAI, Anthropic, and Google Gemini.
 * A single `complete()` surface keeps every AI feature (summarize, reply,
 * categorize, ask, rules) independent of the underlying model.
 */
import type { AiProviderKind } from "./index";

export interface AiCompleteRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  json?: boolean;
}

export interface AiClientConfig {
  provider: AiProviderKind;
  model: string;
  apiKey: string;
}

export interface AiClient {
  complete(req: AiCompleteRequest): Promise<string>;
  completeJson<T = unknown>(req: AiCompleteRequest): Promise<T>;
  test(): Promise<boolean>;
}

class HttpAiClient implements AiClient {
  constructor(private cfg: AiClientConfig) {}

  async complete(req: AiCompleteRequest): Promise<string> {
    const { provider, model, apiKey } = this.cfg;
    switch (provider) {
      case "openai":
        return this.openai(req, model, apiKey);
      case "anthropic":
        return this.anthropic(req, model, apiKey);
      case "google":
        return this.google(req, model, apiKey);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async completeJson<T>(req: AiCompleteRequest): Promise<T> {
    const text = await this.complete({
      ...req,
      system: `${req.system}\n\nRespond with ONLY valid JSON. No prose, no markdown fences.`,
      json: true,
    });
    return parseJsonLoose<T>(text);
  }

  async test(): Promise<boolean> {
    try {
      await this.complete({ system: "Reply with the single word: ok", user: "ping", maxTokens: 10 });
      return true;
    } catch {
      return false;
    }
  }

  private async openai(req: AiCompleteRequest, model: string, apiKey: string) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.4,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  }

  private async anthropic(req: AiCompleteRequest, model: string, apiKey: string) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature ?? 0.4,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { type: string; text: string }[] };
    return data.content.map((c) => c.text).join("");
  }

  private async google(req: AiCompleteRequest, model: string, apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.user }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 1024,
          temperature: req.temperature ?? 0.4,
          ...(req.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    });
    if (!res.ok) throw new Error(`Google error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }
}

function parseJsonLoose<T>(text: string): T {
  let cleaned = text.trim();
  // Strip markdown fences if the model ignored instructions.
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) cleaned = fence[1].trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned) as T;
}

/** Build a client from config; throws if the key is missing. */
export function createAiClient(cfg: AiClientConfig): AiClient {
  if (!cfg.apiKey) throw new Error(`No API key configured for ${cfg.provider}`);
  return new HttpAiClient(cfg);
}
