/* ex3 — menu-service: dish id se naam, daam, photo. */
const express = require('express');
const { log, sleep } = require('../lib/util');
const PORT = 4724, SVC = 'menu-service';
const DISHES = {
  d1: { name: 'Paneer Butter Masala', price: 240, photo: '/img/d1.jpg' },
  d4: { name: 'Hyderabadi Veg Biryani', price: 260, photo: '/img/d4.jpg' },
  d7: { name: 'Masala Dosa', price: 120, photo: '/img/d7.jpg' },
  d9: { name: 'Gulab Jamun (2 pc)', price: 80, photo: '/img/d9.jpg' },
};
const app = express();
let calls = 0;
app.get('/dishes/:id', async (req, res) => {
  calls++;
  await sleep(40);
  const d = DISHES[req.params.id];
  if (!d) return res.status(404).json({ error: 'nahi mila' });
  res.json(Object.assign({ id: req.params.id }, d));
});
app.get('/stats', (req, res) => res.json({ calls }));
app.listen(PORT, () => log(SVC, `:${PORT}`));
