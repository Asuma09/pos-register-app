"use client";

import { useState } from "react";
import type { Product } from "@/types";

export default function ProductManager({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    if (res.ok) {
      const body = await res.json();
      setProducts(body.products ?? []);
    }
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmedName = name.trim();
    const priceNum = Number(price);
    if (!trimmedName) {
      setErr("商品名を入力してください");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setErr("価格を正しく入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, price: priceNum }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "追加に失敗しました");
      }
      setName("");
      setPrice("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "追加に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("この商品を削除しますか？")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <main className="mx-auto max-w-2xl p-4 flex flex-col gap-4">
      <form
        onSubmit={addProduct}
        className="flex flex-wrap gap-2 items-end rounded-xl border bg-white p-4 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-[160px]">
          <span>商品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            placeholder="例: からあげ"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm w-32">
          <span>価格（円）</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
            placeholder="300"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          追加
        </button>
        {err && <div className="w-full text-rose-700 text-sm">{err}</div>}
      </form>

      <section className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">商品名</th>
              <th className="p-2">価格</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 tabular-nums">¥{p.price.toLocaleString()}</td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => deleteProduct(p.id)}
                    className="text-xs border rounded px-2 py-1 hover:bg-rose-50 text-rose-700 border-rose-200"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500">
                  商品がまだ登録されていません。上のフォームから追加してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
