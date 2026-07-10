import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { hashPassword, passwordSchema } from "@/lib/password";
import { colorFor } from "@/lib/colors";
import { logActivity } from "@/lib/activity";
import { roleLabel } from "@/lib/roles";
import { ensureSelfPerson } from "@/lib/people";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin creates a login account directly (name, email, role, password). No
// email/invite — the admin shares the password with the user.
const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  role: z.enum(["ADMIN", "EDITOR"]),
  password: passwordSchema,
});

export async function POST(req: Request) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Bad request";
    return new Response(msg, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    return Response.json(
      { error: "An account with that email already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      avatarColor: colorFor(parsed.data.name),
      memberships: {
        create: { workspaceId: g.user.workspaceId, role: parsed.data.role },
      },
    },
    include: { memberships: { where: { workspaceId: g.user.workspaceId } } },
  });

  // Give the new login user a linked creator record so their uploads are
  // attributed to them by default.
  await ensureSelfPerson({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor,
    workspaceId: g.user.workspaceId,
  });

  await logActivity(g.user, {
    action: "account.created",
    targetId: user.id,
    targetLabel: user.name,
    metadata: { email: user.email, role: roleLabel(parsed.data.role) },
  });

  return Response.json(
    {
      membershipId: user.memberships[0].id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: parsed.data.role,
    },
    { status: 201 },
  );
}
