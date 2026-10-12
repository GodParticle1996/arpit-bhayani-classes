/* ex3 — transaction ka ek hissa: inventory (doodh ka stock) ya delivery (riders). Har ek ka APNA database (memory).
   Saga style (local commit turant):  POST /reserve {orderId}   POST /release {orderId}   (release = compensation)
   2PC style (lock pakad ke rakho):   POST /prepare {orderId} → vote yes/no   POST /commit   POST /abort
   Env: NAME, PORT, STOCK, WORK_MS, FAIL_EVERY=N (har N-va attempt fail), LOCK=1 (prepare par row lock), LOCK_TTL_MS */
const express = require('express');
const { log, sleep } = require('../lib/util');
const NAME = process.env.NAME || 'inventory';
const PORT = Number(process.env.PORT || 4821);
let available = Number(process.env.STOCK || 50);
const START = available;
const WORK_MS = Number(process.env.WORK_MS || 20);
const FAIL_EVERY = Number(process.env.FAIL_EVERY || 0);
const LOCK = process.env.LOCK === '1';
const LOCK_TTL_MS = Number(process.env.LOCK_TTL_MS || 8000);
const LOCK_WAIT_MS = 4000;
const app = express();
app.use(express.json());
const holds = {};                   // saga reservations
const prepared = {};                // 2PC: orderId → true (yes vote diya, commit ka intezaar)
let attempts = 0, lockHolder = null, lockAt = 0, lockWaitTimeouts = 0;
const waiters = [];
const noun = NAME === 'inventory' ? 'doodh' : 'rider';

const shouldFail = () => FAIL_EVERY && (++attempts % FAIL_EVERY === 0);
function freeLock(why) {
  if (!lockHolder) return;
  if (why) log(NAME, `🔓 lock chhoda (${why})`);
  lockHolder = null;
  const next = waiters.shift();
  if (next) next.grant();
}
setInterval(() => { if (lockHolder && Date.now() - lockAt > LOCK_TTL_MS) { const o = lockHolder; delete prepared[o]; freeLock(`${o} ka commit/abort ${LOCK_TTL_MS} ms tak nahi aaya — txn timeout`); } }, 200);
const getLock = orderId => new Promise(resolve => {
  if (!lockHolder) { lockHolder = orderId; lockAt = Date.now(); return resolve(true); }
  const w = { grant: () => { clearTimeout(w.t); lockHolder = orderId; lockAt = Date.now(); resolve(true); } };
  w.t = setTimeout(() => { waiters.splice(waiters.indexOf(w), 1); lockWaitTimeouts++; resolve(false); }, LOCK_WAIT_MS);
  waiters.push(w);
});

app.post('/reserve', async (req, res) => {
  const { orderId } = req.body;
  await sleep(WORK_MS);
  if (shouldFail() || available <= 0) return res.status(409).json({ ok: false, reason: `${noun} nahi mila` });
  available--; holds[orderId] = true;
  res.json({ ok: true });
});
app.post('/release', (req, res) => {
  const { orderId } = req.body;
  if (holds[orderId]) { available++; delete holds[orderId]; log(NAME, `↩️  ${orderId}: compensation — ${noun} wapas`); }
  res.json({ ok: true });
});

app.post('/prepare', async (req, res) => {
  const { orderId } = req.body;
  if (LOCK && !(await getLock(orderId))) return res.status(409).json({ vote: 'no', reason: 'lock wait timeout' });
  await sleep(WORK_MS);
  if (shouldFail() || available <= 0) { if (LOCK) freeLock(); return res.status(409).json({ vote: 'no', reason: `${noun} nahi mila` }); }
  prepared[orderId] = true;
  res.json({ vote: 'yes' });
});
app.post('/commit', (req, res) => {
  const { orderId } = req.body;
  if (prepared[orderId]) { available--; delete prepared[orderId]; }
  if (LOCK && lockHolder === orderId) freeLock();
  res.json({ ok: true });
});
app.post('/abort', (req, res) => {
  const { orderId } = req.body;
  delete prepared[orderId];
  if (LOCK && lockHolder === orderId) freeLock();
  res.json({ ok: true });
});
app.get('/stats', (req, res) => res.json({
  name: NAME, start: START, available, sagaHolds: Object.keys(holds).length,
  lockHolder, lockHeldMs: lockHolder ? Date.now() - lockAt : 0, waitingForLock: waiters.length, lockWaitTimeouts,
}));
app.listen(PORT, () => log(NAME, `:${PORT}  ${noun}: ${available}${FAIL_EVERY ? `  har ${FAIL_EVERY}-va attempt fail` : ''}${LOCK ? '  (2PC row lock)' : ''}`));
