import StaffHeader from "@/components/StaffHeader";

const LINKS = [
  { href: "/register", label: "レジ" },
  { href: "/admin", label: "商品管理" },
];

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-dvh md:h-dvh bg-slate-50 md:overflow-hidden">
      <StaffHeader title="レジ" links={LINKS} />
      <div className="flex-1 md:min-h-0">{children}</div>
    </div>
  );
}
