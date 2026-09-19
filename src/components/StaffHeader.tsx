import Link from "next/link";

export default function StaffHeader({
  title,
  links = [],
}: {
  title: string;
  links?: { href: string; label: string }[];
}) {
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <span className="font-bold">{title}</span>
          {links.length > 0 && (
            <nav className="flex gap-3 text-sm text-slate-600">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-slate-900">
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
