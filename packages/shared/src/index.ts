/**
 * Shared domain types for Emailo. These mirror the Prisma schema in
 * @emailo/db but are intentionally decoupled so the web app, worker, and any
 * future desktop/mobile client can share a single source of truth.
 */

export type AccountProvider = "google" | "microsoft" | "imap";

/** Split-inbox categories (velo-style). */
export type ThreadCategory =
  | "primary"
  | "updates"
  | "promotions"
  | "social"
  | "newsletters"
  | "cold";

export type ThreadStatus = "inbox" | "archived" | "snoozed" | "sent" | "draft";

export type MessageDirection = "inbound" | "outbound";

export type AiProviderKind = "openai" | "anthropic" | "google";

/** An AI feature the user can enable / choose a model for. */
export type AiFeature =
  | "summarize"
  | "reply"
  | "compose"
  | "categorize"
  | "ask"
  | "rules";

export interface Account {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  provider: AccountProvider;
  /** True when the provider connection needs the user to re-auth. */
  isConnected: boolean;
  createdAt: Date | string;
}

export interface Thread {
  id: string;
  accountId: string;
  subject: string;
  snippet: string;
  category: ThreadCategory;
  status: ThreadStatus;
  isRead: boolean;
  isStarred: boolean;
  isPinned: boolean;
  isMuted: boolean;
  hasAttachment: boolean;
  participantEmails: string[];
  lastMessageAt: Date | string;
  snoozedUntil?: Date | string | null;
  messageCount: number;
}

export interface Message {
  id: string;
  threadId: string;
  direction: MessageDirection;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  snippet: string;
  sentAt: Date | string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachment: boolean;
  providerMessageId: string | null;
  /** Parsed SPF/DKIM/DMARC verdicts (velo-style auth badges). */
  authResults?: AuthResultsSummary | null;
  /** Phishing risk score 0-100 from the link scanner. */
  phishingScore?: number | null;
}

export interface AuthResultsSummary {
  spf?: "pass" | "fail" | "softfail" | "neutral" | "none" | "unknown";
  dkim?: "pass" | "fail" | "none" | "unknown";
  dmarc?: "pass" | "fail" | "none" | "unknown";
  summary: "pass" | "fail" | "warning" | "unknown";
}

export interface Attachment {
  id: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId: string | null;
}

export interface EmailRule {
  id: string;
  accountId: string;
  name: string;
  enabled: boolean;
  /** Natural-language instruction for the AI rule engine. */
  instructions: string;
  /** Optional deterministic match conditions. */
  matchFrom?: string | null;
  matchSubjectContains?: string | null;
  matchBodyContains?: string | null;
  actions: RuleAction[];
  priority: number;
}

export interface RuleAction {
  type:
    | "archive"
    | "mark_read"
    | "star"
    | "spam"
    | "label"
    | "draft_reply"
    | "forward"
    | "notify";
  label?: string;
  value?: string;
}

export interface AiSummary {
  threadId: string;
  tldr: string;
  bullets: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  generatedAt: Date | string;
}

export interface AiDraft {
  id: string;
  threadId: string | null;
  kind: "reply" | "compose" | "cold_email";
  prompt: string;
  content: string;
  model: string;
  createdAt: Date | string;
}

/** AI settings stored per user. */
export interface AiSettings {
  provider: AiProviderKind;
  model: string;
  apiKeySet: boolean;
  features: Record<AiFeature, boolean>;
  autoCategorize: boolean;
  autoDraftReplies: boolean;
  autoArchiveColdEmails: boolean;
}

export interface CategoryStyle {
  category: ThreadCategory;
  label: string;
  color: string;
}

export const CATEGORY_STYLES: CategoryStyle[] = [
  { category: "primary", label: "Primary", color: "#6366f1" },
  { category: "updates", label: "Updates", color: "#0ea5e9" },
  { category: "promotions", label: "Promotions", color: "#f59e0b" },
  { category: "social", label: "Social", color: "#ec4899" },
  { category: "newsletters", label: "Newsletters", color: "#10b981" },
  { category: "cold", label: "Cold Outreach", color: "#ef4444" },
];

export const AI_PROVIDERS: {
  id: AiProviderKind;
  label: string;
  defaultModel: string;
  models: { id: string; label: string }[];
}[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    defaultModel: "claude-haiku-4-5-20251001",
    models: [
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
];