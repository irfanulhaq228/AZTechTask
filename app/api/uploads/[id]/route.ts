import { unlink } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { parsePageParam, parsePageSizeParam, totalPages } from "@/lib/pagination";
import { getUploadDir, serializeUpload } from "@/lib/uploads";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const requestedPage = parsePageParam(url.searchParams.get("page") ?? undefined);
  const pageSize = parsePageSizeParam(url.searchParams.get("pageSize") ?? undefined);

  const upload = await prisma.upload.findUnique({
    where: {
      id,
    },
    include: {
      insight: true,
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
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

  return NextResponse.json({
    upload: serializeUpload({ ...upload, products }),
    productTotal,
    productPage: page,
    productPageSize: pageSize,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const upload = await prisma.upload.findUnique({
    where: {
      id,
    },
  });

  if (!upload) {
    return NextResponse.json({ error: "Upload not found." }, { status: 404 });
  }

  if (upload.status === "PROCESSING") {
    return NextResponse.json(
      {
        error: "Cannot delete while the upload is processing. Wait for it to finish or fail, then try again.",
      },
      { status: 409 },
    );
  }

  const uploadDir = path.resolve(getUploadDir());
  const storedPath = path.resolve(upload.storedPath);

  if (storedPath.startsWith(uploadDir)) {
    try {
      await unlink(storedPath);
    } catch {
      // File may already be missing; continue with DB cleanup.
    }
  }

  await prisma.upload.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}
