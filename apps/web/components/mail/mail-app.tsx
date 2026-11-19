"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { ThreadList } from "./thread-list";
import { ReadingPane } from "./reading-pane";
import { CommandPalette } from "@/components/command-palette";
import { AskInboxBar } from "./ask-inbox-bar";

interface Account {
  id: string;
  email: string;
  name: string | null;
  provider: string;
}

interface Props {
  user: { id: string; name: string; email: string; image: string | null };
  accounts: Account[];
}

export function MailApp({ user, accounts }: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [category, setCategory] = useState<string>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        user={user}
        accounts={accounts}
        accountId={accountId}
        onAccountChange={setAccountId}
        category={category}
        onCategoryChange={setCategory}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AskInboxBar />
        <div className="flex min-h-0 flex-1">
          <ThreadList
            accountId={accountId}
            category={category}
            selectedThreadId={selectedThreadId}
            onSelect={setSelectedThreadId}
            onOpenPalette={() => setPaletteOpen(true)}
          />
          <ReadingPane
            accountId={accountId}
            threadId={selectedThreadId}
            onClose={() => setSelectedThreadId(null)}
          />
        </div>
      </div>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={(cat) => {
            setCategory(cat);
            setPaletteOpen(false);
          }}
        />
      )}
    </div>
  );
}