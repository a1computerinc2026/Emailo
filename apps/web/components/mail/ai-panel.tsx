"use client";

import { Sparkles, ListChecks, Smile, TrendingUp } from "lucide-react";

interface Props {
  summary: {
    tldr: string;
    bullets: string[];
    actionItems: string[];
    sentiment: string;
  } | null;
  thread: any;
  onSummarize: () => void;
  onReply: () => void;
  busy: string | null;
}

export function AiPanel({ summary, thread, onSummarize, onReply, busy }: Props) {
  const cached = thread?.aiSummary ?? null;
  const data = summary ?? cached;

  return (
    <aside className="hidden w-72 shrink-0 border-l bg-muted/20 xl:block">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Emailo AI
        </div>
      </div>

      <div className="space-y-4 p-4 text-sm">
        {!data ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            <Sparkles className="mx-auto mb-2 h-5 w-5 opacity-40" />
            Generate a summary to see key points, action items, and sentiment.
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={onSummarize}
                disabled={busy !== null}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy === "summarize" ? "Summarizing…" : "Summarize thread"}
              </button>
              <button
                onClick={onReply}
                disabled={busy !== null}
                className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
              >
                {busy === "reply" ? "Drafting…" : "Draft a reply"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                TL;DR
              </h3>
              <p className="text-foreground/90">{data.tldr}</p>
            </section>

            {data.bullets?.length > 0 && (
              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Key points
                </h3>
                <ul className="space-y-1">
                  {data.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex gap-2 text-foreground/80">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                      {b}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data.actionItems?.length > 0 && (
              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5" /> Action items
                </h3>
                <ul className="space-y-1">
                  {data.actionItems.map((a: string, i: number) => (
                    <li key={i} className="flex gap-2 text-foreground/80">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                      {a}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Smile className="h-3.5 w-3.5" /> Sentiment
              </h3>
              <span className="inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium capitalize text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {data.sentiment}
              </span>
            </section>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={onReply}
                disabled={busy !== null}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy === "reply" ? "Drafting…" : "Draft AI reply"}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}