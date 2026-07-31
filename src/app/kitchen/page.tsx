import { getServerClient } from "@/lib/supabase";
import type { OrderItem } from "@/types";
import KitchenClient from "./KitchenClient";

export default async function KitchenPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("order_items")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return <KitchenClient initialItems={(data as OrderItem[]) ?? []} />;
}
