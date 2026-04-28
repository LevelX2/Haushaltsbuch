"use client";

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; details?: unknown } | null;
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
