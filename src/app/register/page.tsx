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

  return <RegisterClient products={(data as Product[]) ?? []} />;
}
