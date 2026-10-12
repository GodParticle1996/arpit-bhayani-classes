/* ex2 — orders-service. Business code sirf store ka interface jaanta hai (put/get/listByUser).
   STORE=file  → purana store
   STORE=kv    → naya store
   STORE=dual  → migration mode: dono mein likho, file se padho, kv se "shadow read" karke compare karo */
const express = require('express');
const makeStore = require('../lib/stores');
const PORT = 5111;
const MODE = ['kv', 'dual'].includes(process.env.STORE) ? process.env.STORE : 'file';
const primary = makeStore(MODE === 'kv' ? 'kv' : 'file');
const shadow = MODE === 'dual' ? makeStore('kv') : null;
const app = express();
app.use(express.json());
let seq = Date.now(), shadowReads = 0, mismatches = 0;
const sample = [];

async function compare(label, a, b) {
  shadowReads++;
  if (JSON.stringify(a) !== JSON.stringify(b)) { mismatches++; if (sample.length < 5) sample.push(label); }
}
app.post('/v1/orders', async (req, res) => {
  const o = { id: `O-${++seq}`, userId: (req.body && req.body.userId) || 'u1', total: (req.body && req.body.total) || 320, createdAt: seq };
  await primary.put(o);
  if (shadow) await shadow.put(o);
  res.status(201).json({ data: o, store: MODE });
});
app.get('/v1/orders/:id', async (req, res) => {
  const o = await primary.get(req.params.id);
  if (shadow) compare(`get ${req.params.id}`, o, await shadow.get(req.params.id));
  res.json({ data: o, store: MODE });
});
app.get('/v1/users/:userId/orders', async (req, res) => {
  const opts = { limit: Math.min(100, Number(req.query.limit || 20)), cursor: req.query.cursor ? Number(req.query.cursor) : null };
  const page = await primary.listByUser(req.params.userId, opts);
  if (shadow) compare(`list ${req.params.userId}`, page, await shadow.listByUser(req.params.userId, opts));
  res.json({ data: page.items, nextCursor: page.nextCursor, store: MODE });
});
app.post('/migration/reset-counters', (req, res) => { shadowReads = 0; mismatches = 0; sample.length = 0; res.json({ ok: true }); });
app.get('/migration', async (req, res) => res.json({ mode: MODE, primaryCount: await primary.count(), shadowCount: shadow ? await shadow.count() : null, shadowReads, mismatches, sample }));
app.listen(PORT, () => console.log(`orders-service :${PORT}  STORE=${MODE}`));
