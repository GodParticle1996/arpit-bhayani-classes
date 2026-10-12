/* Ek "step" service — restaurant, notification, delivery, loyalty.
   Orchestration (ex1) mein orchestrator isse bataata hai kya karna hai. Khud kuch decide nahi karti.
   POST /do    { orderId, restaurantOpen }  → LATENCY_MS baad jawab
   POST /undo  { orderId }                   → compensation (jaise restaurant order cancel)
   GET  /log                                 → is service ke paas kya-kya aaya
   Env: NAME, PORT, LATENCY_MS, DOWN=1 (turant 503), FAIL_FIRST=N (har order ke pehle N attempts fail) */
const express = require('express');
const { log, sleep } = require('../lib/util');
const NAME = process.env.NAME || 'step';
const PORT = Number(process.env.PORT || 4700);
const LATENCY_MS = Number(process.env.LATENCY_MS || 200);
const DOWN = process.env.DOWN === '1';
const FAIL_FIRST = Number(process.env.FAIL_FIRST || 0);

const app = express();
app.use(express.json());
const attempts = {}, history = [];

app.post('/do', async (req, res) => {
  const { orderId, restaurantOpen } = req.body || {};
  if (DOWN) { log(NAME, `💀 ${orderId}: down hoon`); return res.status(503).json({ ok: false, reason: `${NAME} down` }); }
  attempts[orderId] = (attempts[orderId] || 0) + 1;
  await sleep(LATENCY_MS);
  if (attempts[orderId] <= FAIL_FIRST) {
    log(NAME, `❌ ${orderId}: attempt ${attempts[orderId]} fail`);
    history.push({ orderId, action: 'do', result: 'fail', attempt: attempts[orderId] });
    return res.status(500).json({ ok: false, reason: `${NAME} attempt ${attempts[orderId]} fail` });
  }
  if (NAME === 'restaurant' && restaurantOpen === false) {
    log(NAME, `🚫 ${orderId}: restaurant band hai, reject`);
    history.push({ orderId, action: 'do', result: 'rejected' });
    return res.json({ ok: false, reason: 'restaurant closed' });
  }
  const done = { restaurant: 'order accept kiya', notification: 'email bheja', delivery: 'rider Ramesh assign', loyalty: '+20 points' }[NAME] || 'done';
  log(NAME, `✅ ${orderId}: ${done}`);
  history.push({ orderId, action: 'do', result: done, attempt: attempts[orderId] });
  res.json({ ok: true, did: done });
});

app.post('/undo', (req, res) => {
  const { orderId } = req.body || {};
  log(NAME, `↩️  ${orderId}: compensation — order cancel kiya`);
  history.push({ orderId, action: 'undo' });
  res.json({ ok: true });
});

app.get('/log', (req, res) => res.json({ service: NAME, history }));
app.listen(PORT, () => log(NAME, `:${PORT}  latency ${LATENCY_MS}ms${DOWN ? '  💀 DOWN' : ''}${FAIL_FIRST ? `  pehle ${FAIL_FIRST} attempts fail` : ''}`));
