/* ex1 split + ex3 — order-service */
const express = require('express');
const { log, getJson, host } = require('../lib/util');
const app = express();
const PORT = Number(process.env.PORT || 4103);
const SVC = 'order-service';
const MODE = process.env.PRICING_MODE || 'none';

app.get('/checkout', async (req, res) => {
  const food = 320;
  let discount = 0, couponNote = 'ok';
  try {
    const c = await getJson(`http://${host('coupon-service')}:4102/coupon/apply`, 300);
    discount = c.discount || 0;
  } catch (e) {
    couponNote = 'coupon-service jawab nahi de rahi — bina discount ke order lo';
    log(SVC, '⚠️', couponNote, `(${e.message})`);
  }
  let fee = 0, feeSource = 'none';
  try {
    if (MODE === 'shared') {
      const deliveryFee = require('../lib/pricing');
      fee = deliveryFee(3);
      feeSource = `shared code (FEE_VERSION=${process.env.FEE_VERSION || '1'})`;
    } else if (MODE === 'owned') {
      const p = await getJson(`http://${host('pricing-service')}:4303/v1/fee?distanceKm=3`);
      fee = p.fee;
      feeSource = 'pricing-service API';
    }
  } catch (e) {
    feeSource = 'pricing unavailable: ' + e.message;
  }
  res.json({ food, discount, deliveryFeeCharged: fee, feeSource, total: food - discount + fee, couponNote });
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/checkout  (pricing: ${MODE})`));
