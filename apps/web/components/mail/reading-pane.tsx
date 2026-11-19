"use client";

import { useEffect, useState } from "react";
import {
  Star,
  Archive,
  Clock,
  Sparkles,
  Reply,
  Forward,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { getThread } from "@/lib/data/threads";
import {
  aiSummarizeThread,
  aiGenerateReply,
} from "@/lib/actions/ai";
import {
  markThreadRead,
  setThreadStarred,
  setThreadsStatus,
} from "@/lib/actions/threads";
import { sendEmail, saveDraft } from "@/lib/actions/send";
import { sanitizeEmailHtml, escapeHtml } from "@emailo/shared/sanitize";
import { AiPanel } from "./ai-panel";

interface Props {
  accountId: string;
  threadId: string | null;
  onClose: () => void;
}

export function ReadingPane({ accountId, threadId, onClose }: Props) {
  const [thread, setThread] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!threadId) return;
    setLoading(true);
    setSummary(null);
    setDraft(null);
    getThread(threadId, accountId)
      .then((t) => {
        setThread(t);
        if (t && !t.isRead) {
          markThreadRead({ threadId, read: true });
        }
      })
      .finally(() => setLoading(false));
  }, [threadId, accountId]);

  if (!threadId) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Select a message to read
      </div>
    );
  }

  if (loading || !thread) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  async function handleSummarize() {
    setAiBusy("summarize");
    try {
      const s = await aiSummarizeThread({ threadId: thread.id });
      setSummary(s);
    } finally {
      setAiBusy(null);
    }
  }

  async function handleReply() {
    setAiBusy("reply");
    try {
      const r = await aiGenerateReply({ threadId: thread.id });
      setDraft(r.draft);
    } finally {
      setAiBusy(null);
    }
  }

  async function handleSendDraft() {
    if (!draft) return;
    // Reply to the senders of the inbound messages (everyone who wrote to us),
    // excluding our own address. Falls back to all participants.
    const inboundSenders = (thread.messages ?? [])
      .filter((m: any) => m.direction === "inbound")
      .map((m: any) => m.fromEmail)
      .filter((e: string) => e && e !== thread.messages?.[0]?.fromEmail);
    const recipients = inboundSenders.length > 0
      ? Array.from(new Set(inboundSenders)) as string[]
      : (thread.participantEmails ?? []);
    await sendEmail({
      accountId,
      to: recipients,
      subject: thread.subject.startsWith("Re:")
        ? thread.subject
        : `Re: ${thread.subject}`,
      bodyHtml: draft.replace(/\n/g, "<br/>"),
      bodyText: draft,
      threadId: thread.id,
    });
    setDraft(null);
    onClose();
  }

  async function handleDiscardDraft() {
    if (!draft) return;
    await saveDraft({
      accountId,
      threadId: thread.id,
      to: thread.participantEmails ?? [],
      subject: thread.subject,
      bodyHtml: draft.replace(/\n/g, "<br/>"),
    });
    setDraft(null);
  }

  const firstMessage = thread.messages?.[0];
  const authBadge = firstMessage?.authResults?.summary;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background/80 px-4 py-2 backdrop-blur">
        <button
          onClick={() => setThreadStarred({ threadId: thread.id, starred: !thread.isStarred })}
          className="rounded p-2 hover:bg-muted"
          title="Star"
        >
          <Star className={`h-4 w-4 ${thread.isStarred ? "fill-amber-400 text-amber-400" : "opacity-60"}`} />
        </button>
        <button
          onClick={() => {
            setThreadsStatus({ accountId, threadIds: [thread.id], status: "archived" });
            onClose();
          }}
          className="rounded p-2 hover:bg-muted"
          title="Archive"
        >
          <Archive className="h-4 w-4 opacity-60" />
        </button>
        <button className="rounded p-2 hover:bg-muted" title="Snooze">
          <Clock className="h-4 w-4 opacity-60" />
        </button>
        <button
          onClick={handleSummarize}
          disabled={aiBusy !== null}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {aiBusy === "summarize" ? "Summarizing…" : "AI Summary"}
        </button>
        <button
          onClick={onClose}
          className="rounded p-2 hover:bg-muted"
          title="Close"
          aria-label="Close thread"
        >
          <X className="h-4 w-4 opacity-60" aria-hidden="true" />
        </button>
      </div>

      <div className="flex gap-0">
        {/* Message column */}
        <div className="min-w-0 flex-1 px-6 py-4">
          <h1 className="text-xl font-semibold">{thread.subject}</h1>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span>{thread.participantEmails?.join(", ")}</span>
            <span>·</span>
            <span>{thread.messageCount} messages</span>
          </div>

          {/* Phishing / auth banners */}
          {firstMessage?.phishingScore != null && firstMessage.phishingScore > 40 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert className="h-4 w-4" />
              Potential phishing detected (risk {firstMessage.phishingScore}/100)
            </div>
          )}
          {authBadge && authBadge !== "pass" && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              Authentication: {authBadge}
            </div>
          )}

          {/* Messages */}
          <div className="mt-6 space-y-6">
            {thread.messages?.map((m: any) => (
              <article key={m.id} className="border-b pb-6 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {(m.fromName ?? m.fromEmail)[0]?.toUpperCase()}
                  </span>
                  <div className="text-sm">
                    <span className="font-medium">{m.fromName ?? m.fromEmail}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      to {m.toEmails?.join(", ")}
                    </span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(m.sentAt).toLocaleString()}
                  </span>
                </div>
                <div
                  className="email-prose mt-3 text-foreground/90"
                  dangerouslySetInnerHTML={{
                    __html: m.bodyHtml
                      ? sanitizeEmailHtml(m.bodyHtml)
                      : escapeHtml(m.bodyText ?? ""),
                  }}
                />
                {m.hasAttachment && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {m.attachments?.length ?? 0} attachment(s)
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Reply actions */}
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleReply}
              disabled={aiBusy !== null}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              <Reply className="h-4 w-4" />
              {aiBusy === "reply" ? "Drafting…" : "AI Reply"}
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              <Forward className="h-4 w-4" />
              Forward
            </button>
          </div>

          {draft && (
            <div className="mt-4 rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-700 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5" />
                AI-drafted reply
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-lg border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleSendDraft}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  Send
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  Save draft
                </button>
              </div>
            </div>
          )}
        </div>

        {/* AI panel column */}
        <AiPanel
          summary={summary}
          thread={thread}
          onSummarize={handleSummarize}
          onReply={handleReply}
          busy={aiBusy}
        />
      </div>
    </div>
  );
}