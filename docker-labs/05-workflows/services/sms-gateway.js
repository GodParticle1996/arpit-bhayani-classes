/* ex3 — SMS carrier ka gateway (bahar ki company). Carrier waise hi slow hai.
   POST /send { phone, traceId, requestedAt }  → LATENCY_MS baad "delivered"
   GET  /inbox → user ke phone par OTP kab pahuncha, request se kitni der baad
   Env: LATENCY_MS (default 800), DOWN=1 */
const express = require('express');
const { log, sleep } = require('../lib/util');
const PORT = 4722, SVC = 'sms-gateway';
const LATENCY_MS = Number(process.env.LATENCY_MS || 800);
const DOWN = process.env.DOWN === '1';
const app = express();
app.use(express.json());
const inbox = [];

app.post('/send', async (req, res) => {
  const { phone, traceId, requestedAt } = req.body || {};
  if (DOWN) { log(SVC, `💀 ${phone}: carrier down`); return res.status(503).json({ ok: false, reason: 'carrier down' }); }
  await sleep(LATENCY_MS);
  const delayMs = requestedAt ? Date.now() - requestedAt : null;
  inbox.push({ phone, traceId, otp: String(100000 + Math.floor(Math.random() * 900000)), delayAfterLoginTapMs: delayMs });
  log(SVC, `📱 ${phone}: OTP pahuncha — login tap ke ${delayMs} ms baad`);
  res.json({ ok: true });
});
app.get('/inbox', (req, res) => res.json(inbox));
app.listen(PORT, () => log(SVC, `:${PORT}  carrier latency ${LATENCY_MS}ms${DOWN ? '  💀 DOWN' : ''}`));
