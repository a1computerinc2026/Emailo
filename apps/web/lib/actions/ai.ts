"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAiConfig } from "@/lib/ai-config";
import {
  summarizeThread,
  generateReply,
  categorizeThread,
  askInbox,
  evaluateRule,
  transformText,
  type ConversationTurn,
  type InboxContextMessage,
} from "@emailo/shared/ai";
import { z } from "zod";

async function requireAi() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const cfg = await getAiConfig(session.user.id);
  if (!cfg) {
    throw new Error(
      "No AI provider configured. Add an API key in Settings → AI, or set a server-side key.",
    );
  }
  return { userId: session.user.id, cfg };
}

async function recordUsage(userId: string, feature: string, amount = 1, meta?: unknown) {
  await prisma.usageRecord.create({
    data: { userId, feature, amount, meta: meta as never },
  });
}

const summarizeSchema = z.object({ threadId: z.string() });
export async function aiSummarizeThread(input: z.infer<typeof summarizeSchema>) {
  const { threadId } = summarizeSchema.parse(input);
  const { userId, cfg } = await requireAi();

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, account: { userId } },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  if (!thread) throw new Error("Thread not found");

  // Reuse cache when available.
  const cacheKey = `summarize:${threadId}:${thread.messages.length}`;
  const cached = await prisma.aiCache.findUnique({ where: { cacheKey } });
  if (cached) return cached.output;

  const turns: ConversationTurn[] = thread.messages.map((m) => ({
    from: m.fromEmail,
    direction: m.direction as "inbound" | "outbound",
    body: m.bodyText ?? m.snippet,
    sentAt: m.sentAt.toISOString(),
  }));

  const summary = await summarizeThread(cfg, thread.subject, turns);
  await prisma.thread.update({
    where: { id: threadId },
    data: { aiSummary: summary as never },
  });
  await prisma.aiCache.create({
    data: { cacheKey, feature: "summarize", output: summary as never },
  });
  await recordUsage(userId, "ai_tokens", 1, { feature: "summarize" });
  return summary;
}

const replySchema = z.object({
  threadId: z.string(),
  instruction: z.string().optional(),
  styleSample: z.string().optional(),
});
export async function aiGenerateReply(input: z.infer<typeof replySchema>) {
  const { threadId, instruction, styleSample } = replySchema.parse(input);
  const { userId, cfg } = await requireAi();

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, account: { userId } },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
  if (!thread) throw new Error("Thread not found");

  const turns: ConversationTurn[] = thread.messages.map((m) => ({
    from: m.fromEmail,
    direction: m.direction as "inbound" | "outbound",
    body: m.bodyText ?? m.snippet,
  }));

  const result = await generateReply(cfg, thread.subject, turns, instruction, styleSample);

  const draft = await prisma.aiDraft.create({
    data: {
      threadId,
      kind: "reply",
      prompt: instruction ?? "(auto)",
      content: result.draft,
      model: cfg.model,
    },
  });
  await recordUsage(userId, "ai_tokens", 1, { feature: "reply" });
  return { ...result, draftId: draft.id };
}

const composeSchema = z.object({
  to: z.string().optional(),
  subject: z.string().optional(),
  instruction: z.string(),
  styleSample: z.string().optional(),
});
export async function aiCompose(input: z.infer<typeof composeSchema>) {
  const { to, subject, instruction, styleSample } = composeSchema.parse(input);
  const { userId, cfg } = await requireAi();

  // Compose has no thread context; build a minimal conversation.
  const result = await generateReply(
    cfg,
    subject ?? "(no subject)",
    [{ from: to ?? "recipient", direction: "outbound", body: "(compose request)" }],
    instruction,
    styleSample,
  );
  await recordUsage(userId, "ai_tokens", 1, { feature: "compose" });
  return result;
}

const categorizeSchema = z.object({ threadId: z.string() });
export async function aiCategorizeThread(input: z.infer<typeof categorizeSchema>) {
  const { threadId } = categorizeSchema.parse(input);
  const { userId, cfg } = await requireAi();

  const thread = await prisma.thread.findFirst({
    where: { id: threadId, account: { userId } },
    include: { messages: { orderBy: { sentAt: "asc" }, take: 1 } },
  });
  if (!thread) throw new Error("Thread not found");

  const first = thread.messages[0];
  const { category, confidence } = await categorizeThread(
    cfg,
    thread.subject,
    first?.fromEmail ?? "unknown",
    first?.bodyText ?? thread.snippet,
  );

  await prisma.thread.update({
    where: { id: threadId },
    data: { category, aiCategorizedAt: new Date() },
  });
  await recordUsage(userId, "ai_tokens", 1, { feature: "categorize" });
  return { category, confidence };
}

const askSchema = z.object({ question: z.string().min(1) });
export async function aiAskInbox(input: z.infer<typeof askSchema>) {
  const { question } = askSchema.parse(input);
  const { userId, cfg } = await requireAi();

  // Pull recent threads as context.
  const recent = await prisma.thread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 40,
    include: { messages: { orderBy: { sentAt: "desc" }, take: 1 } },
  });

  const context: InboxContextMessage[] = recent.map((t) => ({
    subject: t.subject,
    from: t.participantEmails[0] ?? "unknown",
    date: t.lastMessageAt.toISOString(),
    snippet: t.snippet,
  }));

  const result = await askInbox(cfg, question, context);
  await recordUsage(userId, "ai_tokens", 1, { feature: "ask" });
  return result;
}

const ruleEvalSchema = z.object({
  instructions: z.string(),
  subject: z.string(),
  from: z.string(),
  body: z.string(),
});
export async function aiEvaluateRule(input: z.infer<typeof ruleEvalSchema>) {
  const parsed = ruleEvalSchema.parse(input);
  const { userId, cfg } = await requireAi();
  const result = await evaluateRule(
    cfg,
    parsed.instructions,
    parsed.subject,
    parsed.from,
    parsed.body,
  );
  await recordUsage(userId, "ai_tokens", 1, { feature: "rules" });
  return result;
}

const transformSchema = z.object({
  text: z.string(),
  transform: z.enum(["improve", "shorten", "formalize", "friendly", "translate"]),
  targetLang: z.string().optional(),
});
export async function aiTransformText(input: z.infer<typeof transformSchema>) {
  const parsed = transformSchema.parse(input);
  const { userId, cfg } = await requireAi();
  const result = await transformText(cfg, parsed.text, parsed.transform, parsed.targetLang);
  await recordUsage(userId, "ai_tokens", 1, { feature: "compose" });
  return result;
}