export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(raw ?? "1", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function parsePageSizeParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(raw ?? String(DEFAULT_PAGE_SIZE), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(parsed, MAX_PAGE_SIZE);
}

export function totalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function buildPaginationHref(options: {
  pathname: string;
  page: number;
  pageSize: number;
  extraParams?: Record<string, string | undefined>;
}): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(options.extraParams ?? {})) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }

  if (options.page > 1) {
    params.set("page", String(options.page));
  }

  if (options.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(options.pageSize));
  }

  const query = params.toString();

  return query ? `${options.pathname}?${query}` : options.pathname;
}
