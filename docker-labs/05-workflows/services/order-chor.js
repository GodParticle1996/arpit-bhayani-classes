/* ex2 — Choreography wali order-service. Order save karo, "order_placed" event publish karo, bas.
   Order-service ko NAHI pata kaun sun raha hai. Na email, na rider, na loyalty — sab apna decide karte hain.
   POST /orders → { orderId, traceId, userWaitedMs } */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 4711, SVC = 'order-chor';
const app = express();
app.use(express.json());
let seq = 0;

app.post('/orders', async (req, res) => {
  const t0 = Date.now();
  const orderId = `O-${++seq}`;
  const traceId = `tr-${Date.now().toString(36)}-${seq}`;
  try {
    const r = await callJson(`http://${host('pubsub')}:4710/publish/order_placed`, {
      method: 'POST', body: { orderId, traceId, amount: 320, at: new Date().toISOString() }, timeoutMs: 1000,
    });
    log(SVC, `🧾 ${orderId} saved, event published (trace ${traceId}) — mera kaam khatam`);
    res.json({ orderId, traceId, status: 'placed', userWaitedMs: Date.now() - t0, brokerSays: `event ${r.fannedOutTo.length} subscribers ko gaya` });
  } catch (e) {
    res.status(503).json({ orderId, status: 'FAILED', reason: 'broker tak nahi pahunche: ' + e.message });
  }
});

app.listen(PORT, () => log(SVC, `:${PORT}  (subscribers ka koi naam is code mein nahi hai)`));
