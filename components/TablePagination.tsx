import Link from "next/link";

import { buildPaginationHref, totalPages } from "@/lib/pagination";

type TablePaginationProps = {
  pathname: string;
  page: number;
  pageSize: number;
  totalItems: number;
  /** Extra query keys to preserve (e.g. uploadId on /products). */
  extraParams?: Record<string, string | undefined>;
  /** Accessible label for the surrounding region. */
  label?: string;
};

export function TablePagination({
  pathname,
  page,
  pageSize,
  totalItems,
  extraParams,
  label = "Table pagination",
}: TablePaginationProps) {
  const pages = totalPages(totalItems, pageSize);
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) {
    return null;
  }

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < pages ? page + 1 : null;

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, page + 2);
  const pageNumbers: number[] = [];

  for (let index = windowStart; index <= windowEnd; index += 1) {
    pageNumbers.push(index);
  }

  const linkBase = { pathname, pageSize, extraParams };

  return (
    <nav
      aria-label={label}
      className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Showing <span className="font-medium text-slate-900">{from}</span>–
        <span className="font-medium text-slate-900">{to}</span> of{" "}
        <span className="font-medium text-slate-900">{totalItems}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {prevPage ? (
          <Link
            href={buildPaginationHref({ ...linkBase, page: prevPage })}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-3 py-1.5 text-slate-400">
            Previous
          </span>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {pageNumbers.map((pageNumber) => (
            <Link
              key={pageNumber}
              href={buildPaginationHref({ ...linkBase, page: pageNumber })}
              className={`min-w-9 rounded-full px-3 py-1.5 text-center font-medium transition ${
                pageNumber === page
                  ? "border-2 border-black bg-slate-900 text-[#ffffff]"
                  : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </div>

        {nextPage ? (
          <Link
            href={buildPaginationHref({ ...linkBase, page: nextPage })}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-full border border-transparent px-3 py-1.5 text-slate-400">
            Next
          </span>
        )}
      </div>
    </nav>
  );
}
