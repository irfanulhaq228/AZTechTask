"use client";

import { useEffect, useMemo, useState } from "react";

import { DeleteUploadButton } from "@/components/DeleteUploadButton";
import { InsightPanel } from "@/components/InsightPanel";
import { ProductTable } from "@/components/ProductTable";
import { StatsGrid } from "@/components/StatsGrid";
import { StatusBadge } from "@/components/StatusBadge";
import { TablePagination } from "@/components/TablePagination";
import { toProductTableRow } from "@/lib/products";
import type { SerializedUpload } from "@/lib/uploads";

type UploadDetailProps = {
  initialUpload: SerializedUpload;
  productTotal: number;
  productPage: number;
  productPageSize: number;
};

type UploadDetailResponse = {
  upload: SerializedUpload;
  productTotal?: number;
};

export function UploadDetail({
  initialUpload,
  productTotal,
  productPage,
  productPageSize,
}: UploadDetailProps) {
  const [upload, setUpload] = useState(initialUpload);
  const [productCount, setProductCount] = useState(productTotal);

  useEffect(() => {
    if (!["PENDING", "PROCESSING"].includes(upload.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(
        `/api/uploads/${upload.id}?page=${productPage}&pageSize=${productPageSize}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as UploadDetailResponse;
      setUpload(data.upload);

      if (typeof data.productTotal === "number") {
        setProductCount(data.productTotal);
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [upload.id, upload.status, productPage, productPageSize]);

  const productRows = useMemo(
    () => (upload.products ?? []).map((product) => toProductTableRow(product)),
    [upload.products],
  );

  const headers = Array.isArray(upload.detectedHeaders)
    ? (upload.detectedHeaders as string[])
    : [];
  const errors = Array.isArray(upload.errorDetails)
    ? (upload.errorDetails as Array<{ rowNumber?: number; message?: string }>)
    : [];

  const rangeStart = productCount === 0 ? 0 : (productPage - 1) * productPageSize + 1;
  const rangeEnd = Math.min(productPage * productPageSize, productCount);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Upload job
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{upload.fileName}</h1>
            <p className="mt-2 text-sm text-slate-600">Job ID: {upload.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge status={upload.status} />
            <DeleteUploadButton
              uploadId={upload.id}
              fileName={upload.fileName}
              status={upload.status}
              redirectTo="/uploads"
            />
          </div>
        </div>

        {upload.failureReason ? (
          <p className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {upload.failureReason}
          </p>
        ) : null}
      </section>

      <StatsGrid
        items={[
          { label: "Total rows", value: upload.totalRows },
          { label: "Processed rows", value: upload.processedRows },
          { label: "Duplicate rows", value: upload.duplicateRows },
          { label: "Error rows", value: upload.errorRows },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Detected headers</h2>
        {headers.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {headers.map((header) => (
              <span
                key={header}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {header}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Headers will appear once the worker parses the file.</p>
        )}
      </section>

      <InsightPanel insight={upload.insight} />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Processed products</h2>
          <p className="text-sm text-slate-600">
            {productCount === 0
              ? "No normalized rows stored for this upload yet."
              : `Showing ${rangeStart}–${rangeEnd} of ${productCount} normalized rows (page size ${productPageSize}).`}
          </p>
        </div>
        <ProductTable
          rows={productRows}
          emptyMessage="Products will appear when processing completes."
          footer={
            <TablePagination
              pathname={`/uploads/${upload.id}`}
              page={productPage}
              pageSize={productPageSize}
              totalItems={productCount}
              label="Upload products pagination"
            />
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Row-level errors</h2>
        {errors.length ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {errors.map((error, index) => (
              <li key={`${error.rowNumber ?? index}-${error.message ?? "error"}`} className="rounded-xl bg-slate-50 p-3">
                Row {error.rowNumber ?? "-"}: {error.message ?? "Unknown error"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No row-level errors recorded for this upload.</p>
        )}
      </section>
    </div>
  );
}
