"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import type { OrderItem } from "@/types";

export default function KitchenClient({ initialItems }: { initialItems: OrderItem[] }) {
  const [items, setItems] = useState<OrderItem[]>(initialItems);

  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("order_items-kitchen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as OrderItem;
            setItems((prev) => {
              const withoutRow = prev.filter((i) => i.id !== row.id);
              if (row.status !== "pending") return withoutRow;
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
      const list = map.get(item.order_number) ?? [];
      list.push(item);
      map.set(item.order_number, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  async function markReady(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const supabase = getBrowserClient();
    await supabase.from("order_items").update({ status: "ready" }).eq("id", id);
  }

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grouped.map(([orderNumber, orderItems]) => (
          <div key={orderNumber} className="rounded-xl border bg-white shadow-sm p-4 flex flex-col gap-3">
            <div className="font-bold text-lg">注文 #{orderNumber}</div>
            <div className="flex flex-col gap-2">
              {orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b pb-2">
                  <div>
                    <div className="font-medium">{item.product_name}</div>
                    <div className="text-xs text-slate-500 tabular-nums">x{item.quantity}</div>
                  </div>
                  <button
                    onClick={() => markReady(item.id)}
                    className="bg-emerald-600 text-white text-sm rounded-lg px-3 py-2 font-semibold hover:bg-emerald-700"
                  >
                    提供可にする
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="col-span-full text-center text-slate-500 p-12">
            現在、未提供の注文はありません
          </div>
        )}
      </div>
    </main>
  );
}
