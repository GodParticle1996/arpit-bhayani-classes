/* ex2/ex3 — Subscriber: apna "dimaag" khud rakhta hai. Event aaya → khud decide kare kya karna hai.
   Chalane ke do tareeke:
     node services/subscriber.js <name> <port>          (jaise: npm run sub loyalty 4715)
     env: NAME, PORT, TOPIC (default order_placed), WORK_MS
   Extra env:
     PAUSED=1        → pull nahi karta (service "down"); POST /resume se wapas
     SKIP_WORK=1     → message ack kar deta hai par kaam NAHI karta (chupa bug — observability ka dard)
     FORWARD_URL=... → kaam = is URL par POST (ex3: OTP worker → sms-gateway)
     BACKLOG_MS=N    → har message se pehle N ms ruko (queue mein aage bahut messages hain, aisa maano)
   GET /seen/:traceId → maine is trace par kya kiya?   GET /seen → sab */
const express = require('express');
const { log, callJson, host, sleep } = require('../lib/util');
const NAME = process.argv[2] || process.env.NAME || 'subscriber';
const PORT = Number(process.argv[3] || process.env.PORT || 4719);
const TOPIC = process.env.TOPIC || 'order_placed';
const WORK_MS = Number(process.env.WORK_MS || 300);
const SKIP_WORK = process.env.SKIP_WORK === '1';
const FORWARD_URL = process.env.FORWARD_URL || '';
const BACKLOG_MS = Number(process.env.BACKLOG_MS || 0);
let paused = process.env.PAUSED === '1';
const BROKER = `http://${host('pubsub')}:4710`;

const ACTION = {
  notification: 'email "Order confirmed" bheja',
  restaurant: 'kitchen tablet par order dikhaya',
  delivery: 'rider Ramesh assign kiya',
  loyalty: '+20 loyalty points jode',
  'orders-page': 'user ke "My orders" page mein joda',
};
const seen = {};
const app = express();
app.use(express.json());

async function handle(m) {
  const { traceId, orderId } = m.body;
  if (BACKLOG_MS) await sleep(BACKLOG_MS);
  if (SKIP_WORK) {
    log(NAME, `🤫 ${orderId || m.body.phone} (${traceId}): ack kar diya, kaam nahi kiya (bug)`);
    return true;
  }
  if (FORWARD_URL) {
    try {
      await callJson(FORWARD_URL, { method: 'POST', body: m.body, timeoutMs: 3000 });
    } catch (e) {
      log(NAME, `❌ ${traceId}: ${e.message} — ack nahi karunga, lease ke baad dobara aayega`);
      return false;
    }
  } else {
    await sleep(WORK_MS);
  }
  const action = FORWARD_URL ? `forward → ${FORWARD_URL}` : (ACTION[NAME] || 'kaam kiya');
  seen[traceId] = { orderId, action, at: new Date().toISOString(), delivery: m.deliveries };
  log(NAME, `✅ ${orderId || m.body.phone} (${traceId}): ${action}`);
  return true;
}

async function loop() {
  for (;;) {
    if (paused) { await sleep(300); continue; }
    try {
      const m = await callJson(`${BROKER}/pull/${TOPIC}/${NAME}`, { method: 'POST', timeoutMs: 2000 });
      if (m.empty) { await sleep(150); continue; }
      if (await handle(m)) await callJson(`${BROKER}/ack/${NAME}/${m.id}`, { method: 'POST', timeoutMs: 2000 });
    } catch (e) {
      await sleep(500);
    }
  }
}

app.post('/pause', (req, res) => { paused = true; log(NAME, '⏸️  paused (down)'); res.json({ paused }); });
app.post('/resume', (req, res) => { paused = false; log(NAME, '▶️  resumed — backlog uthaunga'); res.json({ paused }); });
app.get('/seen/:traceId', (req, res) => res.json({ service: NAME, trace: req.params.traceId, did: seen[req.params.traceId] || null }));
app.get('/seen', (req, res) => res.json({ service: NAME, count: Object.keys(seen).length, seen }));

app.listen(PORT, async () => {
  for (let i = 0; i < 20; i++) {
    try { await callJson(`${BROKER}/subscribe`, { method: 'POST', body: { topic: TOPIC, group: NAME }, timeoutMs: 1000 }); break; } catch (e) { await sleep(300); }
  }
  log(NAME, `:${PORT}  "${TOPIC}" sun raha hoon${paused ? '  ⏸️ PAUSED' : ''}${SKIP_WORK ? '  🤫 SKIP_WORK bug' : ''}${BACKLOG_MS ? `  backlog ${BACKLOG_MS}ms` : ''}`);
  loop();
});
