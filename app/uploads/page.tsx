import { TablePagination } from "@/components/TablePagination";
import { UploadList } from "@/components/UploadList";
import { prisma } from "@/lib/db";
import { parsePageParam, parsePageSizeParam, totalPages } from "@/lib/pagination";
import { serializeUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type UploadsPageProps = {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function UploadsPage({ searchParams }: UploadsPageProps) {
  const query = await searchParams;
  const requestedPage = parsePageParam(query.page);
  const pageSize = parsePageSizeParam(query.pageSize);

  const uploadTotal = await prisma.upload.count();

  const lastPage = totalPages(uploadTotal, pageSize);
  const page = Math.min(requestedPage, lastPage);
  const skip = (page - 1) * pageSize;

  const uploads = await prisma.upload.findMany({
    orderBy: {
      uploadedAt: "desc",
    },
    include: {
      insight: true,
    },
    skip,
    take: pageSize,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload history</h1>
        <p className="text-sm text-slate-600">
          Review file metadata, background processing status, and individual upload details.
        </p>
      </div>

      <UploadList
        uploads={uploads.map(serializeUpload)}
        footer={
          <TablePagination
            pathname="/uploads"
            page={page}
            pageSize={pageSize}
            totalItems={uploadTotal}
            label="Uploads pagination"
          />
        }
      />
    </div>
  );
}
