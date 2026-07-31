import { getServerClient } from "@/lib/supabase";
import type { Product } from "@/types";
import ProductManager from "./ProductManager";

export default async function AdminPage() {
  const supabase = getServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  return <ProductManager initialProducts={(data as Product[]) ?? []} />;
}
