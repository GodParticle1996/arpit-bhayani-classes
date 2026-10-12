/* ex2 — teen chhoti services, ek hi file. ROLE se tay hota hai kaunsi.
   profile  (4811) GET  /profile/:id   → DB query 15 ms
   chat     (4812) POST /messages      → DB write 40 ms (chat bahut likhta hai)
   payment  (4813) POST /pay           → DB txn 20 ms  (paisa!)
   Env: ROLE, DB_PORT (kaunsa database), DB_HOST */
const express = require('express');
const { log, callJson } = require('../lib/util');
const ROLE = process.env.ROLE;
const CFG = { profile: { port: 4811, cost: 15 }, chat: { port: 4812, cost: 40 }, payment: { port: 4813, cost: 20 } }[ROLE];
const DB = `http://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT}/query`;
const SVC = ROLE + '-service';
const app = express();
app.use(express.json());

async function db(res, extra) {
  const t0 = Date.now();
  try {
    const r = await callJson(DB, { method: 'POST', body: { cost: CFG.cost, who: ROLE }, timeoutMs: 5000 });
    res.json(Object.assign({ ok: true, service: SVC, db: r.db, dbWaitMs: r.waitedMs, ms: Date.now() - t0 }, extra));
  } catch (e) {
    res.status(503).json({ ok: false, service: SVC, error: 'database: ' + e.message, ms: Date.now() - t0 });
  }
}
app.get('/', (req, res) => res.json({ service: SVC, db: DB }));
app.get('/profile/:id', (req, res) => db(res, { profile: { id: req.params.id, name: 'Priya', city: 'Pune' } }));
app.post('/messages', (req, res) => db(res, { stored: true }));
app.post('/pay', (req, res) => db(res, { charged: (req.body && req.body.amount) || 320 }));
app.listen(CFG.port, () => log(SVC, `:${CFG.port}  database → ${DB}`));
