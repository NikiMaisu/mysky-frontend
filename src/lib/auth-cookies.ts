// Cookie names + helpers used by route handlers on the server side only.
// The browser cannot read these directly because the cookies are httpOnly.

import { cookies } from "next/headers";

export const ACCESS_COOKIE = "mysky_access";
export const REFRESH_COOKIE = "mysky_refresh";

interface SetTokensInput {
  accessToken: string;
  accessTokenMaxAgeSeconds: number;
  refreshToken: string;
  refreshTokenMaxAgeSeconds: number;
}

const baseOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setAuthCookies(input: SetTokensInput): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, input.accessToken, {
    ...baseOptions,
    maxAge: input.accessTokenMaxAgeSeconds,
  });
  jar.set(REFRESH_COOKIE, input.refreshToken, {
    ...baseOptions,
    maxAge: input.refreshTokenMaxAgeSeconds,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function readAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value;
}
