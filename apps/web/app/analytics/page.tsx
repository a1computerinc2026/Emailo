import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInboxAnalytics } from "@/lib/data/analytics";
import { CATEGORY_STYLES } from "@emailo/shared";
import { Mail, ArrowLeft } from "lucide-react";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getInboxAnalytics(30);
  const maxDaily = Math.max(
    1,
    ...data.dailyVolume.map((d) => Math.max(d.inbound, d.outbound)),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center gap-2">
        <a href="/mail" className="text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Back to inbox
        </a>
      </div>
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
        <Mail className="h-6 w-6 text-brand-600" />
        Inbox Analytics
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your email activity over the last 30 days.
      </p>

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Total threads" value={data.total} />
        <Kpi label="Needs reply" value={data.metrics.needsReply} accent />
        <Kpi label="Cold blocked" value={data.metrics.coldBlocked} />
        <Kpi label="Reply rate" value={`${data.metrics.replyRate}%`} />
      </div>

      {/* Daily volume chart (CSS bars) */}
      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">Message volume</h2>
        <div className="flex h-40 items-end gap-1">
          {data.dailyVolume.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end gap-0.5">
                <div
                  className="w-1/2 rounded-t bg-brand-500"
                  style={{ height: `${(d.inbound / maxDaily) * 100}%` }}
                  title={`${d.inbound} inbound`}
                />
                <div
                  className="w-1/2 rounded-t bg-emerald-500"
                  style={{ height: `${(d.outbound / maxDaily) * 100}%` }}
                  title={`${d.outbound} outbound`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">
                {d.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" /> Inbound
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Outbound
          </span>
        </div>
      </section>

      {/* Category breakdown */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">By category</h2>
        <div className="space-y-3">
          {data.byCategory.map((c) => {
            const style = CATEGORY_STYLES.find((s) => s.category === c.category);
            const pct = data.total > 0 ? Math.round((c.count / data.total) * 100) : 0;
            return (
              <div key={c.category} className="flex items-center gap-3">
                <span className="w-28 text-sm capitalize">
                  {style?.label ?? c.category}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: style?.color ?? "#6366f1" }}
                  />
                </div>
                <span className="w-12 text-right text-xs text-muted-foreground">
                  {c.count}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? "bg-brand-50 dark:bg-brand-950/30" : "bg-card"
      }`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}