import Link from "next/link";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { AcceptInviteForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  void hashToken; // invites store the raw token (single-use workspace join)
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { workspace: { select: { name: true } } },
  });

  const valid = invite && !invite.acceptedAt && invite.expiresAt > new Date();

  return (
    <div className="fixed inset-0 grid place-items-center bg-gradient-to-b from-[#eef4f6] via-teal-soft to-[#cfe9f2] p-4">
      <div className="w-[400px] max-w-[92vw] rounded-[22px] bg-card p-8 shadow-card">
        <div className="mx-auto mb-3.5 grid h-[46px] w-[46px] place-items-center rounded-[14px] bg-gradient-to-br from-teal to-[#0b6f88] text-xl text-white">
          ◆
        </div>
        {valid ? (
          <>
            <h1 className="text-center font-display text-xl">Join {invite!.workspace.name}</h1>
            <p className="mb-5 mt-1 text-center text-[12.5px] text-slate">
              You&apos;ve been invited as {invite!.role.toLowerCase()} · {invite!.email}
              <br />
              Set a password to finish.
            </p>
            <AcceptInviteForm token={token} />
          </>
        ) : (
          <>
            <h1 className="text-center font-display text-xl">Invite unavailable</h1>
            <p className="mb-5 mt-1 text-center text-[12.5px] text-slate">
              This invite link is invalid, already used, or expired. Ask an admin
              to send a new one.
            </p>
            <Link
              href="/login"
              className="block rounded-[12px] bg-teal py-3 text-center font-semibold text-white hover:bg-teal-dark"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
