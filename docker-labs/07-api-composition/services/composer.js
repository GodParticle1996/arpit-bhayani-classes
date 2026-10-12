/* ex1 — API gateway / composer. Phone ek call karta hai, gateway andar ke fast network par 4 services se data jodta hai.
   GET /order-details/:id?plan=sequential|parallel
     sequential: order → payment → restaurant → tracking (ek ke baad ek)
     parallel:   order pehle (riderId aur restaurantId chahiye), phir payment + restaurant + tracking EK SAATH */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 4900, SVC = 'composer';
const U = r => `http://${host(r)}:${{ order: 4901, payment: 4902, delivery: 4903, restaurant: 4904 }[r]}`;
const app = express();

app.get('/order-details/:id', async (req, res) => {
  const plan = req.query.plan === 'parallel' ? 'parallel' : 'sequential';
  const t0 = Date.now(), timeline = [];
  const get = async (name, url) => { const s = Date.now() - t0; const r = await callJson(url, { timeoutMs: 2000 }); timeline.push(`${name} ${s}→${Date.now() - t0} ms`); return r; };
  const order = await get('order', `${U('order')}/orders/${req.params.id}`);
  let payment, restaurant, tracking;
  if (plan === 'sequential') {
    payment = await get('payment', `${U('payment')}/payments/by-order/${order.id}`);
    restaurant = await get('restaurant', `${U('restaurant')}/restaurants/${order.restaurantId}`);
    tracking = await get('tracking', `${U('delivery')}/tracking/${order.riderId}`);
  } else {
    [payment, restaurant, tracking] = await Promise.all([
      get('payment', `${U('payment')}/payments/by-order/${order.id}`),
      get('restaurant', `${U('restaurant')}/restaurants/${order.restaurantId}`),
      get('tracking', `${U('delivery')}/tracking/${order.riderId}`),
    ]);
  }
  const body = {
    orderId: order.id, restaurant: restaurant.name, items: order.items, total: order.total,
    payment: payment.status + ' via ' + payment.method, rider: tracking.rider, etaMin: tracking.etaMin,
    _composer: { plan, ms: Date.now() - t0, timeline },
  };
  log(SVC, `🧩 ${order.id} (${plan}) ${body._composer.ms} ms`);
  res.json(body);
});
app.listen(PORT, () => log(SVC, `:${PORT}  GET /order-details/:id?plan=sequential|parallel`));
