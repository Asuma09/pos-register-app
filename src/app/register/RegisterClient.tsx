"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { OrderItem, Product } from "@/types";
import { TAG_NUMBERS } from "@/types";

type CartLine = {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
};

const QUICK_CASH_AMOUNTS = [1000, 5000, 10000];

export default function RegisterClient({
  products,
  initialPendingItems,
}: {
  products: Product[];
  initialPendingItems: { id: string; tag_number: number }[];
}) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [tagNumber, setTagNumber] = useState<number | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null);
  const [pendingTagsById, setPendingTagsById] = useState<Map<string, number>>(
    new Map(initialPendingItems.map((i) => [i.id, i.tag_number]))
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
              // A tag stays reserved while its item is "pending" or "ready" —
              // it's only freed once the item has been handed over ("served").
              if (row.status === "served") {
                next.delete(row.id);
              } else {
                next.set(row.id, row.tag_number);
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
  const changeAmount = receivedAmount !== null ? receivedAmount - totalAmount : null;
  const cashShortfall = receivedAmount === null || receivedAmount < totalAmount;

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

  function setLineQuantity(productId: string, raw: string) {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing || raw === "") return prev;
      const quantity = Math.max(1, Math.floor(Number(raw)) || 1);
      return { ...prev, [productId]: { ...existing, quantity } };
    });
  }

  function setLineUnitPrice(productId: string, raw: string) {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing || raw === "") return prev;
      const unitPrice = Math.max(0, Math.floor(Number(raw)) || 0);
      return { ...prev, [productId]: { ...existing, unitPrice } };
    });
  }

  function removeLine(productId: string) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function pressReceivedDigit(digits: string) {
    setReceivedAmount((prev) => {
      const current = prev === null ? "" : String(prev);
      const next = (current + digits).replace(/^0+(?=\d)/, "");
      // Cap length to avoid runaway taps producing an unusable number.
      if (next.length > 9) return prev;
      return next === "" ? null : Number(next);
    });
  }

  function backspaceReceived() {
    setReceivedAmount((prev) => {
      if (prev === null) return null;
      const next = String(prev).slice(0, -1);
      return next === "" ? null : Number(next);
    });
  }

  function clearReceived() {
    setReceivedAmount(null);
  }

  async function checkout() {
    if (lines.length === 0 || tagNumber === null || cashShortfall) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_method: "cash",
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
      setTagNumber(null);
      setReceivedAmount(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "会計に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl md:h-full p-3 flex flex-col gap-2 md:overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:flex-1 md:min-h-0">
        {/* 商品: 左上・少し小さめ */}
        <section className="md:col-span-5 md:min-h-0 md:overflow-y-auto">
          <h2 className="font-bold mb-1 text-sm">商品</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="rounded-lg border bg-white shadow-sm p-2 text-left hover:border-slate-400 active:scale-[0.98] transition"
              >
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-slate-600 text-xs tabular-nums">¥{p.price.toLocaleString()}</div>
              </button>
            ))}
            {products.length === 0 && (
              <div className="col-span-full text-center text-slate-500 p-8 text-sm">
                商品が登録されていません。商品管理画面から追加してください。
              </div>
            )}
          </div>
        </section>

        {/* お預かりテンキー: 右・少し大きめ(押し間違い防止) */}
        <section className="md:col-span-7 rounded-xl border bg-white shadow-sm p-3 flex flex-col gap-2 md:min-h-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-lg">お預かり</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tabular-nums">
                ¥{(receivedAmount ?? 0).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={backspaceReceived}
                aria-label="お預かり金額を1桁削除"
                className="w-11 h-11 rounded-lg border bg-white text-slate-500 text-xl hover:border-slate-400"
              >
                ⌫
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 flex-1 md:min-h-0">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => pressReceivedDigit(String(n))}
                className="min-h-14 rounded-lg border bg-white text-2xl font-semibold tabular-nums hover:border-slate-400 active:scale-[0.98] transition"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={clearReceived}
              className="min-h-14 rounded-lg border bg-white text-xl font-semibold text-rose-600 hover:border-rose-400 active:scale-[0.98] transition"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => pressReceivedDigit("0")}
              className="min-h-14 rounded-lg border bg-white text-2xl font-semibold tabular-nums hover:border-slate-400 active:scale-[0.98] transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => pressReceivedDigit("00")}
              className="min-h-14 rounded-lg border bg-white text-2xl font-semibold tabular-nums hover:border-slate-400 active:scale-[0.98] transition"
            >
              00
            </button>
          </div>

          <div className="flex gap-1.5">
            {QUICK_CASH_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setReceivedAmount(amount)}
                className="flex-1 rounded-lg border bg-white py-1.5 text-sm hover:border-slate-400"
              >
                ¥{amount.toLocaleString()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReceivedAmount(totalAmount)}
              className="flex-1 rounded-lg border bg-white py-1.5 text-sm hover:border-slate-400"
            >
              ぴったり
            </button>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">お釣り</span>
            {changeAmount !== null && changeAmount >= 0 ? (
              <span className="font-bold text-lg tabular-nums">¥{changeAmount.toLocaleString()}</span>
            ) : (
              <span className="text-rose-700 font-bold text-lg tabular-nums">
                {changeAmount !== null ? `¥${Math.abs(changeAmount).toLocaleString()} 不足` : "-"}
              </span>
            )}
          </div>
        </section>
      </div>

      {/* カート明細・札番号・会計確定: 下段に全幅で表示 */}
      <section className="rounded-xl border bg-white shadow-sm p-3 flex flex-col gap-1.5 md:shrink-0">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-bold">カート</span>
          <span className="text-slate-500">{totalCount}点</span>
          <span className="font-bold tabular-nums">合計 ¥{totalAmount.toLocaleString()}</span>
        </div>

        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
          {lines.map((l) => (
            <div key={l.productId} className="flex items-center gap-1 text-sm border-b pb-1">
              <div className="font-medium truncate w-24 shrink-0">{l.name}</div>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={l.quantity}
                onChange={(e) => setLineQuantity(l.productId, e.target.value)}
                aria-label={`${l.name}の数量`}
                className="w-12 border rounded px-1 py-0.5 text-center tabular-nums"
              />
              <span className="text-slate-400">個 ×¥</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={l.unitPrice}
                onChange={(e) => setLineUnitPrice(l.productId, e.target.value)}
                aria-label={`${l.name}の単価`}
                className="w-16 border rounded px-1 py-0.5 text-right tabular-nums"
              />
              <span className="ml-auto font-semibold tabular-nums">
                ¥{(l.unitPrice * l.quantity).toLocaleString()}
              </span>
              <button
                onClick={() => removeLine(l.productId)}
                aria-label={`${l.name}をカートから削除`}
                className="shrink-0 w-6 h-6 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                ×
              </button>
            </div>
          ))}
          {lines.length === 0 && (
            <div className="text-sm text-slate-500 py-1 text-center">商品を選択してください</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium shrink-0">札番号</span>
          <div className="grid grid-cols-10 gap-1 flex-1">
            {TAG_NUMBERS.map((n) => {
              const disabled = usedTags.has(n) && tagNumber !== n;
              const selected = tagNumber === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTagNumber(n)}
                  disabled={disabled}
                  className={`rounded-lg border py-1 text-sm font-semibold tabular-nums ${
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

        <button
          onClick={checkout}
          disabled={lines.length === 0 || tagNumber === null || cashShortfall || submitting}
          className="bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
        >
          {submitting ? "処理中..." : "会計確定"}
        </button>

        {err && <div className="text-rose-700 text-sm">{err}</div>}
        {lastTagNumber !== null && (
          <div className="text-emerald-700 text-sm bg-emerald-50 rounded p-1.5">
            札 {lastTagNumber} 番の注文を厨房に送信しました
          </div>
        )}
      </section>
    </main>
  );
}
