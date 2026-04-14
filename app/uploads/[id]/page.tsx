import { notFound } from "next/navigation";

import { UploadDetail } from "@/components/UploadDetail";
import { prisma } from "@/lib/db";
import { parsePageParam, parsePageSizeParam, totalPages } from "@/lib/pagination";
import { serializeUpload } from "@/lib/uploads";

export const dynamic = "force-dynamic";

type UploadDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

export default async function UploadDetailPage({ params, searchParams }: UploadDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const requestedPage = parsePageParam(query.page);
  const pageSize = parsePageSizeParam(query.pageSize);

  const upload = await prisma.upload.findUnique({
    where: {
      id,
    },
    include: {
      insight: true,
    },
  });

  if (!upload) {
    notFound();
  }

  const productTotal = await prisma.product.count({
    where: {
      uploadId: id,
    },
  });

  const lastPage = totalPages(productTotal, pageSize);
  const page = Math.min(requestedPage, lastPage);
  const skip = (page - 1) * pageSize;

  const products = await prisma.product.findMany({
    where: {
      uploadId: id,
    },
    orderBy: {
      rowNumber: "asc",
    },
    skip,
    take: pageSize,
  });

  const detailKey = [
    upload.id,
    page,
    pageSize,
    upload.status,
    upload.processedRows,
    upload.totalRows,
    upload.completedAt?.toISOString() ?? "",
    productTotal,
  ].join(":");

  return (
    <UploadDetail
      key={detailKey}
      initialUpload={serializeUpload({ ...upload, products })}
      productTotal={productTotal}
      productPage={page}
      productPageSize={pageSize}
    />
  );
}
