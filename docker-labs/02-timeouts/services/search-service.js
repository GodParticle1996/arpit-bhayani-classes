/* search-service (ex1) — restaurants dhoondhti hai, phir analytics se "aaj X orders" jodti hai.
   TIMEOUT_MS=0   → koi timeout nahi (khatarnak)
   TIMEOUT_MS=300 → 300 ms ke baad chhod do
   FALLBACK=1     → timeout par count ki jagah default (null) bhejo, results phir bhi do */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
const PORT = 4402, SVC = 'search-service';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 0);
const FALLBACK = process.env.FALLBACK === '1';
let waiting = 0;

app.get('/search', async (req, res) => {
  const t0 = Date.now();
  const results = [{ id: 'r1', name: 'Meghana Foods' }, { id: 'r2', name: 'Truffles' }, { id: 'r3', name: 'Empire' }];
  waiting++;
  try {
    const counts = await callJson(`http://${host('analytics-service')}:4401/v1/order-counts?ids=r1,r2,r3`, { timeoutMs: TIMEOUT_MS });
    results.forEach(r => { r.ordersToday = counts[r.id]; });
    res.json({ tookMs: Date.now() - t0, results });
  } catch (e) {
    log(SVC, '⚠️ analytics call fail:', e.message);
    if (FALLBACK) {
      results.forEach(r => { r.ordersToday = null; });
      res.json({ tookMs: Date.now() - t0, degraded: true, note: 'analytics nahi mila — count chhupa diya, results diye', results });
    } else {
      res.status(504).json({ tookMs: Date.now() - t0, error: 'search fail: ' + e.message });
    }
  } finally { waiting--; }
});
app.get('/stats', (req, res) => res.json({ waitingOnAnalytics: waiting, timeoutMs: TIMEOUT_MS, fallback: FALLBACK }));
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/search  (TIMEOUT_MS=${TIMEOUT_MS || 'none'}, FALLBACK=${FALLBACK})`));
