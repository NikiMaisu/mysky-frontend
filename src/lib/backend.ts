// Server-side helper: where to reach the Spring backend.
// Distinct from NEXT_PUBLIC_API_BASE_URL (which was the browser-facing URL
// before we moved everything behind the Next.js proxy).

export const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8089";
