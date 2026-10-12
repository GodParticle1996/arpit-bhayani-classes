/* ex2 — cart-service (kit). */
const { createService, sleep } = require('../kit');
const svc = createService('cart', 5002);
svc.app.get('/v1/carts/:id', async (req, res) => {
  await sleep(30);
  res.json({ id: req.params.id, items: [{ sku: 'paneer-tikka', qty: 1, price: 260 }, { sku: 'butter-naan', qty: 2, price: 40 }], subtotal: 340 });
});
svc.listen();
