import { getServerClient } from "@/lib/supabase";
import type { OrderItem } from "@/types";
import KitchenClient from "./KitchenClient";

// Always fetch live pending-order data on load; realtime subscriptions keep
// it in sync afterwards, but the initial server-rendered snapshot must not
// be a stale, statically cached page.
export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("order_items")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return <KitchenClient initialItems={(data as OrderItem[]) ?? []} />;
}
