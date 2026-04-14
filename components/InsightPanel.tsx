import { normalizeIssues, normalizeStats } from "@/lib/insights";
import type { SerializedInsight } from "@/lib/uploads";

type InsightPanelProps = {
  insight: SerializedInsight | null | undefined;
};

export function InsightPanel({ insight }: InsightPanelProps) {
  if (!insight) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Insights will appear after the worker finishes processing the upload.
      </section>
    );
  }

  const issues = normalizeIssues(insight.issues);
  const stats = normalizeStats(insight.stats);

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          AI insights ({insight.model})
        </p>
        <p className="mt-2 text-base text-slate-700">{insight.summary}</p>
      </div>

      {stats.commonValues?.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Most common values</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {stats.commonValues.map((entry) => (
              <div key={entry.field} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">{entry.field}</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {entry.values.map((value) => (
                    <li key={`${entry.field}-${value.value}`}>
                      {value.value || "(empty)"}: {value.count}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {issues.length ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Detected issues</h3>
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={`${issue.label}-${issue.detail}`} className="rounded-xl bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">{issue.label}</p>
                <p className="mt-1 text-sm text-amber-800">{issue.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
