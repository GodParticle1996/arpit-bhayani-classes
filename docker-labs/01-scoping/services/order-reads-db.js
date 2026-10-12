/* ex2 — GALAT tareeka: order-service seedha delivery ke database (file) mein jhaankti hai */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { log } = require('../lib/util');
const app = express();
const PORT = 4202;
const SVC = 'order-reads-db';
const FILE = path.join(__dirname, '..', 'data', 'riders.json');

app.get('/orders/:id/tracking', (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const rider = db.riders.find(r => r.id === 'r7');     // delivery ke table ka naam aur column yahan HARDCODED
    res.json({ orderId: req.params.id, etaMinutes: rider.eta_min, via: 'delivery ka DB seedha padha' });
  } catch (e) {
    log(SVC, '💥', e.message);
    res.status(500).json({ error: e.message, via: 'delivery ka DB seedha padha' });
  }
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/orders/o1/tracking  (delivery ka DB seedha padhti hai)`));
