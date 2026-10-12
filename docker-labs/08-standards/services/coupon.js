/* ex2 — coupon-service (kit). COUPON_BUG=1 → DIWALI coupon par code crash (naya config field missing). */
const { createService, sleep } = require('../kit');
const svc = createService('coupon', 5003);
const BUG = process.env.COUPON_BUG === '1';
const COUPONS = { KHANA50: { percent: 50, max: 100 }, FREEDEL: { percent: 0, max: 0, freeDelivery: true }, DIWALI: BUG ? undefined : { percent: 20, max: 150 } };
svc.app.post('/v1/coupons/validate', async (req, res) => {
  await sleep(20);
  const code = (req.body && req.body.code) || '';
  try {
    if (!(code in COUPONS)) return res.status(404).json({ valid: false });
    const c = COUPONS[code];
    const discount = Math.min(c.max, Math.round(340 * c.percent / 100));     // DIWALI bug: c undefined
    res.json({ valid: true, discount });
  } catch (e) {
    svc.log('error', 'coupon validate crash', { traceId: req.traceId, code, error: e.message });
    res.status(500).json({ error: 'internal' });
  }
});
svc.listen();
