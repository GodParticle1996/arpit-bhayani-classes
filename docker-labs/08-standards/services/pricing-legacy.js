/* ex2 — pricing-service, purana, kit ke bina. Free-text logs, trace id nahi, /metrics nahi. */
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const out = fs.createWriteStream(path.join(__dirname, '..', 'logs', 'pricing-legacy.log'), { flags: 'a' });
const say = s => { console.log(s); out.write(s + '\n'); };
app.get('/price', async (req, res) => {
  await new Promise(r => setTimeout(r, 25));
  const total = 340 - Number(req.query.discount || 0) + 30;
  say(`[${new Date().toLocaleTimeString()}] Price calc done cart=${req.query.cart} total=${total}`);
  res.json({ total, deliveryFee: 30 });
});
app.listen(5004, () => say('pricing started'));
