/* db-server — ek chhota "teaching database" (asli Postgres nahi, par asli jaisa bartaav):
   • tables: restaurants, menu_items
   • DB users + permissions (kaun kya padh/likh sakta hai)
   • POOL=4 connection slots — bhari query slot pakad ke rakhti hai, baaki line mein
   • SCHEMA=v2 → restaurants.avg_rating ka naam rating_avg
   • ROLE=replica → sirf read, primary se LAG_MS peeche
   • READONLY_ANALYTICS=1 → analytics_svc user sirf SELECT kar sakta hai */
const express = require('express');
const { log, sleep } = require('../lib/util');
const app = express();
app.use(express.json());
const ROLE = process.env.ROLE || 'primary';
const PORT = Number(process.env.PORT || (ROLE === 'replica' ? 5433 : 5432));
const SVC = `db-${ROLE}`;
const POOL = Number(process.env.POOL || 4);
const SCHEMA = process.env.SCHEMA || 'v1';
const RATING = SCHEMA === 'v2' ? 'rating_avg' : 'avg_rating';

const USERS = {
  restaurant_svc: { pass: 'r3st', tables: { restaurants: 'rw', menu_items: 'rw' } },
  review_svc: { pass: 'rev1ew', tables: { restaurants: 'rw' } },
  order_svc: { pass: '0rder', tables: { restaurants: 'r', menu_items: 'r' } },
  analytics_svc: { pass: 'an4lytics', tables: { restaurants: process.env.READONLY_ANALYTICS === '1' ? 'r' : 'rw', menu_items: process.env.READONLY_ANALYTICS === '1' ? 'r' : 'rw' } },
};

const db = { restaurants: [], menu_items: [] };
for (let i = 1; i <= 50; i++) {
  db.restaurants.push({ id: i, name: `Restaurant ${i}`, [RATING]: 4.1, rating_count: 100 });
  for (let j = 1; j <= 3; j++) db.menu_items.push({ id: i * 10 + j, restaurant_id: i, name: `Dish ${j}`, price: 150 + j * 50 });
}

let busy = 0;
const queue = [];
async function withSlot(fn) {
  if (busy >= POOL) await new Promise(r => queue.push(r));
  busy++;
  try { return await fn(); } finally { busy--; const next = queue.shift(); if (next) next(); }
}

app.post('/query', async (req, res) => {
  const { user, pass, op, table, where = {}, set = {}, cost = 'light' } = req.body || {};
  const u = USERS[user];
  if (!u || u.pass !== pass) return res.status(401).json({ error: 'auth failed' });
  const perm = (u.tables[table] || '');
  if (!db[table]) return res.status(400).json({ error: `relation "${table}" does not exist` });
  if (op !== 'select' && ROLE === 'replica') return res.status(400).json({ error: 'cannot execute write on a read-only replica' });
  if (op === 'select' && !perm.includes('r')) return res.status(403).json({ error: `permission denied for table ${table}` });
  if (op !== 'select' && !perm.includes('w')) return res.status(403).json({ error: `permission denied: ${user} cannot ${op} ${table}` });
  const queuedAt = Date.now();
  const out = await withSlot(async () => {
    const waited = Date.now() - queuedAt;
    await sleep(cost === 'heavy' ? 3000 : 15);
    const rows = db[table].filter(r => Object.entries(where).every(([k, v]) => r[k] === v));
    if (op === 'select') return { rows, waited };
    if (op === 'update') {
      for (const [k] of Object.entries(set)) {
        if (rows.length && !(k in rows[0])) { const e = new Error(`column "${k}" of relation "${table}" does not exist`); e.code = 400; throw e; }
      }
      rows.forEach(r => Object.assign(r, set));
      return { updated: rows.length, waited };
    }
    if (op === 'delete') {
      const before = db[table].length;
      db[table] = db[table].filter(r => !rows.includes(r));
      return { deleted: before - db[table].length, waited };
    }
    const e = new Error('unknown op'); e.code = 400; throw e;
  }).catch(e => ({ error: e.message, code: e.code || 500 }));
  if (out.error) return res.status(out.code).json({ error: out.error });
  res.json(Object.assign({ role: ROLE, schema: SCHEMA, totalMs: Date.now() - queuedAt }, out));
});
app.get('/stats', (req, res) => res.json({ role: ROLE, schema: SCHEMA, busySlots: busy, pool: POOL, queued: queue.length, restaurants: db.restaurants.length, menu_items: db.menu_items.length }));
app.listen(PORT, () => log(SVC, `listening :${PORT}  schema=${SCHEMA} pool=${POOL} readonlyAnalytics=${process.env.READONLY_ANALYTICS === '1'}`));
