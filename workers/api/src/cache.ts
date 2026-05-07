import type { Env } from "./types";

export async function withCache<T>(
  env: Env,
  key: string,
  bypass: boolean,
  loader: () => Promise<T>
): Promise<T> {
  if (!bypass) {
    const hit = await env.CACHE.get(key, "json");
    if (hit !== null) return hit as T;
  }
  const value = await loader();
  const ttl = parseInt(env.CACHE_TTL_SECONDS ?? "1800", 10);
  // KV requires expirationTtl >= 60. Use ctx.waitUntil-compatible non-blocking write.
  await env.CACHE.put(key, JSON.stringify(value), {
    expirationTtl: Math.max(60, ttl),
  });
  return value;
}

export function cacheKey(parts: Array<string | number | undefined>): string {
  return parts
    .filter((p) => p !== undefined && p !== "")
    .map((p) => String(p))
    .join("|");
}
