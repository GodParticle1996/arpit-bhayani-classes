/* ex2 — purana KhanaKart monolith. Payments ka response jaldi mein bana tha — ajeeb field names.
   GET /legacy/payment?oid=O-501  → {"s":1,"amt_paise":34000,"ts":1726560000,"m":"U"}
   GET /menu/:rid                 → bhaari query, 250 ms
   GET /api/profile               → normal endpoint */
const express = require('express');
const { log, sleep } = require('../lib/util');
const PORT = 4911, SVC = 'monolith';
const app = express();
let menuHits = 0;
app.get('/legacy/payment', async (req, res) => { await sleep(80); res.set('x-served-by', 'monolith').json({ s: 1, amt_paise: 34000, ts: 1726560000, m: 'U', oid: req.query.oid }); });
app.get('/menu/:rid', async (req, res) => { menuHits++; await sleep(250); res.set('x-served-by', 'monolith').json({ restaurant: req.params.rid, dishes: ['Paneer Tikka ₹260', 'Dal Makhani ₹220', 'Butter Naan ₹40'] }); });
app.get('/api/profile', (req, res) => res.set('x-served-by', 'monolith').json({ name: 'Priya', city: 'Pune' }));
app.get('/stats', (req, res) => res.json({ menuHits }));
app.listen(PORT, () => log(SVC, `:${PORT}`));
