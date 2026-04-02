import type { PostgrestError } from "@supabase/supabase-js";

/** Matches PostgREST default max rows per request; without paging, counts and sums silently cap. */
export const SUPABASE_SELECT_PAGE_SIZE = 1000;

/**
 * Loads every row for a query by repeating `.range(from, to)` until a short page is returned.
 */
export async function fetchAllSupabasePages<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: PostgrestError | null }>,
  pageSize: number = SUPABASE_SELECT_PAGE_SIZE
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
