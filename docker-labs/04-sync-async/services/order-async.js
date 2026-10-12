/* ex3 — order-service ASYNC: order save + "order_placed" publish, turant jawab.
   SYNC_NOTIFY=1 → purana tareeka: notification ka intezaar (compare karne ke liye) */
const express = require('express');
const { log, callJson, sleep, host } = require('../lib/util');
const app = express();
const PORT = 4621, SVC = 'order-async';
let orders = 0;
/* email provider ek saath sirf 10 emails bhej sakta hai (asli providers ki rate limit jaisa) */
let emailBusy = 0; const emailWait = [];
async function sendEmailSync() {
  if (emailBusy >= 10) await new Promise(r => emailWait.push(r));
  emailBusy++;
  try { await sleep(400); } finally { emailBusy--; const n = emailWait.shift(); if (n) n(); }
}
app.post('/orders', async (req, res) => {
  const t0 = Date.now();
  const id = 'O-' + (++orders);
  await sleep(20);                                            // apne DB mein order save
  if (process.env.SYNC_NOTIFY === '1') {
    await sendEmailSync();                                    // email provider ka intezaar (sync, max 10 ek saath)
    return res.json({ id, status: 'placed', mode: 'sync', userWaitedMs: Date.now() - t0 });
  }
  await callJson(`http://${host('broker')}:4620/topics/order_placed/publish`, { method: 'POST', body: { orderId: id, user: 'user42' }, timeoutMs: 1000 });
  res.json({ id, status: 'placed', mode: 'async', userWaitedMs: Date.now() - t0 });
});
app.listen(PORT, () => log(SVC, `POST http://localhost:${PORT}/orders  (${process.env.SYNC_NOTIFY === '1' ? 'SYNC notify' : 'async publish'})`));
