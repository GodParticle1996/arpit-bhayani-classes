/* Core backend services (general purpose, sab clients ke liye ek jaise). ROLE se.
   restaurant (5201) GET /v1/restaurants/:id          → sab kuch: gallery, 120 menu items, FAQs, offers + internal fields
   reviews    (5202) GET /v1/restaurants/:id/reviews?limit=50
   orders     (5203) GET /v1/users/:userId/last-order */
const express = require('express');
const { log, sleep } = require('../lib/util');
const ROLE = process.env.ROLE;
const PORT = { restaurant: 5201, reviews: 5202, orders: 5203 }[ROLE];
const app = express();
let calls = 0;
const LONG = 'Tandoor mein dheemi aanch par pakaaya, ghar ke masaalon aur taaze makhan ke saath. ';
app.use((req, res, next) => { calls++; next(); });

app.get('/v1/restaurants/:id', async (req, res) => {
  await sleep(40);
  res.json({
    id: req.params.id, name: 'Sharma Dhaba', rating: 4.3, cuisines: ['North Indian', 'Mughlai'], address: 'FC Road, Pune',
    gallery: Array.from({ length: 30 }, (_, i) => `https://img.khanakart.in/r4/gallery-${i}.jpg`),
    menu: Array.from({ length: 120 }, (_, i) => ({ id: `d${i}`, name: `Dish ${i}`, price: 120 + (i % 20) * 15, veg: i % 3 !== 0, description: LONG.repeat(2), tags: ['bestseller', 'spicy'], nutrition: { kcal: 300 + i, protein: 12 } })),
    faqs: Array.from({ length: 20 }, (_, i) => ({ q: `Sawaal ${i}?`, a: LONG })),
    offers: ['50% off upto ₹100', 'Free delivery above ₹199'],
    commissionPct: 22, gstin: '27ABCDE1234F1Z5', ownerPhone: '+91-98xxxxxx21',
  });
});
app.get('/v1/restaurants/:id/reviews', async (req, res) => {
  await sleep(50);
  const limit = Math.min(50, Number(req.query.limit || 50));
  res.json({ avg: 4.3, count: 1820, items: Array.from({ length: limit }, (_, i) => ({ user: `user${i}`, stars: 3 + (i % 3), text: LONG.repeat(3), photos: [`https://img.khanakart.in/rev/${i}.jpg`] })) });
});
app.get('/v1/users/:userId/last-order', async (req, res) => {
  await sleep(30);
  res.json({ orderId: 'O-8812', restaurantId: 'R-4', items: [{ name: 'Paneer Tikka', qty: 1, price: 260 }, { name: 'Butter Naan', qty: 2, price: 40 }], total: 340 });
});
app.get('/stats', (req, res) => res.json({ role: ROLE, calls }));
app.listen(PORT, () => log(ROLE + '-service', `:${PORT}`));
