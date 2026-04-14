"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type DeleteUploadButtonProps = {
  uploadId: string;
  fileName: string;
  status: string;
  /** Where to navigate after a successful delete. */
  redirectTo?: string;
  /** Smaller style for table rows. */
  compact?: boolean;
};

export function DeleteUploadButton({
  uploadId,
  fileName,
  status,
  redirectTo = "/uploads",
  compact = false,
}: DeleteUploadButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isProcessing = status === "PROCESSING";

  async function handleDelete() {
    setError(null);

    const confirmed = window.confirm(
      `Delete "${fileName}"?\n\nThis removes the upload record, processed products, insights, and the stored CSV file. This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/uploads/${uploadId}`, {
          method: "DELETE",
        });

        const data = (await response.json().catch(() => ({}))) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Delete failed.");
        }

        router.push(redirectTo);
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Delete failed.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isProcessing || isPending}
        title={
          isProcessing
            ? "Wait until processing finishes, or try again in a moment."
            : "Delete this upload and its data"
        }
        className={`rounded-full font-medium text-rose-700 underline decoration-rose-300 underline-offset-4 transition hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline ${
          compact ? "text-xs" : "text-sm"
        }`}
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error ? <span className="max-w-48 text-xs text-rose-600">{error}</span> : null}
    </div>
  );
}
