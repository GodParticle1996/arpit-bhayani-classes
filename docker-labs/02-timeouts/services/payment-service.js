/* payment-service (ex2) — bank ko ₹450 debit bhejti hai.
   TIMEOUT_MS=1000, RETRIES=2, USE_KEY=1 (idempotency key bhejo) */
const express = require('express');
const crypto = require('crypto');
const { log, callJson, sleep, host } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4412, SVC = 'payment-service';
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 1000);
const RETRIES = Number(process.env.RETRIES || 2);
const USE_KEY = process.env.USE_KEY === '1';

app.post('/pay', async (req, res) => {
  const amount = Number((req.body && req.body.amount) || 450);
  const key = USE_KEY ? (req.get('Idempotency-Key') || crypto.randomUUID()) : null;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const r = await callJson(`http://${host('bank')}:4411/debit`, {
        method: 'POST', body: { amount }, timeoutMs: TIMEOUT_MS, headers: key ? { 'Idempotency-Key': key } : {},
      });
      return res.json({ status: 'paid', attempt: attempt + 1, idempotencyKey: key, bank: r });
    } catch (e) {
      const wait = 200 * Math.pow(2, attempt);
      log(SVC, `attempt ${attempt + 1} fail: ${e.message}${attempt < RETRIES ? ` → ${wait} ms baad retry` : ''}`);
      if (attempt < RETRIES) await sleep(wait);
    }
  }
  res.status(504).json({ status: 'unknown', note: 'bank ne time par jawab nahi diya — status check karna padega', idempotencyKey: key });
});
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/pay  (TIMEOUT_MS=${TIMEOUT_MS}, RETRIES=${RETRIES}, USE_KEY=${USE_KEY})`));
