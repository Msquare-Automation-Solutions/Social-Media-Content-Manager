import { z } from "zod";
import { prisma } from "@/lib/db";
import { makeToken, baseUrl } from "@/lib/tokens";
import { sendLinkEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

// Always responds the same way — never reveals whether an account exists.
// Rate-limited to 3 requests per email per hour.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  const generic = Response.json({
    ok: true,
    message: "If an account exists, we've sent a reset link.",
  });
  if (!parsed.success) return generic;

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return generic;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, /* created within the last hour */ expiresAt: { gte: hourAgo } },
  });
  if (recent >= 3) return generic; // silently drop over-limit requests

  const { token, tokenHash } = makeToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  });

  await sendLinkEmail("reset", email, `${baseUrl()}/reset-password?token=${token}`);
  return generic;
}
