/* restaurant-service — restaurants table ki MAALIK. Rating update ka contract: POST /v1/restaurants/:id/rating */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4501, SVC = 'restaurant-service';
const DB = `http://${host('db-primary')}:5432/query`;
const CRED = { user: 'restaurant_svc', pass: 'r3st' };
const RATING = (process.env.SCHEMA || 'v1') === 'v2' ? 'rating_avg' : 'avg_rating';   // maalik apna schema jaanta hai

app.post('/v1/restaurants/:id/rating', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const r = await callJson(DB, { method: 'POST', body: Object.assign({ op: 'update', table: 'restaurants', where: { id }, set: { [RATING]: req.body.avgRating } }, CRED), timeoutMs: 5000 });
    res.json({ ok: true, via: 'restaurant-service API', updated: r.updated });
  } catch (e) { res.status(502).json({ error: e.message, body: e.body }); }
});
app.get('/v1/restaurants/:id', async (req, res) => {
  try {
    const r = await callJson(DB, { method: 'POST', body: Object.assign({ op: 'select', table: 'restaurants', where: { id: Number(req.params.id) } }, CRED), timeoutMs: 8000 });
    const row = r.rows[0] || {};
    res.json({ id: row.id, name: row.name, avgRating: row[RATING], dbWaitMs: r.waited, totalMs: r.totalMs });
  } catch (e) { res.status(502).json({ error: e.message }); }
});
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/v1/restaurants/7  (schema ${process.env.SCHEMA || 'v1'})`));
