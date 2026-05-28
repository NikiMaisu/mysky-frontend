// Next.js 16 renamed "middleware" to "proxy" — same machinery, different name.
// We do an OPTIMISTIC auth check here: cookie present → let the request through.
// Real validation happens in the route handlers when they call the backend.

import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth-cookies";

const PUBLIC_PATHS = new Set<string>(["/login"]);

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.has(ACCESS_COOKIE);
  if (hasAccess) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (pathname !== "/") {
    loginUrl.searchParams.set("redirect", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on every page-style request. Excludes:
  //   /api/* — route handlers manage their own auth and return 401 themselves
  //   /_next/* — framework assets
  //   common static files in /public
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
