/* ex1 split + ex3 — menu-service */
const express = require('express');
const { log, getJson, host } = require('../lib/util');
const app = express();
const PORT = Number(process.env.PORT || 4101);
const SVC = 'menu-service';
const MODE = process.env.PRICING_MODE || 'none';   // ex3: 'shared' | 'owned'

app.get('/menu', async (req, res) => {
  const out = { restaurant: 'Meghana Foods', items: [{ name: 'Chicken Biryani', price: 320 }] };
  try {
    if (MODE === 'shared') {
      const deliveryFee = require('../lib/pricing');
      out.deliveryFeeShown = deliveryFee(3);
      out.feeSource = `shared code (FEE_VERSION=${process.env.FEE_VERSION || '1'})`;
    } else if (MODE === 'owned') {
      const p = await getJson(`http://${host('pricing-service')}:4303/v1/fee?distanceKm=3`);
      out.deliveryFeeShown = p.fee;
      out.feeSource = 'pricing-service API';
    }
  } catch (e) {
    out.deliveryFeeShown = null;
    out.feeSource = 'pricing unavailable: ' + e.message;
  }
  res.json(out);
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/menu  (pricing: ${MODE})`));
