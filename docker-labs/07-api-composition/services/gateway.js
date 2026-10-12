/* ex2 — KhanaKart API gateway: ek darwaaza, kai kaam.
   1) Auth: header x-api-key (app-android-123 / app-ios-456), warna 401
   2) Rate limit: har key ke RATE_LIMIT requests / 10 s, warna 429
   3) Trace id + ek log line har request ki
   4) GET /payments/:orderId
        STRANGLER=0 → monolith ka ajeeb response, gateway use SAAF shape mein badalta hai
        STRANGLER=1 → naya payment-service (monolith ko pata bhi nahi)
   5) GET /menu/:rid → CACHE=1 par 30 s gateway cache (x-cache: HIT/MISS)
   6) Baaki /api/* → monolith */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 4910, SVC = 'gateway';
const STRANGLER = process.env.STRANGLER === '1';
const CACHE = process.env.CACHE === '1';
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 10);
const MONO = `http://${host('monolith')}:4911`, PAY = `http://${host('payment-service')}:4912`;
const KEYS = { 'app-android-123': 'android', 'app-ios-456': 'ios' };
const app = express();
let seq = 0;
const buckets = {}, cache = {};

app.use((req, res, next) => {
  const trace = `gw-${++seq}`, t0 = Date.now();
  res.set('x-trace-id', trace);
  res.on('finish', () => log(SVC, `${trace} ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - t0} ms) ${res.get('x-served-by') || ''} ${res.get('x-cache') || ''}`));
  next();
});
app.use((req, res, next) => {
  const client = KEYS[req.get('x-api-key')];
  if (!client) return res.status(401).json({ error: 'x-api-key missing ya galat' });
  const now = Date.now();
  const b = buckets[client] = buckets[client] && now - buckets[client].start < 10000 ? buckets[client] : { start: now, used: 0 };
  if (++b.used > RATE_LIMIT) { res.set('retry-after', String(Math.ceil((10000 - (now - b.start)) / 1000))); return res.status(429).json({ error: `rate limit: ${RATE_LIMIT} requests / 10 s` }); }
  req.client = client;
  next();
});

app.get('/payments/:orderId', async (req, res) => {
  if (STRANGLER) {
    const r = await callJson(`${PAY}/payments/${req.params.orderId}`, { timeoutMs: 2000 });
    return res.set('x-served-by', 'payment-service').json(r);
  }
  const raw = await callJson(`${MONO}/legacy/payment?oid=${req.params.orderId}`, { timeoutMs: 2000 });
  res.set('x-served-by', 'monolith (reshaped)').json({
    orderId: raw.oid,
    status: { 1: 'PAID', 0: 'PENDING', 2: 'FAILED' }[raw.s],
    amount: raw.amt_paise / 100,
    method: { U: 'UPI', C: 'CARD', W: 'WALLET' }[raw.m],
    paidAt: new Date(raw.ts * 1000).toISOString(),
  });
});

app.get('/menu/:rid', async (req, res) => {
  const key = req.params.rid, hit = cache[key];
  if (CACHE && hit && Date.now() - hit.at < 30000) return res.set('x-cache', 'HIT').set('x-served-by', 'gateway cache').json(hit.body);
  const body = await callJson(`${MONO}/menu/${key}`, { timeoutMs: 2000 });
  if (CACHE) cache[key] = { at: Date.now(), body };
  res.set('x-cache', CACHE ? 'MISS' : 'OFF').set('x-served-by', 'monolith').json(body);
});

app.get('/api/{*rest}', async (req, res) => {
  const r = await callJson(`${MONO}${req.path}`, { timeoutMs: 2000 }).catch(e => ({ error: e.message }));
  res.set('x-served-by', 'monolith').json(r);
});
app.listen(PORT, () => log(SVC, `:${PORT}  STRANGLER=${STRANGLER ? 1 : 0} CACHE=${CACHE ? 1 : 0} RATE_LIMIT=${RATE_LIMIT}/10s`));
