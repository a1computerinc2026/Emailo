"use client";

import { useEffect, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";

interface Props {
  onClose: () => void;
  onNavigate: (category: string) => void;
}

const COMMANDS = [
  { id: "all", label: "Go to Inbox", group: "Navigation" },
  { id: "starred", label: "Go to Starred", group: "Navigation" },
  { id: "snoozed", label: "Go to Snoozed", group: "Navigation" },
  { id: "sent", label: "Go to Sent", group: "Navigation" },
  { id: "drafts", label: "Go to Drafts", group: "Navigation" },
  { id: "archive", label: "Go to Archive", group: "Navigation" },
  { id: "needs-reply", label: "Go to Needs Reply", group: "Navigation" },
  { id: "primary", label: "Category: Primary", group: "Categories" },
  { id: "updates", label: "Category: Updates", group: "Categories" },
  { id: "promotions", label: "Category: Promotions", group: "Categories" },
  { id: "social", label: "Category: Social", group: "Categories" },
  { id: "newsletters", label: "Category: Newsletters", group: "Categories" },
  { id: "cold", label: "Category: Cold Outreach", group: "Categories" },
];

export function CommandPalette({ onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  function run(cmd: (typeof COMMANDS)[number]) {
    onNavigate(cmd.id);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 opacity-50" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, filtered.length - 1));
              if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
              if (e.key === "Enter" && filtered[active]) run(filtered[active]);
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <CornerDownLeft className="h-3.5 w-3.5 opacity-40" />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => run(cmd)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                  i === active ? "bg-brand-100 dark:bg-brand-950/50" : ""
                }`}
              >
                <span>{cmd.label}</span>
                <span className="text-[11px] text-muted-foreground">{cmd.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}