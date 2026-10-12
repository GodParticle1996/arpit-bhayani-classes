/* search-async (ex3) — analytics ko CALL hi nahi karti. Analytics khud counts push karti hai,
   search apni copy (in-memory "index") se jawab deti hai. */
const express = require('express');
const { log } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4403, SVC = 'search-async';
let index = { r1: null, r2: null, r3: null }, updatedAt = null;

app.post('/ingest/order-counts', (req, res) => {
  index = Object.assign(index, req.body);
  updatedAt = new Date().toISOString();
  res.json({ ok: true });
});
app.get('/search', (req, res) => {
  const t0 = Date.now();
  const results = [{ id: 'r1', name: 'Meghana Foods' }, { id: 'r2', name: 'Truffles' }, { id: 'r3', name: 'Empire' }]
    .map(r => Object.assign(r, { ordersToday: index[r.id] }));
  const ageSec = updatedAt ? Math.round((Date.now() - Date.parse(updatedAt)) / 1000) : null;
  res.json({ tookMs: Date.now() - t0, countsAgeSeconds: ageSec, results });
});
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/search  (apne index se — analytics ko call nahi karti)`));
