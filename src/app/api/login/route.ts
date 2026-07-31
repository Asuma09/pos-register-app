import { NextResponse } from "next/server";
import { STAFF_COOKIE, signStaffToken } from "@/lib/auth";

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const pw = (body.password ?? "").trim();
  const expected = process.env.STAFF_PASSWORD;
  if (!expected) return NextResponse.json({ error: "STAFF_PASSWORD not set" }, { status: 500 });
  if (pw !== expected) return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });

  const ttlMs = 12 * 60 * 60 * 1000; // 12h
  const token = await signStaffToken(Date.now() + ttlMs);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ttlMs / 1000,
    path: "/",
  });
  return res;
}
