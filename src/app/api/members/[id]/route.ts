import { z } from "zod";
import { guard } from "@/lib/api-guard";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Update a member — ADMIN and above. Owners cannot be modified, and no one is
// promoted to OWNER via this route (v1). Supports a role change and/or
// activate/deactivate toggle.
const schema = z.object({
  role: z.enum(ROLES).refine((r) => r !== "OWNER", "Cannot assign OWNER").optional(),
  disabled: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return new Response("Bad request", { status: 400 });

  const membership = await prisma.membership.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!membership) return new Response("Not found", { status: 404 });
  if (membership.role === "OWNER") {
    return new Response("Cannot modify an owner", { status: 403 });
  }

  if (parsed.data.role !== undefined) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { role: parsed.data.role },
    });
  }

  if (parsed.data.disabled !== undefined) {
    if (membership.userId === g.user.id) {
      return new Response("You cannot deactivate your own account", { status: 400 });
    }
    await prisma.user.update({
      where: { id: membership.userId },
      data: { disabledAt: parsed.data.disabled ? new Date() : null },
    });
  }

  return Response.json({ ok: true });
}

// Delete a member — ADMIN and above — reassigning ALL of their content to an
// admin-chosen target user first, so nothing is orphaned. Owners and self
// cannot be deleted.
const deleteSchema = z.object({ reassignToUserId: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard("ADMIN");
  if (!g.ok) return g.response;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response("A reassign target is required", { status: 400 });
  }

  const membership = await prisma.membership.findFirst({
    where: { id: (await params).id, workspaceId: g.user.workspaceId },
  });
  if (!membership) return new Response("Not found", { status: 404 });
  if (membership.role === "OWNER") {
    return new Response("Cannot remove an owner", { status: 403 });
  }
  if (membership.userId === g.user.id) {
    return new Response("You cannot delete your own account", { status: 400 });
  }

  // The reassign target must be a different, real member of this workspace.
  const target = await prisma.membership.findFirst({
    where: { workspaceId: g.user.workspaceId, userId: parsed.data.reassignToUserId },
    select: { userId: true },
  });
  if (!target || target.userId === membership.userId) {
    return new Response("Invalid reassign target", { status: 400 });
  }

  const deletedUserId = membership.userId;
  const newOwnerId = target.userId;

  await prisma.$transaction([
    prisma.mediaAsset.updateMany({
      where: { createdById: deletedUserId },
      data: { createdById: newOwnerId },
    }),
    prisma.assetVersion.updateMany({
      where: { editedById: deletedUserId },
      data: { editedById: newOwnerId },
    }),
    prisma.chatSession.updateMany({
      where: { userId: deletedUserId },
      data: { userId: newOwnerId },
    }),
    prisma.skill.updateMany({
      where: { updatedById: deletedUserId },
      data: { updatedById: newOwnerId },
    }),
    prisma.person.updateMany({
      where: { userId: deletedUserId },
      data: { userId: null },
    }),
    // Memberships + reset tokens cascade on user delete.
    prisma.user.delete({ where: { id: deletedUserId } }),
  ]);

  return Response.json({ ok: true });
}
