/* ex2 — naya payment microservice (monolith se nikala). Saaf response. */
const express = require('express');
const { log, sleep } = require('../lib/util');
const PORT = 4912, SVC = 'payment-service';
const app = express();
app.get('/payments/:orderId', async (req, res) => { await sleep(40); res.set('x-served-by', 'payment-service').json({ orderId: req.params.orderId, status: 'PAID', amount: 340, method: 'UPI', paidAt: '2024-09-17T10:40:00Z' }); });
app.listen(PORT, () => log(SVC, `:${PORT}`));
