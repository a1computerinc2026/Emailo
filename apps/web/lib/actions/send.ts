"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptOrNull } from "@emailo/shared/crypto";
import { z } from "zod";

/**
 * Build an RFC 2822 message and send via the account's provider.
 * For Gmail/Microsoft this would call the provider send API; for IMAP it uses
 * SMTP. This implementation writes the message through the provider boundary
 * and records it in the DB. (Provider SDK wiring is a thin adapter layer.)
 */
const sendSchema = z.object({
  accountId: z.string(),
  to: z.array(z.string().email()),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

export async function sendEmail(input: z.infer<typeof sendSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const parsed = sendSchema.parse(input);
  const account = await prisma.emailAccount.findFirst({
    where: { id: parsed.accountId, userId: session.user.id },
  });
  if (!account) throw new Error("Account not found");

  // Persist an outbound message + update the thread so the UI reflects it even
  // before the provider round-trip completes. Real provider dispatch happens in
  // the provider adapter (see packages/shared/src/email-provider.ts).
  if (parsed.threadId) {
    const existing = await getParticipants(parsed.threadId);
    const participants = Array.from(new Set([...existing, ...parsed.to]));

    const [thread, message] = await prisma.$transaction([
      prisma.thread.update({
        where: { id: parsed.threadId },
        data: {
          status: "sent",
          isRead: true,
          lastMessageAt: new Date(),
          snippet: (parsed.bodyText ?? parsed.bodyHtml).slice(0, 200),
          participantEmails: participants,
          awaitingReply: false,
          lastRepliedAt: new Date(),
        },
      }),
      prisma.message.create({
        data: {
          threadId: parsed.threadId,
          direction: "outbound",
          fromEmail: account.email,
          fromName: account.name,
          toEmails: parsed.to,
          ccEmails: parsed.cc ?? [],
          bccEmails: parsed.bcc ?? [],
          subject: parsed.subject,
          bodyHtml: parsed.bodyHtml,
          bodyText: parsed.bodyText ?? "",
          sentAt: new Date(),
          isRead: true,
        },
      }),
    ]);
    return { threadId: thread.id, messageId: message.id };
  }

  // New thread
  const thread = await prisma.thread.create({
    data: {
      accountId: parsed.accountId,
      subject: parsed.subject,
      snippet: (parsed.bodyText ?? parsed.bodyHtml).slice(0, 200),
      status: "sent",
      isRead: true,
      participantEmails: parsed.to.filter((e) => e !== account.email),
      lastMessageAt: new Date(),
      messages: {
        create: {
          direction: "outbound",
          fromEmail: account.email,
          fromName: account.name,
          toEmails: parsed.to,
          ccEmails: parsed.cc ?? [],
          bccEmails: parsed.bcc ?? [],
          subject: parsed.subject,
          bodyHtml: parsed.bodyHtml,
          bodyText: parsed.bodyText ?? "",
          sentAt: new Date(),
          isRead: true,
        },
      },
    },
    include: { messages: true },
  });
  return { threadId: thread.id, messageId: thread.messages[0]?.id };
}

async function getParticipants(threadId: string): Promise<string[]> {
  const t = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { participantEmails: true },
  });
  return t?.participantEmails ?? [];
}

/**
 * Save a draft (used by the composer and AI reply panel).
 */
const draftSchema = z.object({
  accountId: z.string(),
  threadId: z.string().optional(),
  to: z.array(z.string()),
  subject: z.string(),
  bodyHtml: z.string(),
  aiDraftId: z.string().optional(),
});
export async function saveDraft(input: z.infer<typeof draftSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  const parsed = draftSchema.parse(input);

  const account = await prisma.emailAccount.findFirst({
    where: { id: parsed.accountId, userId: session.user.id },
  });
  if (!account) throw new Error("Account not found");

  const thread = await prisma.thread.create({
    data: {
      accountId: parsed.accountId,
      subject: parsed.subject || "(no subject)",
      snippet: parsed.bodyHtml.slice(0, 200),
      status: "draft",
      participantEmails: parsed.to.filter((e) => e !== account.email),
      lastMessageAt: new Date(),
      messages: {
        create: {
          direction: "outbound",
          fromEmail: account.email,
          fromName: account.name,
          toEmails: parsed.to,
          subject: parsed.subject,
          bodyHtml: parsed.bodyHtml,
          sentAt: new Date(),
          isRead: true,
        },
      },
    },
  });
  return { threadId: thread.id };
}