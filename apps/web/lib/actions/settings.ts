"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@emailo/shared/crypto";
import { createAiClient } from "@emailo/shared/ai-client";
import { AI_PROVIDERS } from "@emailo/shared";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string(),
  apiKey: z.string().optional(),
  autoCategorize: z.boolean().default(true),
  autoSummarize: z.boolean().default(true),
  autoDraftReplies: z.boolean().default(false),
  autoArchiveColdEmails: z.boolean().default(false),
});

export async function saveAiSettings(input: z.infer<typeof aiSettingsSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const parsed = aiSettingsSchema.parse(input);

  const data: Record<string, unknown> = {
    provider: parsed.provider,
    model: parsed.model,
    autoCategorize: parsed.autoCategorize,
    autoSummarize: parsed.autoSummarize,
    autoDraftReplies: parsed.autoDraftReplies,
    autoArchiveColdEmails: parsed.autoArchiveColdEmails,
  };

  if (parsed.apiKey && parsed.apiKey.trim().length > 0) {
    data.apiKeyEnc = encrypt(parsed.apiKey.trim());
  }

  await prisma.aiSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data } as any,
  });

  revalidatePath("/settings");
}

export async function testAiKey(input: { provider: string; model: string; apiKey: string }) {
  try {
    const client = createAiClient({
      provider: input.provider as any,
      model: input.model,
      apiKey: input.apiKey,
    });
    const ok = await client.test();
    return { ok, message: ok ? "Connection successful" : "Could not reach provider" };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Failed" };
  }
}

const ruleSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().min(1),
  accountId: z.string(),
  enabled: z.boolean().optional().default(true),
  priority: z.number().optional().default(0),
});

export async function saveEmailRule(input: z.input<typeof ruleSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const parsed = ruleSchema.parse(input);

  // Verify account ownership
  const account = await prisma.emailAccount.findFirst({
    where: { id: parsed.accountId, userId: session.user.id },
  });
  if (!account) throw new Error("Account not found");

  await prisma.emailRule.create({
    data: {
      accountId: parsed.accountId,
      name: parsed.name,
      instructions: parsed.instructions,
      enabled: parsed.enabled,
      priority: parsed.priority,
      actions: [],
    },
  });
  revalidatePath("/settings");
}

export async function deleteEmailRule(ruleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  await prisma.emailRule.delete({ where: { id: ruleId } });
  revalidatePath("/settings");
}

export async function listEmailRules(accountId: string) {
  return prisma.emailRule.findMany({
    where: { accountId },
    orderBy: { priority: "asc" },
  });
}