/**
 * Resolve the effective AI config for a user: their stored settings + decrypted
 * API key, falling back to server env vars. Keeps AI features working even when
 * the user hasn't added their own key (operator-provided keys).
 */
import { prisma } from "@/lib/db";
import { decryptOrNull } from "@emailo/shared/crypto";
import type { AiConfig } from "@emailo/shared/ai";
import type { AiProviderKind } from "@emailo/shared";
import { env } from "@/lib/env";

export async function getAiConfig(
  userId: string,
): Promise<AiConfig | null> {
  const settings = await prisma.aiSettings.findUnique({ where: { userId } });
  const provider = (settings?.provider as AiProviderKind) ?? "openai";
  const model = settings?.model ?? defaultModel(provider);

  const userKey = decryptOrNull(settings?.apiKeyEnc);
  const apiKey = userKey ?? envKey(provider);

  if (!apiKey) return null;

  return { provider, model, apiKey };
}

export async function getAiSettings(userId: string) {
  return prisma.aiSettings.findUnique({ where: { userId } });
}

function defaultModel(provider: AiProviderKind): string {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-haiku-4-5-20251001";
    case "google":
      return "gemini-2.5-flash";
  }
}

function envKey(provider: AiProviderKind): string | undefined {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "google":
      return env.GOOGLE_GENERATIVE_AI_API_KEY;
  }
}