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
