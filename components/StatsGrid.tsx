type StatsGridProps = {
  items: Array<{
    label: string;
    value: string | number;
  }>;
};

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
