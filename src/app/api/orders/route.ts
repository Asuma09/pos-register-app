import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import type { PaymentMethod } from "@/types";

type OrderItemInput = { product_name?: string; unit_price?: number; quantity?: number };

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["cash", "credit_card", "e_money"];

export async function POST(req: Request) {
  let body: { payment_method?: string; tag_number?: number; items?: OrderItemInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const paymentMethod = body.payment_method as PaymentMethod;
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "支払い方法が不正です" }, { status: 400 });
  }

  const tagNumber = Number(body.tag_number);
  if (!Number.isInteger(tagNumber) || tagNumber < 1 || tagNumber > 20) {
    return NextResponse.json({ error: "札番号が不正です" }, { status: 400 });
  }

  const items = (body.items ?? [])
    .map((i) => ({
      product_name: (i.product_name ?? "").trim(),
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
    }))
    .filter((i) => i.product_name && Number.isFinite(i.unit_price) && Number.isInteger(i.quantity) && i.quantity > 0);

  if (items.length === 0) {
    return NextResponse.json({ error: "カートが空です" }, { status: 400 });
  }

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const supabase = getServerClient();

  // A tag is in use until its items are handed over at pickup ("served"),
  // not just while the kitchen is still preparing them.
  const { data: inUse, error: inUseError } = await supabase
    .from("order_items")
    .select("id")
    .eq("tag_number", tagNumber)
    .neq("status", "served")
    .limit(1);
  if (inUseError) return NextResponse.json({ error: inUseError.message }, { status: 400 });
  if (inUse && inUse.length > 0) {
    return NextResponse.json({ error: "この札は使用中です" }, { status: 409 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({ payment_method: paymentMethod, total_amount: totalAmount, tag_number: tagNumber })
    .select()
    .single();
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(
      items.map((i) => ({
        ...i,
        order_id: order.id,
        order_number: order.order_number,
        tag_number: tagNumber,
      }))
    );
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

  return NextResponse.json({ order });
}
