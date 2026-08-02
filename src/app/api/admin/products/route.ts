import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// GET has no request-time API usage, so Next.js could otherwise cache this
// route handler's response (Full Route Cache) and keep serving a stale
// product list after mutations. Force it to run fresh on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data });
}

export async function POST(req: Request) {
  let body: { name?: string; price?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const price = Number(body.price);
  if (!name) return NextResponse.json({ error: "商品名は必須です" }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "価格が不正です" }, { status: 400 });
  }

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ name, price: Math.round(price) })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ product: data });
}
