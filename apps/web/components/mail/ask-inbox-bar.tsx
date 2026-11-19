"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { aiAskInbox } from "@/lib/actions/ai";

/**
 * "Ask my inbox" bar — natural-language Q&A across the user's mail.
 * Styled like velo's AskInbox: a compact, inviting input at the top.
 */
export function AskInboxBar() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const res = await aiAskInbox({ question });
      setAnswer(res.answer);
      setCitations(res.citations ?? []);
    } catch (e: any) {
      setAnswer(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b bg-gradient-to-r from-brand-50/60 to-transparent px-4 py-2 dark:from-brand-950/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask your inbox anything… e.g. 'What did Sarah say about the contract?'"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={submit}
          disabled={busy || !question.trim()}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </div>
      {answer && (
        <div className="mt-2 rounded-lg border bg-background p-3 text-sm">
          <p className="whitespace-pre-wrap text-foreground/90">{answer}</p>
          {citations.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sources: {citations.map((c) => `[${c}]`).join(" ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}