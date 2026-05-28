import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/backend";
import { clearAuthCookies, readAccessToken } from "@/lib/auth-cookies";

export async function GET(): Promise<Response> {
  const token = await readAccessToken();
  if (!token) {
    return new NextResponse(null, { status: 401 });
  }

  const upstream = await fetch(`${BACKEND_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (upstream.status === 401) {
    await clearAuthCookies();
    return new NextResponse(null, { status: 401 });
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text || "Upstream error", { status: upstream.status });
  }

  return NextResponse.json(await upstream.json());
}
