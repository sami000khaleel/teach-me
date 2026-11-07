// Tiny in-memory rate limiter (per IP) — no extra dependency.
// Good enough for a single Render instance; use a shared store (Redis)
// if you ever scale to several instances.
// Relies on app.set("trust proxy", 1) so req.ip is the real client behind Render.

function rateLimit({ windowMs, max, message }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || "unknown";
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res
        .status(429)
        .json({ message: message || "too many attempts, try again later" });
    }
    next();
  };
}

module.exports = rateLimit;
