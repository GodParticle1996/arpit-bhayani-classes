/* ex3 — do order APIs, wahi data, alag design (STYLE env).
   STYLE=messy    (5011): har developer ne apne tareeke se route banaye, offset pagination
   STYLE=standard (5012): KhanaKart API standard — /v1, plural nouns, cursor pagination, JSON
   Dono mein har 40 ms ek naya order aata hai (sabse naya sabse upar) — asli app jaisa.
   GET /_routes → route list (api-lint ke liye) */
const express = require('express');
const STYLE = process.env.STYLE === 'standard' ? 'standard' : 'messy';
const PORT = STYLE === 'standard' ? 5012 : 5011;
const app = express();
app.use(express.json());
let seq = 0;
const orders = [];                                                   // newest first
const add = () => { seq++; orders.unshift({ id: `O-${seq}`, userId: 'u1', total: 200 + (seq % 7) * 20, createdAt: seq }); };
for (let i = 0; i < 300; i++) add();
setInterval(add, 40).unref();

if (STYLE === 'messy') {
  const routes = [
    { method: 'GET', path: '/getOrdersForUser', query: ['userId', 'page', 'size'] },
    { method: 'POST', path: '/order/createNew' },
    { method: 'GET', path: '/v2/orderDetails/:id' },
    { method: 'GET', path: '/orders_and_payments/:userId' },
    { method: 'GET', path: '/api/order-status/:id/v1', produces: 'text/plain' },
  ];
  app.get('/_routes', (req, res) => res.json({ style: STYLE, routes }));
  app.get('/getOrdersForUser', (req, res) => {
    const page = Number(req.query.page || 1), size = Number(req.query.size || 20);
    res.json({ Orders: orders.slice((page - 1) * size, page * size), page_no: page });
  });
  app.post('/order/createNew', (req, res) => { add(); res.json({ order_id: orders[0].id }); });
  app.get('/v2/orderDetails/:id', (req, res) => res.json(orders.find(o => o.id === req.params.id) || {}));
  app.get('/orders_and_payments/:userId', (req, res) => res.json({ orders: orders.slice(0, 5), payments: [] }));
  app.get('/api/order-status/:id/v1', (req, res) => res.type('text/plain').send('status=DELIVERED'));
} else {
  const routes = [
    { method: 'GET', path: '/v1/users/:userId/orders', query: ['limit', 'cursor'] },
    { method: 'POST', path: '/v1/orders' },
    { method: 'GET', path: '/v1/orders/:orderId' },
    { method: 'GET', path: '/v1/orders/:orderId/payments' },
    { method: 'GET', path: '/v1/orders/:orderId/status' },
  ];
  app.get('/_routes', (req, res) => res.json({ style: STYLE, routes }));
  app.get('/v1/users/:userId/orders', (req, res) => {
    const limit = Math.min(100, Number(req.query.limit || 20));
    const after = req.query.cursor ? Number(Buffer.from(req.query.cursor, 'base64url').toString()) : Infinity;
    const page = orders.filter(o => o.createdAt < after).slice(0, limit);
    const last = page[page.length - 1];
    res.json({ data: page, nextCursor: last ? Buffer.from(String(last.createdAt)).toString('base64url') : null });
  });
  app.post('/v1/orders', (req, res) => { add(); res.status(201).json({ data: orders[0] }); });
  app.get('/v1/orders/:orderId', (req, res) => res.json({ data: orders.find(o => o.id === req.params.orderId) || null }));
  app.get('/v1/orders/:orderId/payments', (req, res) => res.json({ data: [] }));
  app.get('/v1/orders/:orderId/status', (req, res) => res.json({ data: { status: 'DELIVERED' } }));
}
app.listen(PORT, () => console.log(`orders-api (${STYLE}) :${PORT}`));
