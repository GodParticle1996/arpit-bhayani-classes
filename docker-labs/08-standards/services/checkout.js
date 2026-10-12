/* ex2 — checkout-service (kit): cart → coupon → pricing. */
const { createService } = require('../kit');
const svc = createService('checkout', 5001);
svc.app.post('/v1/checkouts', async (req, res) => {
  const code = req.body && req.body.coupon;
  try {
    const cart = await svc.call('cart', `http://${process.env.CART_HOST || 'localhost'}:5002/v1/carts/c-9`, { req, timeoutMs: 800 });
    let discount = 0;
    if (code) {
      const c = await svc.call('coupon', `http://${process.env.COUPON_HOST || 'localhost'}:5003/v1/coupons/validate`, { req, method: 'POST', body: { code }, timeoutMs: 800 });
      discount = c.discount || 0;
    }
    const p = await svc.call('pricing', `http://${process.env.PRICING_HOST || 'localhost'}:5004/price?cart=${cart.id}&discount=${discount}`, { req, timeoutMs: 800 });
    res.json({ traceId: req.traceId, total: p.total, discount });
  } catch (e) {
    svc.log('error', 'checkout fail', { traceId: req.traceId, error: e.message, coupon: code });
    res.status(502).json({ traceId: req.traceId, error: 'checkout fail' });
  }
});
svc.listen();
