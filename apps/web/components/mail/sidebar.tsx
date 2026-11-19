"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  Send,
  FileText,
  Archive,
  Star,
  Clock,
  AlertCircle,
  Users,
  Tag,
  Settings,
  Search,
  Mail as MailIcon,
  LogOut,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { CATEGORY_STYLES } from "@emailo/shared";
import { getCategoryCounts } from "@/lib/data/threads";

interface Account {
  id: string;
  email: string;
  name: string | null;
  provider: string;
}
interface Props {
  user: { name: string; email: string; image: string | null };
  accounts: Account[];
  accountId: string;
  onAccountChange: (id: string) => void;
  category: string;
  onCategoryChange: (c: string) => void;
  onOpenPalette: () => void;
}

const NAV = [
  { id: "all", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "snoozed", label: "Snoozed", icon: Clock },
  { id: "sent", label: "Sent", icon: Send },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "needs-reply", label: "Needs reply", icon: AlertCircle },
];

export function Sidebar({
  user,
  accounts,
  accountId,
  onAccountChange,
  category,
  onCategoryChange,
  onOpenPalette,
}: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [accountMenu, setAccountMenu] = useState(false);

  useEffect(() => {
    if (accountId) getCategoryCounts(accountId).then(setCounts).catch(() => {});
  }, [accountId, category]);

  // ctrl/cmd+k
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpenPalette]);

  const active = accounts.find((a) => a.id === accountId);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
      {/* Brand + account switcher */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
          <MailIcon className="h-4 w-4" />
        </span>
        <div className="relative min-w-0 flex-1">
          <button
            onClick={() => setAccountMenu((v) => !v)}
            className="flex w-full items-center gap-1 truncate text-sm font-semibold"
          >
            <span className="truncate">{active?.email ?? "Add account"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
          {accountMenu && (
            <div className="absolute left-0 top-8 z-20 w-full rounded-lg border bg-popover p-1 shadow-lg">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onAccountChange(a.id);
                    setAccountMenu(false);
                  }}
                  className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-muted ${
                    a.id === accountId ? "bg-muted font-medium" : ""
                  }`}
                >
                  {a.email}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search trigger */}
      <button
        onClick={onOpenPalette}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-xs text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1">Search mail…</span>
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onCategoryChange(item.id)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
              category === item.id
                ? "bg-brand-100 font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                : "hover:bg-muted"
            }`}
          >
            <item.icon className="h-4 w-4 opacity-70" />
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        ))}

        <div className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Categories
        </div>
        {CATEGORY_STYLES.map((c) => (
          <button
            key={c.category}
            onClick={() => onCategoryChange(c.category)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
              category === c.category
                ? "bg-brand-100 font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300"
                : "hover:bg-muted"
            }`}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: c.color }}
            />
            <span className="flex-1 text-left">{c.label}</span>
            {counts[c.category] ? (
              <span className="text-xs text-muted-foreground">{counts[c.category]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        <a
          href="/analytics"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
        >
          <BarChart3 className="h-4 w-4 opacity-70" />
          Analytics
        </a>
        <a
          href="/settings"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
        >
          <Settings className="h-4 w-4 opacity-70" />
          Settings
        </a>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted"
        >
          <LogOut className="h-4 w-4 opacity-70" />
          Sign out
        </button>
      </div>
    </aside>
  );
}