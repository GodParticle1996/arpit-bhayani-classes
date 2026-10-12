#!/usr/bin/env node
/* Diwali surge: N orders ek saath.   node tools/burst.js 200 [port]   (default port 4621) */
const N = Number(process.argv[2] || 100), PORT = Number(process.argv[3] || 4621);
(async () => {
  const t0 = Date.now();
  const times = await Promise.all(Array.from({ length: N }, async () => {
    const s = Date.now();
    try { const r = await fetch(`http://localhost:${PORT}/orders`, { method: 'POST' }); await r.json(); return Date.now() - s; }
    catch (e) { return -1; }
  }));
  const ok = times.filter(t => t >= 0).sort((a, b) => a - b);
  const p = x => ok[Math.min(ok.length - 1, Math.floor(ok.length * x))] || 0;
  console.log(JSON.stringify({ orders: N, failed: N - ok.length, p50Ms: p(0.5), p99Ms: p(0.99), wallMs: Date.now() - t0 }));
})();
