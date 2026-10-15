// Tiny in-memory fixed-window rate limiter (per server instance).
// Good enough to slow down password guessing on a hobby deployment.
// For serious traffic also enable your host's WAF/rate-limit rules.
const hits = new Map<string, { start: number; count: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "local").trim().slice(0, 64);
}

/** Returns a 429 Response when the limit is exceeded, otherwise null. */
export function rateLimit(req: Request, bucket: string, max: number, windowMs = 60_000): Response | null {
  const now = Date.now();
  const key = `${bucket}:${clientIp(req)}`;
  const cur = hits.get(key);
  if (!cur || now - cur.start > windowMs) {
    if (hits.size >= 5000 && !hits.has(key)) hits.delete(hits.keys().next().value!);
    hits.set(key, { start: now, count: 1 });
  } else {
    cur.count++;
    if (cur.count > max) {
      const retry = Math.ceil((windowMs - (now - cur.start)) / 1000);
      return Response.json(
        { error: `too many attempts, try again in ${retry}s` },
        { status: 429, headers: { "Retry-After": String(retry) } },
      );
    }
  }
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  }
  return null;
}
