import { getServerClient } from "@/lib/supabase";
import type { Product } from "@/types";
import RegisterClient from "./RegisterClient";

// This page reads live product/order state from Supabase on every request.
// Without this, Next.js may statically prerender the page (Full Route Cache)
// since no request-time API is used, causing newly added products or
// order/tag state to never show up until a redeploy.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // A tag stays reserved until its items are handed over at the pickup
  // counter ("served"), not just when the kitchen marks them "ready".
  const { data: pendingItems } = await supabase
    .from("order_items")
    .select("id, tag_number")
    .neq("status", "served");

  return (
    <RegisterClient
      products={(data as Product[]) ?? []}
      initialPendingItems={pendingItems ?? []}
    />
  );
}
