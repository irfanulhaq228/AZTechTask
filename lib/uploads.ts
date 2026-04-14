import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import type { Product, Upload, UploadInsight } from "@/generated/prisma/client";

export const MAX_UPLOAD_SIZE_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? "10") * 1024 * 1024;

export function getUploadDir() {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

export async function ensureUploadDir() {
  await mkdir(getUploadDir(), { recursive: true });
}

export function isCsvLike(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    lowerName.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel"
  );
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function persistUploadFile(file: File) {
  await ensureUploadDir();

  const extension = path.extname(file.name) || ".csv";
  const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const storedPath = path.join(getUploadDir(), storedFileName);

  await writeFile(storedPath, Buffer.from(await file.arrayBuffer()));

  return {
    storedPath,
    originalName: sanitizeFileName(file.name),
  };
}

function normalizeJsonValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, normalizeJsonValue(nested)]),
    );
  }

  return value;
}

export type SerializedProduct = {
  id: string;
  uploadId: string;
  rowNumber: number;
  nameNormalized: string | null;
  priceNormalized: number | null;
  slug: string | null;
  dedupeKey: string | null;
  rawData: Record<string, unknown>;
  cleanData: Record<string, unknown>;
  createdAt: string;
};

export type SerializedInsight = {
  id: string;
  uploadId: string;
  summary: string;
  issues: unknown;
  stats: unknown;
  model: string;
  generatedAt: string;
};

export type SerializedUpload = {
  id: string;
  fileName: string;
  storedPath: string;
  status: string;
  uploadedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  detectedHeaders: unknown;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  duplicateRows: number;
  failureReason: string | null;
  errorDetails: unknown;
  insight?: SerializedInsight | null;
  products?: SerializedProduct[];
};

export function serializeProduct(product: Product): SerializedProduct {
  return {
    id: product.id,
    uploadId: product.uploadId,
    rowNumber: product.rowNumber,
    nameNormalized: product.nameNormalized,
    priceNormalized: product.priceNormalized,
    slug: product.slug,
    dedupeKey: product.dedupeKey,
    rawData: normalizeJsonValue(product.rawData) as Record<string, unknown>,
    cleanData: normalizeJsonValue(product.cleanData) as Record<string, unknown>,
    createdAt: product.createdAt.toISOString(),
  };
}

export function serializeInsight(insight: UploadInsight | null | undefined) {
  if (!insight) {
    return null;
  }

  return {
    id: insight.id,
    uploadId: insight.uploadId,
    summary: insight.summary,
    issues: normalizeJsonValue(insight.issues),
    stats: normalizeJsonValue(insight.stats),
    model: insight.model,
    generatedAt: insight.generatedAt.toISOString(),
  } satisfies SerializedInsight;
}

export function serializeUpload(
  upload: Upload & { insight?: UploadInsight | null; products?: Product[] },
): SerializedUpload {
  return {
    id: upload.id,
    fileName: upload.fileName,
    storedPath: upload.storedPath,
    status: upload.status,
    uploadedAt: upload.uploadedAt.toISOString(),
    startedAt: upload.startedAt?.toISOString() ?? null,
    completedAt: upload.completedAt?.toISOString() ?? null,
    detectedHeaders: normalizeJsonValue(upload.detectedHeaders),
    totalRows: upload.totalRows,
    processedRows: upload.processedRows,
    errorRows: upload.errorRows,
    duplicateRows: upload.duplicateRows,
    failureReason: upload.failureReason,
    errorDetails: normalizeJsonValue(upload.errorDetails),
    insight: serializeInsight(upload.insight),
    products: upload.products?.map(serializeProduct),
  };
}
