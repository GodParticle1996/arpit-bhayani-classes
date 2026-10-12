/* order-service — checkout par menu items padhti hai (shared DB se). Latency dekho jab analytics bhari query chalaye. */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
const PORT = 4503, SVC = 'order-service';
app.get('/checkout/:restaurantId', async (req, res) => {
  const t0 = Date.now();
  try {
    const r = await callJson(`http://${host('db-primary')}:5432/query`, { method: 'POST', timeoutMs: 10000,
      body: { user: 'order_svc', pass: '0rder', op: 'select', table: 'menu_items', where: { restaurant_id: Number(req.params.restaurantId) } } });
    res.json({ items: r.rows.length, dbWaitMs: r.waited, tookMs: Date.now() - t0 });
  } catch (e) { res.status(502).json({ error: e.message, tookMs: Date.now() - t0 }); }
});
app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/checkout/7`));
