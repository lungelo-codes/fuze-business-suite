/**
 * Simple in-memory sliding-window rate limiter.
 * For multi-instance deployments (multiple Vercel Edge regions) consider
 * upgrading to an Upstash Redis-backed limiter — the interface is identical.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired entries every 5 minutes to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store.entries()) {
      if (now > win.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * @param key      Unique key — e.g. `login:${ip}` or `signup:${ip}`
 * @param limit    Max requests allowed in the window
 * @param windowMs Window duration in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    const win: Window = { count: 1, resetAt: now + windowMs };
    store.set(key, win);
    return { allowed: true, remaining: limit - 1, resetAt: win.resetAt };
  }

  existing.count += 1;
  const allowed = existing.count <= limit;
  return { allowed, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

/** Extracts the best available client IP from a Next.js Request */
export function getClientIp(req: Request): string {
  const headers = [
    "x-real-ip",
    "x-forwarded-for",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
  ];
  for (const h of headers) {
    const val = (req.headers as Headers).get(h);
    if (val) return val.split(",")[0].trim();
  }
  return "unknown";
}

/** Returns a 429 Response ready to return from an API route */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
