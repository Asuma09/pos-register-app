import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function StaffHeader({ title }: { title: string }) {
  return (
    <header className="border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <span className="font-bold">{title}</span>
          <nav className="flex gap-3 text-sm text-slate-600">
            <Link href="/register" className="hover:text-slate-900">レジ</Link>
            <Link href="/kitchen" className="hover:text-slate-900">厨房</Link>
            <Link href="/admin" className="hover:text-slate-900">商品管理</Link>
          </nav>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
