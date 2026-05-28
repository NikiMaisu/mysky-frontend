import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/backend";
import { setAuthCookies } from "@/lib/auth-cookies";
import type { AuthResponse } from "@/types";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const upstream = await fetch(`${BACKEND_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new NextResponse(text || "Login failed", { status: upstream.status });
  }

  const data = (await upstream.json()) as AuthResponse;

  await setAuthCookies({
    accessToken: data.accessToken,
    accessTokenMaxAgeSeconds: data.accessTokenExpiresInSeconds,
    refreshToken: data.refreshToken,
    refreshTokenMaxAgeSeconds: data.refreshTokenExpiresInSeconds,
  });

  return NextResponse.json({ user: data.user });
}
