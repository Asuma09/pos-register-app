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
    .select("id, tag_number")
    .eq("status", "pending");

  return (
    <RegisterClient
      products={(data as Product[]) ?? []}
      initialPendingItems={pendingItems ?? []}
    />
  );
}
