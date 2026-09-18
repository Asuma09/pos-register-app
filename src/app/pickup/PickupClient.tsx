"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { OrderItem } from "@/types";
import ConfirmModal from "@/components/ConfirmModal";

export default function PickupClient({ initialItems }: { initialItems: OrderItem[] }) {
  const [items, setItems] = useState<OrderItem[]>(initialItems);
  const [confirmingServe, setConfirmingServe] = useState<{
    tagNumber: number;
    itemIds: string[];
  } | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("order_items-pickup")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as OrderItem;
            setItems((prev) => {
              const withoutRow = prev.filter((i) => i.id !== row.id);
              // Once an item is handed over ("served") it drops off this screen.
              if (row.status === "served") return withoutRow;
              return [...withoutRow, row].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            });
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as OrderItem;
            setItems((prev) => prev.filter((i) => i.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, OrderItem[]>();
    for (const item of items) {
      const list = map.get(item.tag_number) ?? [];
      list.push(item);
      map.set(item.tag_number, list);
    }
    // Only show tags that have at least one item the kitchen has finished —
    // nothing to hand over yet if everything is still pending.
    return [...map.entries()]
      .filter(([, orderItems]) => orderItems.some((i) => i.status === "ready"))
      .sort((a, b) => a[0] - b[0]);
  }, [items]);

  function requestMarkServed(tagNumber: number, itemIds: string[]) {
    setConfirmingServe({ tagNumber, itemIds });
  }

  async function confirmMarkServed() {
    if (!confirmingServe) return;
    const { itemIds } = confirmingServe;
    setConfirmingServe(null);
    setItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));
    const supabase = getBrowserClient();
    await supabase.from("order_items").update({ status: "served" }).in("id", itemIds);
  }

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grouped.map(([tagNumber, orderItems]) => {
          const allReady = orderItems.every((i) => i.status === "ready");
          const itemIds = orderItems.map((i) => i.id);
          return (
            <div key={tagNumber} className="rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3">
              <div className="text-center">
                <span className="text-5xl font-black tabular-nums">{tagNumber}</span>
              </div>
              <div className="flex flex-col gap-2">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-2 border-b pb-2 ${
                      item.status !== "ready" ? "opacity-50" : ""
                    }`}
                  >
                    <div>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-slate-500 tabular-nums">x{item.quantity}</div>
                    </div>
                    <span
                      className={`text-xs font-semibold rounded-full px-2 py-1 ${
                        item.status === "ready"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.status === "ready" ? "準備完了" : "調理中"}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => requestMarkServed(tagNumber, itemIds)}
                disabled={!allReady}
                className="bg-emerald-600 text-white text-sm rounded-lg px-3 py-3 font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allReady ? "提供する" : "調理中の商品があります"}
              </button>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <div className="col-span-full text-center text-slate-500 p-12">
            現在、受け渡し待ちの注文はありません
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmingServe !== null}
        message={confirmingServe ? `札 ${confirmingServe.tagNumber} 番を提供済みにしますか？` : ""}
        confirmLabel="提供済みにする"
        onConfirm={confirmMarkServed}
        onCancel={() => setConfirmingServe(null)}
      />
    </main>
  );
}
