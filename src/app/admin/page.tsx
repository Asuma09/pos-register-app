import { getServerClient } from "@/lib/supabase";
import type { Product } from "@/types";
import ProductManager from "./ProductManager";

// Always fetch live product data — without this Next.js can statically
// prerender the page (no request-time API is used here), causing newly
// added/deleted products to be missing until a redeploy.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  return <ProductManager initialProducts={(data as Product[]) ?? []} />;
}
