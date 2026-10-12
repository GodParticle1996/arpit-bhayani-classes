/* ex1 — KhanaKart ka purana monolith: menu, coupon, checkout — sab EK process mein */
const express = require('express');
const { log } = require('../lib/util');
const app = express();
const PORT = 4000;
const SVC = 'monolith';

app.get('/menu', (req, res) => {
  res.json({ restaurant: 'Meghana Foods', items: [{ name: 'Chicken Biryani', price: 320 }, { name: 'Paneer Biryani', price: 280 }] });
});

app.get('/coupon/apply', (req, res) => {
  if (process.env.COUPON_BUG === '1') {
    log(SVC, '💥 coupon module mein bug — poora process gir raha hai');
    /* ek unhandled error: asli bug jaisa — null par property padhna */
    setImmediate(() => { const c = null; return c.code.toUpperCase(); });
    return res.json({ note: 'coupon check shuru...' });
  }
  res.json({ code: 'KHANA50', discount: 50 });
});

app.get('/checkout', (req, res) => {
  const total = 320;
  const discount = process.env.COUPON_BUG === '1' ? 0 : 50;
  res.json({ total: total - discount, discount });
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}  (menu + coupon + checkout ek hi process mein)`));
