/* bank (ex2) — nakli bank. Paisa KAAT deta hai, phir jawab bhejne mein DELAY_MS lagata hai.
   Idempotency-Key header aaya toh same key dobara aane par naya debit NAHI karta. */
const express = require('express');
const { log, sleep } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4411, SVC = 'bank';
const DELAY_MS = Number(process.env.DELAY_MS || 1500);
let balance = 5000;
const debits = [];
const byKey = new Map();

app.post('/debit', async (req, res) => {
  const key = req.get('Idempotency-Key');
  if (key && byKey.has(key)) {
    log(SVC, `🔁 key ${key} pehle hi process ho chuki — naya debit nahi, purana result`);
    return res.json(byKey.get(key));
  }
  balance -= req.body.amount;
  const entry = { txnId: 'T' + (debits.length + 1), amount: req.body.amount, key: key || null, balanceAfter: balance };
  debits.push(entry);
  if (key) byKey.set(key, entry);
  log(SVC, `💸 debit ₹${req.body.amount} (key=${key || 'none'}) → balance ₹${balance}. Ab jawab bhejne mein ${DELAY_MS} ms...`);
  await sleep(DELAY_MS);
  res.json(entry);
});
app.get('/statement', (req, res) => res.json({ balance, debits }));
app.post('/reset', (req, res) => { balance = 5000; debits.length = 0; byKey.clear(); res.json({ ok: true }); });
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/statement  (jawab delay ${DELAY_MS} ms)`));
