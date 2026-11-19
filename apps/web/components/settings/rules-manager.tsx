"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { saveEmailRule, deleteEmailRule } from "@/lib/actions/settings";

interface Account {
  id: string;
  email: string;
}
interface Rule {
  id: string;
  accountId: string;
  name: string;
  instructions: string;
  enabled: boolean;
  priority: number;
  account: { email: string };
}
interface Props {
  accounts: Account[];
  initialRules: Rule[];
}

export function RulesManager({ accounts, initialRules }: Props) {
  const [rules, setRules] = useState(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!name || !instructions || !accountId) return;
    setSaving(true);
    try {
      await saveEmailRule({ name, instructions, accountId });
      setName("");
      setInstructions("");
      setShowForm(false);
      // In a real app, revalidatePath would refresh. Optimistic reload:
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteEmailRule(id);
    setRules((r) => r.filter((x) => x.id !== id));
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Email Rules</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Plain-English instructions that tell the AI how to handle your mail.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      {showForm && (
        <div className="mt-4 space-y-3 rounded-xl border bg-muted/30 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Rule name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto-archive newsletters"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">
              Instructions (natural language)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="e.g. When an email is from a newsletter I never read, archive it and label it as 'newsletters'."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !name || !instructions}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add Rule"}
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rules yet.</p>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-lg border p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({r.account.email})
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.instructions}
                </p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}