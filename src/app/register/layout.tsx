import StaffHeader from "@/components/StaffHeader";

const LINKS = [
  { href: "/register", label: "レジ" },
  { href: "/admin", label: "商品管理" },
];

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <StaffHeader title="レジ" links={LINKS} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
