import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import type { ThreadCategory, ThreadStatus } from "@emailo/shared";

export interface ThreadListParams {
  accountId: string;
  category?: ThreadCategory | "all";
  status?: ThreadStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

export async function listThreads(params: ThreadListParams) {
  const {
    accountId,
    category = "all",
    status = "inbox",
    search,
    cursor,
    limit = 40,
  } = params;

  const where: Record<string, unknown> = { accountId, status };
  if (category !== "all") where.category = category;

  if (search) {
    where.OR = [
      { subject: { contains: search, mode: "insensitive" } },
      { snippet: { contains: search, mode: "insensitive" } },
      { participantEmails: { has: search } },
    ];
  }

  const threads = await prisma.thread.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      labels: { include: { label: true } },
      _count: { select: { messages: true } },
    },
  });

  const hasMore = threads.length > limit;
  const page = hasMore ? threads.slice(0, limit) : threads;

  return {
    threads: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/**
 * Fetch a thread with its messages. Scoped to the authenticated user to prevent
 * IDOR — a user can only read threads under accounts they own.
 */
export async function getThread(threadId: string, accountId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Verify the account belongs to the user before reading the thread.
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Thread not found");

  return prisma.thread.findFirst({
    where: { id: threadId, accountId },
    include: {
      messages: {
        orderBy: { sentAt: "asc" },
        include: { attachments: true },
      },
      labels: { include: { label: true } },
    },
  });
}

export async function getCategoryCounts(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Account not found");

  const grouped = await prisma.thread.groupBy({
    by: ["category"],
    where: { accountId, status: "inbox", isRead: false },
    _count: { _all: true },
  });

  const counts: Record<string, number> = { all: 0 };
  for (const g of grouped) {
    counts[g.category] = g._count._all;
    counts.all += g._count._all;
  }
  return counts;
}