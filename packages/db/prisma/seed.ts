/**
 * Minimal seed. Creates a demo user with a connected account and some threads so
 * the UI is usable immediately after `pnpm db:seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@emailo.dev" },
    update: {},
    create: {
      email: "demo@emailo.dev",
      name: "Emailo Demo",
      aiSettings: {
        create: {
          provider: "openai",
          model: "gpt-4o-mini",
          autoCategorize: true,
          autoSummarize: true,
        },
      },
      notifications: { create: {} },
    },
    include: { accounts: true },
  });

  let account = user.accounts[0];
  if (!account) {
    account = await prisma.emailAccount.create({
      data: {
        userId: user.id,
        email: "demo@emailo.dev",
        name: "Emailo Demo",
        provider: "google",
        isConnected: true,
      },
    });
  }

  const samples = [
    {
      subject: "Welcome to Emailo 👋",
      from: "team@emailo.dev",
      category: "primary",
      snippet: "Your AI email assistant is ready. Here is how to get started…",
      body: "Welcome! Emailo organizes your inbox, drafts replies in your tone, and blocks cold outreach. Start by connecting an account in Settings.",
      isRead: false,
      needsReply: true,
    },
    {
      subject: "Your weekly product digest",
      from: "digest@news.example.com",
      category: "newsletters",
      snippet: "This week: new AI features, faster search, and more…",
      body: "Issue #42 — We shipped thread summaries, natural-language search, and bulk unsubscribe. Read the full changelog online.",
      isRead: true,
    },
    {
      subject: "50% off — limited time only",
      from: "offers@shop.example.com",
      category: "promotions",
      snippet: "Big savings on everything in store this weekend.",
      body: "Flash sale! Use code SAVE50 at checkout. Ends Sunday.",
      isRead: true,
    },
    {
      subject: "Partnership inquiry",
      from: "founder@startup.example.com",
      category: "cold",
      snippet: "I came across Emailo and wanted to reach out about…",
      body: "Hi there, I'm reaching out because I think there may be a partnership opportunity. Would you be open to a quick call?",
      isRead: false,
    },
    {
      subject: "Design review feedback",
      from: "alex@company.example.com",
      category: "primary",
      snippet: "Left a few comments on the Figma file — overall looking great!",
      body: "Hey, I reviewed the new dashboard. A couple of spacing tweaks on the sidebar and we're good to ship. Nice work!",
      isRead: false,
      needsReply: true,
    },
    {
      subject: "You were mentioned in a comment",
      from: "notifications@social.example.com",
      category: "social",
      snippet: "Jordan mentioned you in a thread you follow.",
      body: "Jordan: 'Credit to @you for this great writeup on AI email.' Reply in the app to join the conversation.",
      isRead: true,
    },
  ];

  const existing = await prisma.thread.count({ where: { accountId: account.id } });
  if (existing === 0) {
    for (const [i, s] of samples.entries()) {
      const lastMessageAt = new Date(Date.now() - i * 3_600_000);
      await prisma.thread.create({
        data: {
          accountId: account.id,
          subject: s.subject,
          snippet: s.snippet,
          category: s.category,
          status: "inbox",
          isRead: s.isRead,
          needsReply: s.needsReply ?? false,
          lastMessageAt,
          participantEmails: [s.from],
          participantNames: [s.from.split("@")[0]],
          messageCount: 1,
          messages: {
            create: {
              direction: "inbound",
              fromEmail: s.from,
              fromName: s.from.split("@")[0],
              toEmails: [account.email],
              subject: s.subject,
              bodyText: s.body,
              snippet: s.snippet,
              sentAt: lastMessageAt,
            },
          },
        },
      });
    }
  }

  console.log("Seed complete. Demo user: demo@emailo.dev");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());