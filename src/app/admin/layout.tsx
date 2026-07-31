import StaffHeader from "@/components/StaffHeader";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <StaffHeader title="商品管理" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
