/* ex1 split — coupon-service: apna alag process */
const express = require('express');
const { log } = require('../lib/util');
const app = express();
const PORT = 4102;
const SVC = 'coupon-service';

app.get('/coupon/apply', (req, res) => {
  if (process.env.COUPON_BUG === '1') {
    log(SVC, '💥 coupon-service mein bug — sirf coupon-service gir rahi hai');
    setImmediate(() => { const c = null; return c.code.toUpperCase(); });
    return res.json({ note: 'coupon check shuru...' });
  }
  res.json({ code: 'KHANA50', discount: 50 });
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/coupon/apply`));
