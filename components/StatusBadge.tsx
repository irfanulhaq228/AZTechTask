type StatusBadgeProps = {
  status: string;
};

const classes: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide ${
        classes[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {status.toLowerCase()}
    </span>
  );
}
