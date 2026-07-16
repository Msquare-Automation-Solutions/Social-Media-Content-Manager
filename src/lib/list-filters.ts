import { prisma } from "@/lib/db";
import type { LibraryFilters } from "@/lib/data";
import { isAdminRole } from "@/lib/roles";
import type { Role } from "@/lib/enums";

export type ListSearchParams = {
  person?: string;
  channel?: string;
  account?: string;
  type?: string;
  status?: string;
  q?: string;
  sort?: string;
  from?: string;
  to?: string;
  asset?: string;
};

type SortKey = "newest" | "name" | "postdate";

export type ListView = {
  person: string;
  channel: string;
  account: string;
  type: string;
  q: string;
  sort: string;
  from: string;
  to: string;
};

/**
 * Shared resolution of gallery/list filters from URL search params. For regular
 * users the Person filter defaults to their own creator (so people land on
 * their own work); admins (OWNER/ADMIN) default to All people. An explicit
 * `person=all` always clears it. Also maps the from/to date range.
 */
export async function resolveListFilters(
  user: { workspaceId: string; id: string; role: Role },
  sp: ListSearchParams,
  defaultSort: SortKey = "newest",
): Promise<{ filters: LibraryFilters; view: ListView }> {
  let selfId = "";
  if (!isAdminRole(user.role)) {
    const self = await prisma.person.findFirst({
      where: { workspaceId: user.workspaceId, userId: user.id, deletedAt: null },
      select: { id: true },
    });
    selfId = self?.id ?? "";
  }
  const personValue = sp.person ?? selfId; // the <select> value ("" → All for admins)
  const personId = personValue && personValue !== "all" ? personValue : undefined;
  const sort = (sp.sort as SortKey) || defaultSort;

  return {
    filters: {
      personId,
      channelId: sp.channel || undefined,
      accountId: sp.account || undefined,
      type: sp.type || undefined,
      q: sp.q || undefined,
      from: sp.from || undefined,
      to: sp.to || undefined,
      sort,
    },
    view: {
      person: personValue,
      channel: sp.channel ?? "",
      account: sp.account ?? "",
      type: sp.type ?? "",
      q: sp.q ?? "",
      sort,
      from: sp.from ?? "",
      to: sp.to ?? "",
    },
  };
}
