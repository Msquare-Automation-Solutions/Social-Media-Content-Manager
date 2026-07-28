import type { LibraryFilters } from "@/lib/data";
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
 * Shared resolution of gallery/list filters from URL search params. The Person
 * filter defaults to All people for everyone (admins and creators alike) — pick
 * a person to narrow it. An explicit `person=all` also clears it. Also maps the
 * from/to date range.
 */
export async function resolveListFilters(
  user: { workspaceId: string; id: string; role: Role },
  sp: ListSearchParams,
  defaultSort: SortKey = "newest",
): Promise<{ filters: LibraryFilters; view: ListView }> {
  const personValue = sp.person ?? ""; // "" → All people (default for all roles)
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
