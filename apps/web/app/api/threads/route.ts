import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/threads?accountId=...&category=...&cursor=...
 * Returns a page of threads for the given account, scoped to the current user.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId");
  const category = searchParams.get("category") ?? "all";
  const cursor = searchParams.get("cursor") ?? undefined;

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const threads = await prisma.thread.findMany({
    where: {
      accountId,
      status: "inbox",
      ...(category !== "all" ? { category } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 41,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { _count: { select: { messages: true } } },
  });

  const hasMore = threads.length > 40;
  const page = hasMore ? threads.slice(0, 40) : threads;

  return NextResponse.json({
    threads: page,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
}