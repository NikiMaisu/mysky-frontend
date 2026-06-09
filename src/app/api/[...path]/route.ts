import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/backend";
import { readAccessToken } from "@/lib/auth-cookies";

// Catch-all proxy: forwards every other /api/* call to the backend with
// the JWT from the access cookie attached as a Bearer token. /api/auth/*
// is handled by dedicated route files above and does NOT go through here.

const FORWARDED_HEADERS = ["content-type", "accept"];

async function proxy(request: Request, segments: string[]): Promise<Response> {
  const token = await readAccessToken();

  const url = new URL(request.url);
  const targetUrl = `${BACKEND_BASE_URL}/${segments.join("/")}${url.search}`;

  const headers: Record<string, string> = {};
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);

  // Stream the body through unchanged so binary downloads (e.g. .xlsx) aren't
  // corrupted by text decoding; preserve content-type and the download header.
  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) responseHeaders.set("content-disposition", contentDisposition);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, ctx: Ctx)    { return proxy(request, (await ctx.params).path); }
export async function POST(request: Request, ctx: Ctx)   { return proxy(request, (await ctx.params).path); }
export async function PUT(request: Request, ctx: Ctx)    { return proxy(request, (await ctx.params).path); }
export async function PATCH(request: Request, ctx: Ctx)  { return proxy(request, (await ctx.params).path); }
export async function DELETE(request: Request, ctx: Ctx) { return proxy(request, (await ctx.params).path); }
