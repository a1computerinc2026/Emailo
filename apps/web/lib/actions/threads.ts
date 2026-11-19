"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Verify the current user owns the given account. Throws otherwise.
 */
async function requireAccount(accountId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const account = await prisma.emailAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
    select: { id: true },
  });
  if (!account) throw new Error("Account not found");
  return account;
}

/**
 * Verify the current user owns the given thread (via its account). Returns the
 * thread's accountId so callers can re-scope further queries.
 */
async function requireThread(threadId: string): Promise<{ accountId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const thread = await prisma.thread.findFirst({
    where: { id: threadId, account: { userId: session.user.id } },
    select: { accountId: true },
  });
  if (!thread) throw new Error("Thread not found");
  return thread;
}

const markReadSchema = z.object({
  threadId: z.string(),
  read: z.boolean(),
});
export async function markThreadRead(input: z.infer<typeof markReadSchema>) {
  const { threadId, read } = markReadSchema.parse(input);
  await requireThread(threadId);
  await prisma.thread.update({ where: { id: threadId }, data: { isRead: read } });
  revalidatePath("/mail");
}

const starSchema = z.object({ threadId: z.string(), starred: z.boolean() });
export async function setThreadStarred(input: z.infer<typeof starSchema>) {
  const { threadId, starred } = starSchema.parse(input);
  await requireThread(threadId);
  await prisma.thread.update({ where: { id: threadId }, data: { isStarred: starred } });
  revalidatePath("/mail");
}

const pinSchema = z.object({ threadId: z.string(), pinned: z.boolean() });
export async function setThreadPinned(input: z.infer<typeof pinSchema>) {
  const { threadId, pinned } = pinSchema.parse(input);
  await requireThread(threadId);
  await prisma.thread.update({ where: { id: threadId }, data: { isPinned: pinned } });
  revalidatePath("/mail");
}

const statusSchema = z.object({
  accountId: z.string(),
  threadIds: z.array(z.string()),
  status: z.enum(["inbox", "archived", "snoozed", "sent", "draft"]),
});
export async function setThreadsStatus(input: z.infer<typeof statusSchema>) {
  const { accountId, threadIds, status } = statusSchema.parse(input);
  await requireAccount(accountId);
  await prisma.thread.updateMany({
    where: { id: { in: threadIds }, accountId },
    data: { status },
  });
  revalidatePath("/mail");
}

const snoozeSchema = z.object({
  threadId: z.string(),
  until: z.string(),
});
export async function snoozeThread(input: z.infer<typeof snoozeSchema>) {
  const { threadId, until } = snoozeSchema.parse(input);
  await requireThread(threadId);
  await prisma.thread.update({
    where: { id: threadId },
    data: { status: "snoozed", snoozedUntil: new Date(until) },
  });
  revalidatePath("/mail");
}

const deleteSchema = z.object({ threadId: z.string() });
export async function deleteThread(input: z.infer<typeof deleteSchema>) {
  const { threadId } = deleteSchema.parse(input);
  await requireThread(threadId);
  await prisma.thread.delete({ where: { id: threadId } });
  revalidatePath("/mail");
}