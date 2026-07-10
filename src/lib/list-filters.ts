import { prisma } from "@/lib/db";
import type { LibraryFilters } from "@/lib/data";

export type ListSearchParams = {
  person?: string;
  channel?: string;
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
  type: string;
  q: string;
  sort: string;
  from: string;
  to: string;
};

/**
 * Shared resolution of gallery/list filters from URL search params. Defaults the
 * Person filter to the logged-in user's own creator (so people land on their own
 * work); an explicit `person=all` clears it. Also maps the from/to date range.
 */
export async function resolveListFilters(
  workspaceId: string,
  userId: string,
  sp: ListSearchParams,
  defaultSort: SortKey = "newest",
): Promise<{ filters: LibraryFilters; view: ListView }> {
  const self = await prisma.person.findFirst({
    where: { workspaceId, userId, deletedAt: null },
    select: { id: true },
  });
  const selfId = self?.id ?? "";
  const personValue = sp.person ?? selfId; // the <select> value
  const personId = personValue && personValue !== "all" ? personValue : undefined;
  const sort = (sp.sort as SortKey) || defaultSort;

  return {
    filters: {
      personId,
      channelId: sp.channel || undefined,
      type: sp.type || undefined,
      q: sp.q || undefined,
      from: sp.from || undefined,
      to: sp.to || undefined,
      sort,
    },
    view: {
      person: personValue,
      channel: sp.channel ?? "",
      type: sp.type ?? "",
      q: sp.q ?? "",
      sort,
      from: sp.from ?? "",
      to: sp.to ?? "",
    },
  };
}
