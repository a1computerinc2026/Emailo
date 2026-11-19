import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings/settings-form";
import { RulesManager } from "@/components/settings/rules-manager";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [settings, accounts, rules] = await Promise.all([
    prisma.aiSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.emailAccount.findMany({ where: { userId: session.user.id } }),
    prisma.emailRule.findMany({
      where: { account: { userId: session.user.id } },
      include: { account: { select: { email: true } } },
      orderBy: { priority: "asc" },
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Configure AI, accounts, and automation rules for Emailo.
      </p>

      <div className="mt-8 space-y-8">
        <SettingsForm
          initialSettings={
            settings
              ? {
                  provider: settings.provider,
                  model: settings.model,
                  autoCategorize: settings.autoCategorize,
                  autoSummarize: settings.autoSummarize,
                  autoDraftReplies: settings.autoDraftReplies,
                  autoArchiveColdEmails: settings.autoArchiveColdEmails,
                  hasApiKey: Boolean(settings.apiKeyEnc),
                }
              : null
          }
        />

        {accounts.length > 0 && (
          <RulesManager
            accounts={accounts.map((a) => ({ id: a.id, email: a.email }))}
            initialRules={rules}
          />
        )}
      </div>
    </main>
  );
}