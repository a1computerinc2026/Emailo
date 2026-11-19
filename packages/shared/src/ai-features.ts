/**
 * High-level AI features built on the generic AiClient. Each function has a
 * focused system prompt and a Zod-validated JSON contract where structure
 * matters. Prompts are the product surface — keep them tight and portable.
 */
import { createAiClient, type AiClient } from "./ai-client";
import type { AiProviderKind, ThreadCategory } from "./index";

export interface AiConfig {
  provider: AiProviderKind;
  model: string;
  apiKey: string;
}

export interface ConversationTurn {
  from: string;
  direction: "inbound" | "outbound";
  body: string;
  sentAt?: string;
}

// ---------------------------------------------------------------------------
// Summarize
// ---------------------------------------------------------------------------

export interface ThreadSummary {
  tldr: string;
  bullets: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
}

export async function summarizeThread(
  cfg: AiConfig,
  subject: string,
  turns: ConversationTurn[],
): Promise<ThreadSummary> {
  const client = createAiClient(cfg);
  return client.completeJson<ThreadSummary>({
    system: `You are an expert email assistant. Summarize the following email thread.
Return JSON with keys:
- tldr: one sentence summary (<= 200 chars)
- bullets: 3-6 key points as short strings
- actionItems: concrete action items the reader must do (empty array if none)
- sentiment: one of positive|neutral|negative|mixed
Be concise and factual. Do not invent details.`,
    user: `Subject: ${subject}\n\n${formatTurns(turns)}`,
    maxTokens: 800,
    temperature: 0.2,
  });
}

// ---------------------------------------------------------------------------
// Smart reply / compose
// ---------------------------------------------------------------------------

export interface DraftResult {
  draft: string;
  tone: string;
  confidence: number;
}

export async function generateReply(
  cfg: AiConfig,
  subject: string,
  turns: ConversationTurn[],
  instruction?: string,
  styleSample?: string,
): Promise<DraftResult> {
  const client = createAiClient(cfg);
  const styleNote = styleSample
    ? `\n\nMatch this writing style of the user (voice, length, formality):\n"""${styleSample.slice(0, 1500)}"""`
    : "";
  return client.completeJson<DraftResult>({
    system: `You write email replies on behalf of the user. Produce a ready-to-send reply.
Return JSON:
- draft: the reply body (no subject line, no signature)
- tone: a short label for the tone you used
- confidence: 0..1
Rules: be concise, professional, and accurate to the thread. Never fabricate commitments,
numbers, or facts. If the thread asks for information you don't have, leave a clear
[PLACEHOLDER] instead of inventing it.${styleNote}`,
    user: `${instruction ? `User instruction: ${instruction}\n\n` : ""}Subject: ${subject}\n\n${formatTurns(turns)}`,
    maxTokens: 900,
    temperature: 0.5,
  });
}

export async function transformText(
  cfg: AiConfig,
  text: string,
  transform: "improve" | "shorten" | "formalize" | "friendly" | "translate",
  targetLang?: string,
): Promise<string> {
  const client = createAiClient(cfg);
  const map: Record<string, string> = {
    improve: "Improve clarity, grammar, and flow while preserving meaning and length.",
    shorten: "Make this significantly more concise while keeping all key points.",
    formalize: "Rewrite in a more formal, professional tone.",
    friendly: "Rewrite in a warmer, friendlier tone.",
    translate: `Translate to ${targetLang ?? "English"}.`,
  };
  return client.complete({
    system: `You are an editor. Apply ONLY this transformation: ${map[transform]}. Return only the transformed text.`,
    user: text,
    maxTokens: 1200,
    temperature: 0.4,
  });
}

// ---------------------------------------------------------------------------
// Categorization
// ---------------------------------------------------------------------------

export const CATEGORIES: ThreadCategory[] = [
  "primary",
  "updates",
  "promotions",
  "social",
  "newsletters",
  "cold",
];

export async function categorizeThread(
  cfg: AiConfig,
  subject: string,
  from: string,
  body: string,
): Promise<{ category: ThreadCategory; confidence: number }> {
  const client = createAiClient(cfg);
  return client.completeJson<{ category: ThreadCategory; confidence: number }>({
    system: `Classify an email into exactly one category:
- primary: personal/work correspondence requiring attention
- updates: receipts, shipping, bills, statements, notifications
- promotions: marketing, sales, discounts
- social: social network notifications, mentions, invites
- newsletters: recurring content/subscriptions/digests
- cold: unsolicited cold outreach/sales from unknown senders
Return JSON: {"category": "<one>", "confidence": 0..1}`,
    user: `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 2000)}`,
    maxTokens: 100,
    temperature: 0,
  });
}

// ---------------------------------------------------------------------------
// Ask my inbox (natural-language search / Q&A)
// ---------------------------------------------------------------------------

export interface InboxContextMessage {
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export async function askInbox(
  cfg: AiConfig,
  question: string,
  context: InboxContextMessage[],
): Promise<{ answer: string; citations: number[] }> {
  const client = createAiClient(cfg);
  const ctx = context
    .map(
      (m, i) =>
        `[${i}] ${m.date} | from ${m.from} | ${m.subject}\n    ${m.snippet}`,
    )
    .join("\n");
  return client.completeJson<{ answer: string; citations: number[] }>({
    system: `Answer the user's question using ONLY the provided emails. Cite sources by their
index numbers in "citations". If the answer is not in the context, say so plainly.
Return JSON: {"answer": "...", "citations": [0, 2]}`,
    user: `Emails:\n${ctx || "(no matching emails)"}\n\nQuestion: ${question}`,
    maxTokens: 700,
    temperature: 0.2,
  });
}

// ---------------------------------------------------------------------------
// AI rule evaluation (natural-language inbox rules)
// ---------------------------------------------------------------------------

export interface RuleEvaluation {
  matches: boolean;
  reason: string;
  suggestedActions: string[];
}

export async function evaluateRule(
  cfg: AiConfig,
  instructions: string,
  subject: string,
  from: string,
  body: string,
): Promise<RuleEvaluation> {
  const client = createAiClient(cfg);
  return client.completeJson<RuleEvaluation>({
    system: `You evaluate whether an incoming email matches a user's natural-language rule.
Return JSON:
- matches: boolean
- reason: short explanation
- suggestedActions: array of action strings that apply, chosen from
  ["archive","mark_read","star","spam","label","draft_reply","forward","notify"]
Only suggest actions the rule implies.`,
    user: `Rule: "${instructions}"\n\nEmail:\nFrom: ${from}\nSubject: ${subject}\n\n${body.slice(0, 2000)}`,
    maxTokens: 300,
    temperature: 0,
  });
}

// ---------------------------------------------------------------------------
// Cold email detection
// ---------------------------------------------------------------------------

export async function isColdEmail(
  cfg: AiConfig,
  subject: string,
  from: string,
  body: string,
): Promise<{ isCold: boolean; reason: string; confidence: number }> {
  const client = createAiClient(cfg);
  return client.completeJson<{ isCold: boolean; reason: string; confidence: number }>({
    system: `Decide whether an email is unsolicited cold outreach / sales spam from a stranger.
Return JSON: {"isCold": boolean, "reason": "...", "confidence": 0..1}
Consider: unknown sender, sales pitch, "quick call", unrelated to prior contact.`,
    user: `From: ${from}\nSubject: ${subject}\n\n${body.slice(0, 1500)}`,
    maxTokens: 150,
    temperature: 0,
  });
}

// ---------------------------------------------------------------------------
// Writing style analysis
// ---------------------------------------------------------------------------

export async function analyzeWritingStyle(
  cfg: AiConfig,
  sentEmails: string[],
): Promise<{ summary: string; dos: string[]; donts: string[]; sampleTone: string }> {
  const client = createAiClient(cfg);
  return client.completeJson<{
    summary: string;
    dos: string[];
    donts: string[];
    sampleTone: string;
  }>({
    system: `Analyze the user's sent emails to capture their writing style so replies sound like them.
Return JSON: {"summary","dos":[],"donts":[],"sampleTone":"a short style descriptor"}.`,
    user: sentEmails.slice(0, 8).join("\n\n---\n\n").slice(0, 6000),
    maxTokens: 600,
    temperature: 0.3,
  });
}

function formatTurns(turns: ConversationTurn[]): string {
  return turns
    .map(
      (t) =>
        `${t.direction === "outbound" ? "Me" : t.from}: ${t.body}`,
    )
    .join("\n\n");
}

export type { AiClient };
