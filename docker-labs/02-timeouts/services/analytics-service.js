/* analytics-service — "aaj kitne orders" count deti hai.
   SLOW_MS=8000  → DB outage jaisa slow
   MAX_INFLIGHT=20 → isse zyada ek saath requests aayi toh 503 (overload) */
const express = require('express');
const { log, sleep } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4401, SVC = 'analytics-service';
const SLOW_MS = Number(process.env.SLOW_MS || 60);
const MAX_INFLIGHT = Number(process.env.MAX_INFLIGHT || 1000);
let inflight = 0, served = 0, rejected = 0;
const COUNTS = { r1: 1240, r2: 870, r3: 312 };

app.get('/v1/order-counts', async (req, res) => {
  if (inflight >= MAX_INFLIGHT) { rejected++; return res.status(503).json({ error: 'overloaded', inflight }); }
  inflight++;
  try {
    await sleep(SLOW_MS);
    served++;
    const ids = String(req.query.ids || 'r1,r2,r3').split(',');
    res.json(Object.fromEntries(ids.map(id => [id, COUNTS[id] || 0])));
  } finally { inflight--; }
});
app.get('/stats', (req, res) => res.json({ inflight, served, rejected, slowMs: SLOW_MS }));

/* ex3: har 3 second mein counts search-service ko PUSH karo (async ingest) */
if (process.env.PUSH_TO_SEARCH === '1') {
  const target = `http://${process.env.SEARCH_ASYNC_HOST || 'localhost'}:4403/ingest/order-counts`;
  setInterval(async () => {
    Object.keys(COUNTS).forEach(k => { COUNTS[k] += Math.floor(Math.random() * 5); });
    try {
      await fetch(target, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(COUNTS) });
      log(SVC, 'counts push kiye →', JSON.stringify(COUNTS));
    } catch (e) { log(SVC, 'push fail (search-async abhi nahi chal rahi?)', e.message); }
  }, 3000);
}
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/v1/order-counts  (SLOW_MS=${SLOW_MS}, MAX_INFLIGHT=${MAX_INFLIGHT})`));
