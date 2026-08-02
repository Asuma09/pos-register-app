import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

const SCREENS = [
  { href: "/register", label: "レジ", desc: "商品選択・会計" },
  { href: "/kitchen", label: "厨房", desc: "注文一覧・提供可にする" },
  { href: "/pickup", label: "受け渡し", desc: "番号札単位で提供する" },
  { href: "/admin", label: "商品管理", desc: "商品の追加・削除" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-md p-6 mt-16 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">会計アプリ</h1>
        <LogoutButton />
      </div>
      <div className="flex flex-col gap-3">
        {SCREENS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl border bg-white shadow-sm p-4 hover:border-slate-400"
          >
            <div className="font-semibold">{s.label}</div>
            <div className="text-sm text-slate-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
