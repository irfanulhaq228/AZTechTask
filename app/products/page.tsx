import Link from "next/link";

import { ProductTable } from "@/components/ProductTable";
import { TablePagination } from "@/components/TablePagination";
import { prisma } from "@/lib/db";
import { parsePageParam, parsePageSizeParam, totalPages } from "@/lib/pagination";
import { toProductTableRow } from "@/lib/products";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<{
    uploadId?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const query = await searchParams;
  const { uploadId } = query;
  const requestedPage = parsePageParam(query.page);
  const pageSize = parsePageSizeParam(query.pageSize);

  const productWhere = uploadId
    ? {
        uploadId,
      }
    : undefined;

  const productTotal = await prisma.product.count({
    where: productWhere,
  });

  const lastPage = totalPages(productTotal, pageSize);
  const page = Math.min(requestedPage, lastPage);
  const skip = (page - 1) * pageSize;

  const [products, uploads] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          rowNumber: "asc",
        },
      ],
      skip,
      take: pageSize,
    }),
    prisma.upload.findMany({
      orderBy: {
        uploadedAt: "desc",
      },
      select: {
        id: true,
        fileName: true,
      },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Processed products</h1>
        <p className="text-sm text-slate-600">
          Dynamic columns are inferred from the cleaned JSON payload stored for each row.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Filter by upload
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/products"
            className={`inline-flex rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              !uploadId
                ? "border-2 border-black bg-slate-900 text-[#ffffff]"
                : "border border-slate-100 bg-slate-100 text-slate-700"
            }`}
          >
            All uploads
          </Link>
          {uploads.map((upload) => (
            <Link
              key={upload.id}
              href={`/products?uploadId=${encodeURIComponent(upload.id)}`}
              className={`inline-flex max-w-full rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                uploadId === upload.id
                  ? "border-2 border-black bg-slate-900 text-[#ffffff]"
                  : "border border-slate-100 bg-slate-100 text-slate-700"
              }`}
            >
              <span className="truncate">{upload.fileName}</span>
            </Link>
          ))}
        </div>
      </section>

      <ProductTable
        rows={products.map((product) => toProductTableRow(product))}
        showUploadId={!uploadId}
        footer={
          <TablePagination
            pathname="/products"
            page={page}
            pageSize={pageSize}
            totalItems={productTotal}
            extraParams={{ uploadId }}
            label="Products pagination"
          />
        }
      />
    </div>
  );
}
