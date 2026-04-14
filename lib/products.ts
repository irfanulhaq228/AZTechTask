export type ProductTableRow = {
  id: string;
  uploadId: string;
  rowNumber: number;
  nameNormalized: string | null;
  priceNormalized: number | null;
  slug: string | null;
  cleanData: Record<string, unknown>;
};

export function toProductTableRow(
  product: {
    id: string;
    uploadId: string;
    rowNumber: number;
    nameNormalized: string | null;
    priceNormalized: number | null;
    slug: string | null;
    cleanData: unknown;
  },
): ProductTableRow {
  return {
    id: product.id,
    uploadId: product.uploadId,
    rowNumber: product.rowNumber,
    nameNormalized: product.nameNormalized,
    priceNormalized: product.priceNormalized,
    slug: product.slug,
    cleanData: product.cleanData as Record<string, unknown>,
  };
}

export function inferDynamicColumns(rows: ProductTableRow[]) {
  const dynamic = new Set<string>();

  for (const row of rows) {
    Object.keys(row.cleanData ?? {}).forEach((key) => dynamic.add(key));
  }

  return Array.from(dynamic).sort((left, right) => left.localeCompare(right));
}

export function formatCellValue(value: unknown): string {
  if (value == null) {
    return "-";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : "-";
  }

  if (typeof value === "string") {
    return value.trim() || "-";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
