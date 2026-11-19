import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Mail, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { LoginButton } from "@/components/login-button";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Emailo to connect your inbox and start using AI email management.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/mail");

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          Emailo
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          AI-powered email management
        </div>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Your inbox, on autopilot.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Emailo organizes your mail, drafts replies in your tone, blocks cold
          outreach, and answers questions about your inbox — all powered by the
          AI provider you choose.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <LoginButton />
          <p className="text-xs text-muted-foreground">
            Connect Google, Microsoft, or add an IMAP account after signing in.
          </p>
        </div>

        <section
          aria-label="Features"
          className="mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {[
            { icon: Zap, title: "AI Rules", desc: "Plain-English rules that triage email automatically." },
            { icon: Sparkles, title: "Smart Replies", desc: "Drafts in your voice, ready to send in one click." },
            { icon: ShieldCheck, title: "Private by default", desc: "Your keys, your data. Self-host on your own infra." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 text-left">
              <f.icon className="h-5 w-5 text-brand-600" aria-hidden="true" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </section>

      <footer className="py-8 text-center text-xs text-muted-foreground">
        Inspired by inbox-zero and velo. Built to be self-hosted.
      </footer>
    </main>
  );
}