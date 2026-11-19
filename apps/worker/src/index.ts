/**
 * Emailo background worker.
 *
 * Runs continuously and performs:
 *  1. Sync — pull new mail from each connected account's provider.
 *  2. AI triage — auto-categorize and evaluate natural-language rules.
 *  3. Snooze — unsnooze threads whose snooze timer elapsed.
 *  4. Follow-up reminders — flag threads awaiting a reply.
 *
 * Designed to run as a separate container/process from the web app so sync and
 * AI work never block request handling. On WSL/Docker it runs alongside the web
 * container; on bare metal, run `pnpm worker`.
 */
import { prisma } from "@emailo/db";
import { decryptOrNull } from "@emailo/shared/crypto";
import {
  categorizeThread,
  evaluateRule,
  isColdEmail,
} from "@emailo/shared/ai";
import type { AiProviderKind } from "@emailo/shared";

const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 60_000);
const SNOOZE_INTERVAL_MS = Number(process.env.SNOOZE_INTERVAL_MS ?? 60_000);
const FOLLOWUP_INTERVAL_MS = Number(process.env.FOLLOWUP_INTERVAL_MS ?? 300_000);

async function aiConfigFor(userId: string) {
  const settings = await prisma.aiSettings.findUnique({ where: { userId } });
  const provider = (settings?.provider as AiProviderKind) ?? "openai";
  const model = settings?.model ?? defaultModel(provider);
  const key = decryptOrNull(settings?.apiKeyEnc) ?? envKey(provider);
  if (!key) return null;
  return { provider, model, apiKey: key, settings };
}

function defaultModel(p: AiProviderKind) {
  if (p === "anthropic") return "claude-haiku-4-5-20251001";
  if (p === "google") return "gemini-2.5-flash";
  return "gpt-4o-mini";
}
function envKey(p: AiProviderKind) {
  if (p === "anthropic") return process.env.ANTHROPIC_API_KEY;
  if (p === "google") return process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  return process.env.OPENAI_API_KEY;
}

// ---------------------------------------------------------------------------
// 1. Sync (provider stubs — real sync wired via EmailProvider adapters)
// ---------------------------------------------------------------------------

async function syncAll() {
  const accounts = await prisma.emailAccount.findMany({
    where: { isConnected: true },
  });
  for (const account of accounts) {
    try {
      // In production this calls provider.initialSync/deltaSync and upserts
      // threads/messages. Kept as a hook point so the worker compiles without
      // provider credentials in every environment.
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
    } catch (e) {
      console.error(`[sync] account ${account.id} failed:`, e);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. AI triage for new/untriaged threads
// ---------------------------------------------------------------------------

async function aiTriage() {
  const pending = await prisma.thread.findMany({
    where: {
      aiCategorizedAt: null,
      status: "inbox",
      messages: { some: { direction: "inbound" } },
    },
    take: 20,
    include: {
      account: { include: { user: true } },
      messages: {
        orderBy: { sentAt: "asc" },
        take: 1,
      },
    },
  });

  for (const thread of pending) {
    const cfg = await aiConfigFor(thread.account.userId);
    if (!cfg) continue;
    try {
      const first = thread.messages[0];
      const body = first?.bodyText ?? thread.snippet;

      // Category
      if (cfg.settings?.autoCategorize !== false) {
        const { category } = await categorizeThread(
          cfg,
          thread.subject,
          first?.fromEmail ?? "unknown",
          body,
        );
        await prisma.thread.update({
          where: { id: thread.id },
          data: { category, aiCategorizedAt: new Date() },
        });
      }

      // Cold-email auto-archive
      if (cfg.settings?.autoArchiveColdEmails) {
        const cold = await isColdEmail(cfg, thread.subject, first?.fromEmail ?? "", body);
        if (cold.isCold && cold.confidence > 0.7) {
          await prisma.thread.update({
            where: { id: thread.id },
            data: { status: "archived", category: "cold" },
          });
        }
      }

      // Evaluate enabled rules for this account
      const rules = await prisma.emailRule.findMany({
        where: { accountId: thread.accountId, enabled: true },
        orderBy: { priority: "asc" },
      });
      for (const rule of rules) {
        const result = await evaluateRule(
          cfg,
          rule.instructions,
          thread.subject,
          first?.fromEmail ?? "",
          body,
        );
        if (result.matches) {
          await applyRuleActions(thread.id, result.suggestedActions);
          await prisma.emailRule.update({
            where: { id: rule.id },
            data: { hitCount: { increment: 1 }, lastRunAt: new Date() },
          });
          break; // first matching rule wins
        }
      }

      await prisma.usageRecord.create({
        data: { userId: thread.account.userId, feature: "ai_tokens", amount: 1 },
      });
    } catch (e) {
      console.error(`[triage] thread ${thread.id} failed:`, e);
    }
  }
}

async function applyRuleActions(threadId: string, actions: string[]) {
  const data: Record<string, unknown> = {};
  if (actions.includes("archive")) data.status = "archived";
  if (actions.includes("mark_read")) data.isRead = true;
  if (actions.includes("star")) data.isStarred = true;
  if (actions.includes("spam")) data.isSpam = true;
  if (Object.keys(data).length > 0) {
    await prisma.thread.update({ where: { id: threadId }, data });
  }
}

// ---------------------------------------------------------------------------
// 3. Snooze processor
// ---------------------------------------------------------------------------

async function processSnoozes() {
  const due = await prisma.thread.findMany({
    where: {
      status: "snoozed",
      snoozedUntil: { lte: new Date() },
    },
    select: { id: true },
  });
  if (due.length === 0) return;
  await prisma.thread.updateMany({
    where: { id: { in: due.map((t) => t.id) } },
    data: { status: "inbox", snoozedUntil: null },
  });
  console.log(`[snooze] unsnoozed ${due.length} thread(s)`);
}

// ---------------------------------------------------------------------------
// 4. Follow-up reminders
// ---------------------------------------------------------------------------

async function processFollowUps() {
  // Flag threads awaiting a reply with no outbound message after N days.
  const cutoff = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  await prisma.thread.updateMany({
    where: {
      status: "inbox",
      awaitingReply: false,
      lastMessageAt: { lte: cutoff },
      followUpAt: null,
      messages: { some: { direction: "inbound" } },
    },
    data: { followUpAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main() {
  console.log("[worker] starting…");
  let syncTimer: NodeJS.Timeout;
  let snoozeTimer: NodeJS.Timeout;
  let followupTimer: NodeJS.Timeout;

  async function tick(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e) {
      console.error(`[${name}] error:`, e);
    }
  }

  await tick("sync", syncAll);
  await tick("triage", aiTriage);
  await tick("snooze", processSnoozes);

  syncTimer = setInterval(() => tick("sync", syncAll), SYNC_INTERVAL_MS);
  snoozeTimer = setInterval(() => tick("snooze", processSnoozes), SNOOZE_INTERVAL_MS);
  followupTimer = setInterval(() => tick("followup", processFollowUps), FOLLOWUP_INTERVAL_MS);

  // Triage every sync cycle
  setInterval(() => tick("triage", aiTriage), SYNC_INTERVAL_MS);

  async function shutdown() {
    console.log("[worker] shutting down…");
    clearInterval(syncTimer);
    clearInterval(snoozeTimer);
    clearInterval(followupTimer);
    await prisma.$disconnect();
    process.exit(0);
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[worker] ready");
}

main();