"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "ログインに失敗しました");
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-white p-6 shadow-sm flex flex-col gap-4">
      <h1 className="text-lg font-bold">スタッフログイン</h1>
      <label className="flex flex-col gap-2">
        <span className="text-sm">パスワード</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border rounded-lg px-3 py-2"
          autoFocus
        />
      </label>
      <button
        type="submit"
        disabled={loading || !pw}
        className="bg-slate-900 text-white rounded-lg py-2 font-semibold disabled:opacity-50"
      >
        {loading ? "..." : "ログイン"}
      </button>
      {err && <div className="text-rose-700 text-sm">{err}</div>}
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm p-6 mt-12">
      <Suspense fallback={<div className="text-slate-500">読み込み中...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
