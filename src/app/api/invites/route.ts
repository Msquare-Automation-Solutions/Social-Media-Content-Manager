import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { makeToken, baseUrl } from "@/lib/tokens";
import { sendLinkEmail } from "@/lib/mailer";
import { ROLES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Invite by email — ADMIN and above. Cannot invite as OWNER (owners are not
// created via invite in v1).
const schema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES).refine((r) => r !== "OWNER", "Cannot invite as OWNER"),
});

export async function POST(req: Request) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });
  const email = parsed.data.email.toLowerCase();

  // Already a member?
  const existing = await prisma.membership.findFirst({
    where: { workspaceId: g.user.workspaceId, user: { email } },
  });
  if (existing) {
    return Response.json({ error: "Already a member" }, { status: 409 });
  }

  const { token } = makeToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Replace any prior pending invite for this email in this workspace.
  await prisma.invite.deleteMany({
    where: { workspaceId: g.user.workspaceId, email, acceptedAt: null },
  });
  await prisma.invite.create({
    data: { workspaceId: g.user.workspaceId, email, role: parsed.data.role, token, expiresAt },
  });

  const link = `${baseUrl()}/invite/${token}`;
  await sendLinkEmail("invite", email, link);

  // Dev convenience: return the link so the UI can show/copy it.
  const devLink = process.env.RESEND_API_KEY ? undefined : link;
  return Response.json({ ok: true, email, devLink }, { status: 201 });
}
