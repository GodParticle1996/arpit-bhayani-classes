/* ex1 — order-service SYNC chain: restaurant → delivery → notification, har ek ka intezaar */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
const PORT = 4601, SVC = 'order-sync';
const T = Number(process.env.TIMEOUT_MS || 3000);
app.post('/orders', async (req, res) => {
  const t0 = Date.now(), steps = [];
  const step = async (name, port) => {
    const s = Date.now();
    await callJson(`http://${host(name)}:${port}/work`, { method: 'POST', timeoutMs: T });
    steps.push(`${name} ${Date.now() - s}ms`);
  };
  try {
    await step('restaurant', 4602);     // restaurant ne order accept kiya?
    await step('delivery', 4603);       // rider assign
    await step('notification', 4604);   // SMS "order confirmed"
    res.json({ status: 'placed', userWaitedMs: Date.now() - t0, steps });
  } catch (e) {
    res.status(502).json({ status: 'FAILED', reason: e.message, userWaitedMs: Date.now() - t0, stepsDone: steps });
  }
});
app.listen(PORT, () => log(SVC, `POST http://localhost:${PORT}/orders  (sab sync, timeout ${T}ms)`));
