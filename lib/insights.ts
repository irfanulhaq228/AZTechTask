export type InsightIssue = {
  label: string;
  detail: string;
};

export type InsightCommonValue = {
  field: string;
  values: Array<{ value: string; count: number }>;
};

export type InsightStats = {
  headers?: string[];
  totalRows?: number;
  processedRows?: number;
  errorRows?: number;
  duplicateRows?: number;
  missingFieldCounts?: Array<{ field: string; count: number }>;
  commonValues?: InsightCommonValue[];
};

export function normalizeIssues(input: unknown): InsightIssue[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      if (typeof record.label !== "string" || typeof record.detail !== "string") {
        return null;
      }

      return {
        label: record.label,
        detail: record.detail,
      };
    })
    .filter((item): item is InsightIssue => item !== null);
}

export function normalizeStats(input: unknown): InsightStats {
  if (!input || typeof input !== "object") {
    return {};
  }

  return input as InsightStats;
}
