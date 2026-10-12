/* ex3 — teen backends ek file mein (ROLE se).
   menu    (4921) GET /restaurants/:id/full-menu  → ~200 KB JSON (400 dishes, lambi descriptions)
   reviews (4922) GET /restaurants/:id/reviews    → DOWN=1 par 503
   offers  (4923) GET /restaurants/:id/offers */
const express = require('express');
const { log, sleep } = require('../lib/util');
const ROLE = process.env.ROLE;
const PORT = { menu: 4921, reviews: 4922, offers: 4923 }[ROLE];
const DOWN = process.env.DOWN === '1';
const app = express();
const DESC = 'Tandoor mein pakaaya, ghar ke masaale, taaza paneer, dhaniya aur nimbu ke saath. '.repeat(5);
const bigMenu = id => ({ restaurant: id, dishes: Array.from({ length: 400 }, (_, i) => ({ id: `${id}-d${i}`, name: `Dish ${i}`, price: 100 + (i % 30) * 10, veg: i % 3 !== 0, description: DESC, tags: ['bestseller', 'spicy', 'chef-special'] })) });
app.get('/restaurants/:id/full-menu', async (req, res) => { await sleep(50); res.json(bigMenu(req.params.id)); });
app.get('/restaurants/:id/reviews', async (req, res) => { await sleep(80); if (DOWN) return res.status(503).json({ error: 'reviews down' }); res.json({ avg: 4.3, count: 1820, top: ['Paneer ekdum soft', 'Delivery jaldi'] }); });
app.get('/restaurants/:id/offers', async (req, res) => { await sleep(60); res.json({ offers: ['50% off upto ₹100', 'Free delivery above ₹199'] }); });
app.listen(PORT, () => log(ROLE + '-service', `:${PORT}${DOWN ? '  💀 DOWN' : ''}`));
