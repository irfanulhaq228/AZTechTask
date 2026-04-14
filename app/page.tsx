import { UploadForm } from "@/components/UploadForm";
import { UploadList } from "@/components/UploadList";
import { prisma } from "@/lib/db";
import { serializeUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [uploads, productCount] = await Promise.all([
    prisma.upload.findMany({
      orderBy: {
        uploadedAt: "desc",
      },
      include: {
        insight: true,
      },
      take: 5,
    }),
    prisma.product.count(),
  ]);

  const completedUploads = uploads.filter((upload) => upload.status === "COMPLETED").length;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <UploadForm />

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            System snapshot
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Recent uploads</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{uploads.length}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Completed uploads</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {completedUploads}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-sm text-slate-500">Stored products</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{productCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Latest upload jobs</h2>
          <p className="text-sm text-slate-600">
            Uploads return immediately, then the Python worker picks them up asynchronously.
          </p>
        </div>
        <UploadList uploads={uploads.map(serializeUpload)} afterDeleteHref="/" />
      </section>
    </div>
  );
}
