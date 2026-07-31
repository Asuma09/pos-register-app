import { getServerClient } from "@/lib/supabase";
import type { Product } from "@/types";
import RegisterClient from "./RegisterClient";

export default async function RegisterPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  const { data: pendingItems } = await supabase
    .from("order_items")
    .select("tag_number")
    .eq("status", "pending");

  const usedTags = [...new Set((pendingItems ?? []).map((i) => i.tag_number as number))];

  return <RegisterClient products={(data as Product[]) ?? []} initialUsedTags={usedTags} />;
}
