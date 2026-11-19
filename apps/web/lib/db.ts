import { prisma } from "@emailo/db";
import { auth } from "@/lib/auth";

export { prisma };

/**
 * Return the authenticated user's id, or throw. Use in server actions and
 * route handlers that require a signed-in user.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}