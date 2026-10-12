/* ex1 — chaar backend services ek file mein (ROLE se). Har ek ka apna data, apna latency.
   order       (4901) GET /orders/:id              → { id, riderId, restaurantId, items, total }
   payment     (4902) GET /payments/by-order/:id   → { status, method }
   delivery    (4903) GET /tracking/:riderId       → { rider, etaMin, lat, lng }   ← riderId order se aata hai
   restaurant  (4904) GET /restaurants/:id         → { name, phone } */
const express = require('express');
const { log, sleep } = require('../lib/util');
const ROLE = process.env.ROLE;
const PORTS = { order: 4901, payment: 4902, delivery: 4903, restaurant: 4904 };
const LAT = { order: 120, payment: 150, delivery: 200, restaurant: 100 };
const app = express();
let calls = 0;
const slow = async () => { calls++; await sleep(LAT[ROLE]); };

app.get('/orders/:id', async (req, res) => { await slow(); res.json({ id: req.params.id, riderId: 'RD-17', restaurantId: 'R-4', items: [{ name: 'Paneer Tikka', qty: 1, price: 260 }, { name: 'Butter Naan', qty: 2, price: 40 }], total: 340 }); });
app.get('/payments/by-order/:id', async (req, res) => { await slow(); res.json({ orderId: req.params.id, status: 'PAID', method: 'UPI' }); });
app.get('/tracking/:riderId', async (req, res) => { await slow(); res.json({ rider: req.params.riderId === 'RD-17' ? 'Ramesh' : '?', etaMin: 14, lat: 18.52, lng: 73.85 }); });
app.get('/restaurants/:id', async (req, res) => { await slow(); res.json({ id: req.params.id, name: 'Sharma Dhaba', phone: '+91-20-xxxx' }); });
app.get('/stats', (req, res) => res.json({ role: ROLE, calls }));
app.listen(PORTS[ROLE], () => log(ROLE + '-service', `:${PORTS[ROLE]}  latency ${LAT[ROLE]}ms`));
