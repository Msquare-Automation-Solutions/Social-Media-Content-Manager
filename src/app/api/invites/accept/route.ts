import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { colorFor } from "@/lib/colors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accept an invite: sets the new member's password on first visit and creates
// their User + Membership. No auth required (the token is the credential).
const schema = z.object({
  token: z.string().min(10),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Bad request" },
      { status: 400 },
    );
  }
  const { token, name, password } = parsed.data;

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return Response.json({ error: "This invite is invalid or expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const email = invite.email.toLowerCase();

  await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email } });
    if (!user) {
      user = await tx.user.create({
        data: { email, name, passwordHash, avatarColor: colorFor(name) },
      });
    } else {
      // Existing account accepting a new workspace invite — set password too.
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    }
    await tx.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: invite.workspaceId } },
      create: { userId: user.id, workspaceId: invite.workspaceId, role: invite.role },
      update: { role: invite.role },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return Response.json({ ok: true });
}
