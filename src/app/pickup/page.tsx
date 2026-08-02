import { getServerClient } from "@/lib/supabase";
import type { OrderItem } from "@/types";
import PickupClient from "./PickupClient";

// Always fetch live order-item state; without this Next.js may statically
// prerender the page since no request-time API is used here.
export const dynamic = "force-dynamic";

export default async function PickupPage() {
  const supabase = getServerClient();
  // Include both "pending" and "ready" items so staff can see which tags
  // are still incomplete (some items still being prepared) as well as
  // which tags are fully ready to hand over.
  const { data } = await supabase
    .from("order_items")
    .select("*")
    .in("status", ["pending", "ready"])
    .order("created_at", { ascending: true });

  return <PickupClient initialItems={(data as OrderItem[]) ?? []} />;
}
