/* review-service — naya review aaya, restaurant ki rating update karni hai.
   MODE=direct → restaurants table mein seedha UPDATE avg_rating (shared DB pattern)
   MODE=api    → restaurant-service ke contract ko call */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4502, SVC = 'review-service';
const MODE = process.env.MODE || 'direct';

app.post('/reviews', async (req, res) => {
  const id = Number(req.body.restaurantId || 7), avg = Number(req.body.newAvg || 4.4);
  const t0 = Date.now();
  try {
    if (MODE === 'direct') {
      /* review team ne 2019 mein schema dekh ke yeh likha tha — column naam HARDCODED */
      const r = await callJson(`http://${host('db-primary')}:5432/query`, { method: 'POST', timeoutMs: 5000,
        body: { user: 'review_svc', pass: 'rev1ew', op: 'update', table: 'restaurants', where: { id }, set: { avg_rating: avg } } });
      return res.json({ ok: true, via: 'shared DB (seedha UPDATE)', updated: r.updated, tookMs: Date.now() - t0 });
    }
    const r = await callJson(`http://${host('restaurant-service')}:4501/v1/restaurants/${id}/rating`, { method: 'POST', body: { avgRating: avg }, timeoutMs: 5000 });
    res.json({ ok: true, via: r.via, updated: r.updated, tookMs: Date.now() - t0 });
  } catch (e) {
    log(SVC, '💥', e.message, JSON.stringify(e.body || {}));
    res.status(500).json({ ok: false, via: MODE, error: (e.body && e.body.error) || e.message, tookMs: Date.now() - t0 });
  }
});
app.listen(PORT, () => log(SVC, `POST http://localhost:${PORT}/reviews  (MODE=${MODE})`));
