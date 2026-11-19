"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Aggregated inbox analytics over the last N days (inbox-zero style).
 * Powers the dashboard and per-category breakdowns.
 */
export async function getInboxAnalytics(days = 30) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const [total, byCategory, byStatus, inbound, outbound, needsReply, coldBlocked] =
    await Promise.all([
      prisma.thread.count({ where: { account: { userId: session.user.id } } }),
      prisma.thread.groupBy({
        by: ["category"],
        where: { account: { userId: session.user.id }, lastMessageAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.thread.groupBy({
        by: ["status"],
        where: { account: { userId: session.user.id } },
        _count: { _all: true },
      }),
      prisma.message.count({
        where: {
          direction: "inbound",
          thread: { account: { userId: session.user.id } },
          sentAt: { gte: since },
        },
      }),
      prisma.message.count({
        where: {
          direction: "outbound",
          thread: { account: { userId: session.user.id } },
          sentAt: { gte: since },
        },
      }),
      prisma.thread.count({
        where: { account: { userId: session.user.id }, needsReply: true },
      }),
      prisma.thread.count({
        where: {
          account: { userId: session.user.id },
          category: "cold",
          status: "archived",
        },
      }),
    ]);

  const daily = await prisma.$queryRaw<
    { day: string; inbound: bigint; outbound: bigint }[]
  >`
    SELECT DATE(sent_at) AS day,
      COUNT(*) FILTER (WHERE direction = 'inbound') AS inbound,
      COUNT(*) FILTER (WHERE direction = 'outbound') AS outbound
    FROM messages m
    JOIN threads t ON t.id = m.thread_id
    JOIN email_accounts a ON a.id = t.account_id
    WHERE a.user_id = ${session.user.id}
      AND m.sent_at >= ${since}
    GROUP BY DATE(sent_at)
    ORDER BY day ASC
  `;

  return {
    total,
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count._all,
    })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
    dailyVolume: daily.map((d) => ({
      day: String(d.day),
      inbound: Number(d.inbound),
      outbound: Number(d.outbound),
    })),
    metrics: {
      inbound,
      outbound,
      needsReply,
      coldBlocked,
      replyRate:
        inbound > 0 ? Math.round((outbound / Math.max(outbound, inbound)) * 100) : 0,
    },
  };
}