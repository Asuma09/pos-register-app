import StaffHeader from "@/components/StaffHeader";

export default function PickupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <StaffHeader title="受け渡し" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
