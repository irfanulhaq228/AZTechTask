"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type UploadResponse = {
  upload: {
    id: string;
  };
};

export function UploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      startTransition(() => {
        router.push(`/uploads/${data.upload.id}`);
        router.refresh();
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Could not upload the CSV file.",
      );
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">Upload a product CSV</h2>
        <p className="text-sm text-slate-600">
          Headers are detected dynamically, so the file can include different product fields for each import.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-slate-400 hover:bg-slate-100">
        <span className="text-sm font-medium text-slate-700">Choose CSV file</span>
        <span className="mt-1 text-xs text-slate-500">UTF-8, header row required, up to 10 MB</span>
        <span className="mt-3 text-sm text-slate-900">{selectedFileName ?? "No file selected"}</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
        />
      </label>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Uploading..." : "Upload CSV"}
      </button>
    </form>
  );
}
