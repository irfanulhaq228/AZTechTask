import Link from "next/link";

const links = [
  { href: "/", label: "Upload" },
  { href: "/uploads", label: "Uploads" },
  { href: "/products", label: "Products" },
];

export function NavBar() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-lg font-semibold text-slate-900">CSV Product Processor</p>
          <p className="text-sm text-slate-500">
            Upload product CSV files, process them asynchronously, and review insights.
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
