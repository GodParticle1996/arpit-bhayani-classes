/* ex2 — cascading chain: gateway(4611) → order(4612) → pricing(4613) → tax(4614)
   ROLE=gateway|order|pricing. BREAKER=1 → pricing mein circuit breaker (tax ke liye). */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
const ROLE = process.env.ROLE;
const MAP = { gateway: [4611, 'order', 4612], order: [4612, 'pricing', 4613], pricing: [4613, 'tax', 4614] };
const [PORT, NEXT, NEXT_PORT] = MAP[ROLE];
/* timeout budget: upar ki service ka timeout neeche wali se LAMBA — warna upar wala pehle haar maan leta hai
   aur neeche ka fallback kabhi user tak pahunchta hi nahi. TIMEOUT_MS sirf pricing → tax ka hai. */
const T = ROLE === 'gateway' ? 8000 : ROLE === 'order' ? 7000 : Number(process.env.TIMEOUT_MS || 1000);
let inflight = 0, served = 0, failed = 0, fastFails = 0;

/* circuit breaker: 3 lagataar failures → OPEN 10 s (turant fallback) → HALF-OPEN (ek trial) */
const br = { state: 'CLOSED', fails: 0, openedAt: 0 };
const breakerOn = ROLE === 'pricing' && process.env.BREAKER === '1';
async function callNext() {
  if (breakerOn) {
    if (br.state === 'OPEN' && Date.now() - br.openedAt > 10000) { br.state = 'HALF_OPEN'; log(ROLE, '🟡 breaker HALF_OPEN — ek trial request'); }
    if (br.state === 'OPEN') { fastFails++; const e = new Error('breaker OPEN — tax call skip'); e.breaker = true; throw e; }
  }
  try {
    const r = await callJson(`http://${host(NEXT)}:${NEXT_PORT}/work`, { method: 'POST', timeoutMs: T });
    if (breakerOn) { if (br.state !== 'CLOSED') log(ROLE, '🟢 breaker CLOSED'); br.state = 'CLOSED'; br.fails = 0; }
    return r;
  } catch (e) {
    if (breakerOn && !e.breaker) {
      br.fails++;
      if (br.state === 'HALF_OPEN' || br.fails >= 3) { br.state = 'OPEN'; br.openedAt = Date.now(); log(ROLE, `🔴 breaker OPEN (${br.fails} failures)`); }
    }
    throw e;
  }
}
app.post('/work', async (req, res) => {
  const t0 = Date.now();
  inflight++;
  try {
    const r = await callNext();
    served++;
    res.json({ service: ROLE, ms: Date.now() - t0, downstream: r });
  } catch (e) {
    if (ROLE === 'pricing' && breakerOn) {
      served++;
      return res.json({ service: ROLE, ms: Date.now() - t0, fallback: 'tax estimate 5% (tax-service unavailable)', breaker: br.state });
    }
    failed++;
    res.status(502).json({ service: ROLE, ms: Date.now() - t0, error: `${NEXT}: ${e.message}` });
  } finally { inflight--; }
});
app.get('/stats', (req, res) => res.json({ service: ROLE, inflight, served, failed, fastFails, breaker: breakerOn ? br.state : 'off' }));
app.listen(PORT, () => log(ROLE, `:${PORT}/work → ${NEXT}  timeout=${T}ms  breaker=${breakerOn}`));
