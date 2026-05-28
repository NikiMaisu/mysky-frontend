// Browser-side API client. All requests target Next.js route handlers under
// /api/*, which proxy to the Spring backend and attach the JWT from the
// httpOnly cookie. The browser never talks to the backend directly.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiInit = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { body, headers, ...rest } = init;

  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    throw new ApiError(response.status, parsed, `${response.status} ${response.statusText}`);
  }

  return parsed as T;
}
