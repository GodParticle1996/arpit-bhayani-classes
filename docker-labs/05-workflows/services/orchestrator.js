/* ex1 — Orchestrator (order-service ka "conductor" hissa). Poora workflow yahin likha hai:
     1. restaurant accept (zaroori)          → reject hua toh workflow yahin ruk jaata hai
     2. notification + delivery EK SAATH     → notification optional, delivery zaroori (retries)
     3. delivery fail → compensation: restaurant ko undo
     4. ADD_LOYALTY=1 → loyalty step (naya step = orchestrator ka code/config badlo aur restart)
   POST /orders { restaurantOpen }   GET /workflows/:id   GET /workflows
   Env: RIDER_RETRIES (default 0), ADD_LOYALTY=1 */
const express = require('express');
const { log, callJson, host, sleep } = require('../lib/util');
const PORT = 4701, SVC = 'orchestrator';
const RIDER_RETRIES = Number(process.env.RIDER_RETRIES || 0);
const ADD_LOYALTY = process.env.ADD_LOYALTY === '1';
const URL = {
  restaurant: `http://${host('restaurant')}:4702/do`,
  notification: `http://${host('notification')}:4703/do`,
  delivery: `http://${host('delivery')}:4704/do`,
  loyalty: `http://${host('loyalty')}:4705/do`,
  restaurantUndo: `http://${host('restaurant')}:4702/undo`,
};

const app = express();
app.use(express.json());
const workflows = {};
let seq = 0;

async function step(wf, name, url, { retries = 0 } = {}) {
  const t0 = Date.now();
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const r = await callJson(url, { method: 'POST', body: { orderId: wf.id, restaurantOpen: wf.restaurantOpen }, timeoutMs: 2000 });
      wf.steps.push({ step: name, status: r.ok ? 'done' : 'rejected', detail: r.did || r.reason, attempts: attempt, ms: Date.now() - t0 });
      return r.ok;
    } catch (e) {
      if (attempt <= retries) { log(SVC, `🔁 ${wf.id}: ${name} fail, retry ${attempt}/${retries}`); await sleep(100 * attempt); continue; }
      wf.steps.push({ step: name, status: 'failed', detail: e.body && e.body.reason || e.message, attempts: attempt, ms: Date.now() - t0 });
      return false;
    }
  }
}

app.post('/orders', async (req, res) => {
  const wf = { id: `O-${++seq}`, restaurantOpen: req.body && req.body.restaurantOpen !== false, state: 'RUNNING', steps: [], started: Date.now() };
  workflows[wf.id] = wf;
  log(SVC, `▶️  ${wf.id}: workflow shuru`);

  if (!(await step(wf, 'restaurant', URL.restaurant))) {
    wf.state = 'REJECTED';
    log(SVC, `⛔ ${wf.id}: restaurant ne mana kiya — rider assign NAHI karenge`);
  } else {
    const [, riderOk] = await Promise.all([
      step(wf, 'notification', URL.notification).then(ok => {
        if (!ok) { wf.steps[wf.steps.length - 1].note = 'optional step — order nahi rokenge, email baad mein'; log(SVC, `⚠️  ${wf.id}: email nahi gayi, order chalu rakho`); }
        return ok;
      }),
      step(wf, 'delivery', URL.delivery, { retries: RIDER_RETRIES }),
    ]);
    if (!riderOk) {
      log(SVC, `↩️  ${wf.id}: rider nahi mila → restaurant ko cancel bhejo (compensation)`);
      await callJson(URL.restaurantUndo, { method: 'POST', body: { orderId: wf.id }, timeoutMs: 2000 }).catch(() => {});
      wf.steps.push({ step: 'restaurant', status: 'compensated', detail: 'order cancel' });
      wf.state = 'CANCELLED_NO_RIDER';
    } else {
      if (ADD_LOYALTY) await step(wf, 'loyalty', URL.loyalty);
      wf.state = 'COMPLETED';
    }
  }
  wf.totalMs = Date.now() - wf.started;
  log(SVC, `🏁 ${wf.id}: ${wf.state} (${wf.totalMs} ms)`);
  res.status(wf.state === 'COMPLETED' ? 200 : 409).json({ orderId: wf.id, state: wf.state, totalMs: wf.totalMs, steps: wf.steps });
});

app.get('/workflows/:id', (req, res) => res.json(workflows[req.params.id] || { error: 'not found' }));
app.get('/workflows', (req, res) => res.json(Object.values(workflows).map(w => ({ id: w.id, state: w.state, totalMs: w.totalMs }))));
app.listen(PORT, () => log(SVC, `:${PORT}  rider retries ${RIDER_RETRIES}  loyalty step ${ADD_LOYALTY ? 'ON' : 'OFF'}`));
