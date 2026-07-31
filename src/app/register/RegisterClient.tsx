"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { OrderItem, PaymentMethod, Product } from "@/types";
import { PAYMENT_METHOD_LABELS, TAG_NUMBERS } from "@/types";

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

export default function RegisterClient({
  products,
  initialUsedTags,
}: {
  products: Product[];
  initialUsedTags: number[];
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [tagNumber, setTagNumber] = useState<number | null>(null);
  const [pendingTagsById, setPendingTagsById] = useState<Map<string, number>>(
    new Map(initialUsedTags.map((t, i) => [`initial-${i}`, t]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lastTagNumber, setLastTagNumber] = useState<number | null>(null);

  const usedTags = useMemo(() => new Set(pendingTagsById.values()), [pendingTagsById]);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("order_items-register")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as OrderItem;
            setPendingTagsById((prev) => {
              const next = new Map(prev);
              if (row.status === "pending") {
                next.set(row.id, row.tag_number);
              } else {
                next.delete(row.id);
              }
              return next;
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as OrderItem;
            setPendingTagsById((prev) => {
              const next = new Map(prev);
              next.delete(row.id);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const lines = useMemo(() => Object.values(cart), [cart]);
  const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const totalAmount = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  function addToCart(p: Product) {
    setLastTagNumber(null);
    setCart((prev) => {
      const existing = prev[p.id];
      const quantity = (existing?.quantity ?? 0) + 1;
      return {
        ...prev,
        [p.id]: { productId: p.id, name: p.name, unitPrice: p.price, quantity },
      };
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...existing, quantity } };
    });
  }

  async function checkout() {
    if (lines.length === 0 || tagNumber === null) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: paymentMethod,
          tag_number: tagNumber,
          items: lines.map((l) => ({
            product_name: l.name,
            unit_price: l.unitPrice,
            quantity: l.quantity,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "会計に失敗しました");
      }
      const body = await res.json();
      setLastTagNumber(body.order?.tag_number ?? null);
      setCart({});
      setPaymentMethod("cash");
      setTagNumber(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "会計に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <section className="md:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="rounded-xl border bg-white shadow-sm p-4 text-left hover:border-slate-400 active:scale-[0.98] transition"
            >
              <div className="font-semibold">{p.name}</div>
              <div className="text-slate-600 tabular-nums">¥{p.price.toLocaleString()}</div>
            </button>
          ))}
          {products.length === 0 && (
            <div className="col-span-full text-center text-slate-500 p-8">
              商品が登録されていません。商品管理画面から追加してください。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3 h-fit sticky top-16">
        <h2 className="font-bold">カート</h2>

        <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
          {lines.map((l) => (
            <div key={l.productId} className="flex items-center justify-between gap-2 border-b pb-2">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.name}</div>
                <div className="text-xs text-slate-500 tabular-nums">
                  ¥{l.unitPrice.toLocaleString()} x {l.quantity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeQuantity(l.productId, -1)}
                  className="w-7 h-7 rounded border hover:bg-slate-100"
                >
                  −
                </button>
                <span className="w-5 text-center tabular-nums">{l.quantity}</span>
                <button
                  onClick={() => changeQuantity(l.productId, 1)}
                  className="w-7 h-7 rounded border hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          {lines.length === 0 && (
            <div className="text-sm text-slate-500 py-4 text-center">商品を選択してください</div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>商品点数</span>
          <span className="tabular-nums">{totalCount}点</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold">
          <span>合計</span>
          <span className="tabular-nums">¥{totalAmount.toLocaleString()}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">札番号</span>
          <div className="grid grid-cols-5 gap-1">
            {TAG_NUMBERS.map((n) => {
              const disabled = usedTags.has(n) && tagNumber !== n;
              const selected = tagNumber === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTagNumber(n)}
                  disabled={disabled}
                  className={`rounded-lg border py-2 text-sm font-semibold tabular-nums ${
                    selected
                      ? "bg-slate-900 text-white border-slate-900"
                      : disabled
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-white hover:border-slate-400"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">支払い方法</span>
          <div className="flex flex-col gap-1">
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="payment_method"
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                />
                {PAYMENT_METHOD_LABELS[m]}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={checkout}
          disabled={lines.length === 0 || tagNumber === null || submitting}
          className="bg-slate-900 text-white rounded-lg py-3 font-semibold disabled:opacity-50"
        >
          {submitting ? "処理中..." : "会計確定"}
        </button>

        {err && <div className="text-rose-700 text-sm">{err}</div>}
        {lastTagNumber !== null && (
          <div className="text-emerald-700 text-sm bg-emerald-50 rounded p-2">
            札 {lastTagNumber} 番の注文を厨房に送信しました
          </div>
        )}
      </section>
    </main>
  );
}
