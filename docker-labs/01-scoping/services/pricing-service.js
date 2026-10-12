/* ex3 owned — pricing ka EK maalik. Fee badalni hai? Sirf yahi service deploy hogi. */
const express = require('express');
const { log } = require('../lib/util');
const deliveryFee = require('../lib/pricing');
const app = express();
const PORT = 4303;
const SVC = 'pricing-service';

app.get('/v1/fee', (req, res) => {
  const km = Number(req.query.distanceKm || 3);
  res.json({ fee: deliveryFee(km), version: process.env.FEE_VERSION || '1' });
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/v1/fee?distanceKm=3  (FEE_VERSION=${process.env.FEE_VERSION || '1'})`));
