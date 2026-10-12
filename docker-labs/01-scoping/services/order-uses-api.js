/* ex2 — SAHI tareeka: order-service sirf delivery-service ke contract (API) se baat karti hai */
const express = require('express');
const { log, getJson, host } = require('../lib/util');
const app = express();
const PORT = 4203;
const SVC = 'order-uses-api';

app.get('/orders/:id/tracking', async (req, res) => {
  try {
    const r = await getJson(`http://${host('delivery-service')}:4201/v1/riders/r7/eta`, 500);
    res.json({ orderId: req.params.id, etaMinutes: r.etaMinutes, via: 'delivery-service API contract' });
  } catch (e) {
    res.status(503).json({ error: 'ETA abhi nahi mila: ' + e.message, via: 'delivery-service API contract' });
  }
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/orders/o1/tracking  (sirf API contract)`));
