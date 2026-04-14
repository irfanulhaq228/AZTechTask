import type { ReactNode } from "react";
import Link from "next/link";

import { DeleteUploadButton } from "@/components/DeleteUploadButton";
import { StatusBadge } from "@/components/StatusBadge";
import type { SerializedUpload } from "@/lib/uploads";

type UploadListProps = {
  uploads: SerializedUpload[];
  footer?: ReactNode;
  /** Router path after a successful delete (default `/uploads`). */
  afterDeleteHref?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UploadList({ uploads, footer, afterDeleteHref = "/uploads" }: UploadListProps) {
  if (uploads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        No uploads yet. Add a CSV to start a processing job.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">File</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Uploaded</th>
            <th className="px-4 py-3 font-medium">Rows</th>
            <th className="px-4 py-3 font-medium">Details</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {uploads.map((upload) => (
            <tr key={upload.id}>
              <td className="px-4 py-3 font-medium text-slate-900">{upload.fileName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={upload.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(upload.uploadedAt)}</td>
              <td className="px-4 py-3 text-slate-600">
                {upload.processedRows}/{upload.totalRows}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/uploads/${upload.id}`}
                  className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                >
                  Open job
                </Link>
              </td>
              <td className="px-4 py-3 align-top">
                <DeleteUploadButton
                  uploadId={upload.id}
                  fileName={upload.fileName}
                  status={upload.status}
                  redirectTo={afterDeleteHref}
                  compact
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {footer}
    </div>
  );
}
