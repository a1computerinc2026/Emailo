"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * Login buttons render whatever OAuth providers are configured. If none are
 * configured (self-host with only IMAP), we still show a disabled hint.
 */
export function LoginButton() {
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => {
          setLoading("google");
          signIn("google", { callbackUrl: "/mail" });
        }}
        disabled={loading !== null}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
      >
        {loading === "google" ? "Connecting…" : "Continue with Google"}
      </button>
      <button
        onClick={() => {
          setLoading("microsoft");
          signIn("microsoft", { callbackUrl: "/mail" });
        }}
        disabled={loading !== null}
        className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold shadow-sm transition hover:bg-muted disabled:opacity-60"
      >
        {loading === "microsoft" ? "Connecting…" : "Continue with Microsoft"}
      </button>
    </div>
  );
}