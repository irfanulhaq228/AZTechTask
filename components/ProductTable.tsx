import type { ReactNode } from "react";

import { formatCellValue, inferDynamicColumns, type ProductTableRow } from "@/lib/products";

type ProductTableProps = {
  rows: ProductTableRow[];
  showUploadId?: boolean;
  emptyMessage?: string;
  footer?: ReactNode;
};

export function ProductTable({
  rows,
  showUploadId = false,
  emptyMessage = "No processed products available yet.",
  footer,
}: ProductTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const dynamicColumns = inferDynamicColumns(rows);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            {showUploadId ? <th className="px-4 py-3 font-medium">Upload</th> : null}
            <th className="px-4 py-3 font-medium">Row</th>
            <th className="px-4 py-3 font-medium">Normalized name</th>
            <th className="px-4 py-3 font-medium">Normalized price</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            {dynamicColumns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="align-top">
              {showUploadId ? <td className="px-4 py-3 text-slate-500">{row.uploadId}</td> : null}
              <td className="px-4 py-3 text-slate-500">{row.rowNumber}</td>
              <td className="px-4 py-3 font-medium text-slate-900">
                {row.nameNormalized ?? "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {row.priceNormalized != null ? row.priceNormalized.toFixed(2) : "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">{row.slug ?? "-"}</td>
              {dynamicColumns.map((column) => (
                <td key={`${row.id}-${column}`} className="max-w-56 px-4 py-3 text-slate-600">
                  <div className="line-clamp-3">{formatCellValue(row.cleanData[column])}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {footer}
    </div>
  );
}
