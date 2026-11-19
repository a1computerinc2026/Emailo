"use client";

import { useState } from "react";
import { AI_PROVIDERS } from "@emailo/shared";
import { saveAiSettings, testAiKey } from "@/lib/actions/settings";

interface Props {
  initialSettings: {
    provider: string;
    model: string;
    autoCategorize: boolean;
    autoSummarize: boolean;
    autoDraftReplies: boolean;
    autoArchiveColdEmails: boolean;
    hasApiKey: boolean;
  } | null;
}

export function SettingsForm({ initialSettings }: Props) {
  const [provider, setProvider] = useState(initialSettings?.provider ?? "openai");
  const [model, setModel] = useState(initialSettings?.model ?? "gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [autoCategorize, setAutoCategorize] = useState(initialSettings?.autoCategorize ?? true);
  const [autoSummarize, setAutoSummarize] = useState(initialSettings?.autoSummarize ?? true);
  const [autoDraftReplies, setAutoDraftReplies] = useState(initialSettings?.autoDraftReplies ?? false);
  const [autoArchiveCold, setAutoArchiveCold] = useState(initialSettings?.autoArchiveColdEmails ?? false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const selectedProvider = AI_PROVIDERS.find((p) => p.id === provider);

  async function handleSave() {
    setSaving(true);
    try {
      await saveAiSettings({
        provider: provider as any,
        model,
        apiKey,
        autoCategorize,
        autoSummarize,
        autoDraftReplies,
        autoArchiveColdEmails: autoArchiveCold,
      });
      setApiKey("");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!apiKey) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAiKey({ provider, model, apiKey });
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">AI Configuration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose your provider and model. API keys are encrypted at rest.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Provider</label>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value as typeof provider;
              setProvider(p);
              const def = AI_PROVIDERS.find((x) => x.id === p)?.defaultModel;
              if (def) setModel(def);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {selectedProvider?.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            API Key {initialSettings?.hasApiKey && <span className="text-xs text-muted-foreground">(saved)</span>}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={initialSettings?.hasApiKey ? "Leave blank to keep existing" : "sk-…"}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={handleTest}
              disabled={testing || !apiKey}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40"
            >
              {testing ? "Testing…" : "Test"}
            </button>
          </div>
          {testResult && (
            <p className={`mt-2 text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
              {testResult.message}
            </p>
          )}
        </div>

        <div className="space-y-3 border-t pt-4">
          <Toggle label="Auto-categorize incoming mail" checked={autoCategorize} onChange={setAutoCategorize} />
          <Toggle label="Auto-summarize threads" checked={autoSummarize} onChange={setAutoSummarize} />
          <Toggle label="Auto-draft replies" checked={autoDraftReplies} onChange={setAutoDraftReplies} />
          <Toggle label="Auto-archive cold emails" checked={autoArchiveCold} onChange={setAutoArchiveCold} />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span>{label}</span>
    </label>
  );
}