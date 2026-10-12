/* ex3 — Instamart 10-minute order: doodh (inventory-service) AUR rider (delivery-service) — dono ya koi nahi.
   Dono services ke database alag hain, isliye ek "BEGIN ... COMMIT" nahi chal sakta.
   MODE=naive → stock lo, rider lo; rider na mile toh... kuch nahi (stock atka reh jaata hai)
   MODE=saga  → stock lo (local commit), rider lo; rider na mile toh stock WAPAS (compensation)
   MODE=twopc → dono se "prepare" (lock pakdo), dono yes → dono commit; warna dono abort
   COORD_CRASH_ON=N → twopc mein N-va order: prepare ke baad coordinator "crash" (commit/abort nahi bhejta)
   POST /orders */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 4820, SVC = 'order-service';
const MODE = ['saga', 'twopc'].includes(process.env.MODE) ? process.env.MODE : 'naive';
const CRASH_ON = Number(process.env.COORD_CRASH_ON || 0);
const INV = `http://${host('inventory')}:4821`, DEL = `http://${host('delivery')}:4822`;
const app = express();
app.use(express.json());
let seq = 0;
const call = (url, orderId) => callJson(url, { method: 'POST', body: { orderId }, timeoutMs: 10000 }).then(r => ({ ok: true, r }), e => ({ ok: false, reason: (e.body && (e.body.reason)) || e.message }));

app.get('/', (req, res) => res.json({ service: SVC, MODE }));
app.post('/orders', async (req, res) => {
  const n = ++seq;
  const orderId = `IM-${n}`;
  const t0 = Date.now();
  const done = (status, extra) => res.status(status === 'placed' ? 200 : 409).json(Object.assign({ orderId, mode: MODE, status, ms: Date.now() - t0 }, extra));

  if (MODE === 'naive' || MODE === 'saga') {
    const inv = await call(`${INV}/reserve`, orderId);
    if (!inv.ok) return done('failed', { reason: inv.reason });
    const del = await call(`${DEL}/reserve`, orderId);
    if (del.ok) return done('placed');
    if (MODE === 'saga') { await call(`${INV}/release`, orderId); return done('failed', { reason: del.reason, compensated: 'doodh wapas stock mein' }); }
    return done('failed', { reason: del.reason, warning: 'doodh reserve hi reh gaya!' });
  }

  const inv = await call(`${INV}/prepare`, orderId);
  const del = inv.ok ? await call(`${DEL}/prepare`, orderId) : { ok: false, reason: 'inventory ne pehle hi mana kiya' };
  if (CRASH_ON && n === CRASH_ON) {
    log(SVC, `💥 ${orderId}: dono prepare ho gaye, aur coordinator CRASH — commit/abort kabhi nahi gaya`);
    return done('coordinator-crashed', { note: 'inventory ka lock ab TTL tak atka rahega' });
  }
  if (inv.ok && del.ok) {
    await Promise.all([call(`${INV}/commit`, orderId), call(`${DEL}/commit`, orderId)]);
    return done('placed');
  }
  await Promise.all([call(`${INV}/abort`, orderId), call(`${DEL}/abort`, orderId)]);
  return done('failed', { reason: inv.ok ? del.reason : inv.reason });
});
app.listen(PORT, () => log(SVC, `:${PORT}  MODE=${MODE}${CRASH_ON ? `  (order #${CRASH_ON} par crash)` : ''}`));
