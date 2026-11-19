"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Paperclip, Circle } from "lucide-react";
import { listThreads } from "@/lib/data/threads";
import type { ThreadCategory, ThreadStatus } from "@emailo/shared";

interface Props {
  accountId: string;
  category: string;
  selectedThreadId: string | null;
  onSelect: (id: string) => void;
  onOpenPalette: () => void;
}

function timeAgo(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ThreadList({
  accountId,
  category,
  selectedThreadId,
  onSelect,
}: Props) {
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    // Map sidebar nav ids to a status filter; everything else is a category.
    const statusMap: Record<string, ThreadStatus> = {
      sent: "sent",
      drafts: "draft",
      snoozed: "snoozed",
      archive: "archived",
      starred: "inbox",
      "needs-reply": "inbox",
      all: "inbox",
    };
    const categorySet = new Set<ThreadCategory>([
      "primary", "updates", "promotions", "social", "newsletters", "cold",
    ]);
    const categoryFilter: ThreadCategory | "all" = categorySet.has(category as ThreadCategory)
      ? (category as ThreadCategory)
      : "all";
    try {
      const res = await listThreads({
        accountId,
        category: categoryFilter,
        status: statusMap[category] ?? "inbox",
      });
      setThreads(res.threads);
      setNextCursor(res.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [accountId, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex w-80 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold capitalize">
          {category === "all" ? "Inbox" : category.replace("-", " ")}
        </h2>
        <span className="text-xs text-muted-foreground">{threads.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No messages here.
          </div>
        ) : (
          threads.map((t) => <ThreadRow key={t.id} thread={t} active={t.id === selectedThreadId} onSelect={onSelect} />)
        )}
      </div>
    </div>
  );
}

function ThreadRow({
  thread: t,
  active,
  onSelect,
}: {
  thread: any;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(t.id)}
      className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition hover:bg-muted/60 ${
        active ? "bg-brand-50 dark:bg-brand-950/30" : ""
      } ${t.isRead ? "" : "font-medium"}`}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {t.participantNames?.[0] ?? t.participantEmails?.[0] ?? "Unknown"}
        </span>
        {t.isStarred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
        {t.hasAttachment && <Paperclip className="h-3.5 w-3.5 shrink-0 opacity-50" />}
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {timeAgo(String(t.lastMessageAt))}
        </span>
      </div>
      <div className={`truncate text-sm ${t.isRead ? "text-foreground/80" : ""}`}>
        {t.subject}
      </div>
      <div className="truncate text-xs text-muted-foreground">{t.snippet}</div>
      <div className="flex items-center gap-2">
        {!t.isRead && <Circle className="h-2 w-2 fill-brand-600 text-brand-600" />}
        {t.needsReply && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            needs reply
          </span>
        )}
      </div>
    </button>
  );
}