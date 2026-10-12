/* ex2 — teaching database server. Asli DB jaisa ek hi cheez: connection POOL seemit hai.
   POOL se zyada queries aayein toh line mein lagti hain.
   POST /query { cost, who }  → cost ms ka kaam, line mein wait ke saath
   POST /admin/crash | /admin/recover     GET /stats
   Env: NAME, PORT, POOL */
const express = require('express');
const { log, sleep } = require('../lib/util');
const NAME = process.env.NAME || 'db';
const PORT = Number(process.env.PORT || 5500);
const POOL = Number(process.env.POOL || 5);
const app = express();
app.use(express.json());
let busy = 0, down = false;
const line = [], served = {};

const acquire = () => new Promise(r => { if (busy < POOL) { busy++; r(); } else line.push(r); });
const release = () => { const next = line.shift(); if (next) next(); else busy--; };

app.post('/query', async (req, res) => {
  if (down) return res.status(503).json({ error: `${NAME} down` });
  const { cost = 20, who = '?' } = req.body || {};
  const t0 = Date.now();
  await acquire();
  const waitedMs = Date.now() - t0;
  await sleep(cost);
  release();
  served[who] = (served[who] || 0) + 1;
  res.json({ ok: true, db: NAME, waitedMs });
});
app.post('/admin/crash', (req, res) => { down = true; log(NAME, '💥 DATABASE DOWN (disk full)'); res.json({ db: NAME, down }); });
app.post('/admin/recover', (req, res) => { down = false; log(NAME, '✅ database wapas'); res.json({ db: NAME, down }); });
app.get('/stats', (req, res) => res.json({ db: NAME, pool: POOL, busy, waitingInLine: line.length, down, served }));
app.listen(PORT, () => log(NAME, `:${PORT}  pool ${POOL}`));
