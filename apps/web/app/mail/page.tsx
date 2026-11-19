import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MailApp } from "@/components/mail/mail-app";

export default async function MailPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const accounts = await prisma.emailAccount.findMany({
    where: { userId: session.user.id, isConnected: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <MailApp
      user={{
        id: session.user.id,
        name: session.user.name ?? "User",
        email: session.user.email ?? "",
        image: session.user.image ?? null,
      }}
      accounts={accounts.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        provider: a.provider,
      }))}
    />
  );
}