/* ex1 — ek hi endpoint sab clients ke liye.
   HACK=0 → sabko poora jawab (web ke hisaab se bana)
   HACK=1 → ?platform=web|app|alexa par core backend mein if-else (har naye client/tweak par yahan badlaav) */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 5210, SVC = 'generic-api';
const HACK = process.env.HACK === '1';
const R = `http://${host('restaurant')}:5201`, RV = `http://${host('reviews')}:5202`, O = `http://${host('orders')}:5203`;
const app = express();
const branchesHit = {};
let variants = new Set();

app.get('/v1/restaurant-page/:id', async (req, res) => {
  const platform = HACK ? (req.query.platform || 'web') : 'web';
  variants.add(platform);
  const [r, rv] = await Promise.all([callJson(`${R}/v1/restaurants/${req.params.id}`), callJson(`${RV}/v1/restaurants/${req.params.id}/reviews?limit=50`)]);
  let body = Object.assign({}, r, { reviews: rv });
  if (HACK) {
    const hit = b => { branchesHit[b] = (branchesHit[b] || 0) + 1; };
    if (platform === 'app') { hit('app: gallery 1 photo'); body.gallery = body.gallery.slice(0, 1); hit('app: menu chhota'); body.menu = body.menu.slice(0, 30).map(m => ({ id: m.id, name: m.name, price: m.price, veg: m.veg })); hit('app: reviews 3'); body.reviews = { avg: rv.avg, count: rv.count, items: rv.items.slice(0, 3) }; hit('app: faqs hatao'); delete body.faqs; }
    else if (platform === 'alexa') { hit('alexa: speech'); const last = await callJson(`${O}/v1/users/u42/last-order`); body = { speech: `${r.name}, ${r.rating} star. Pichhla order ${last.items.map(i => i.name).join(' aur ')}, ${last.total} rupaye. Dobara order karein?` }; }
    else { hit('web: kuch nahi'); }
  }
  res.json(body);
});
app.get('/stats', (req, res) => res.json({ hack: HACK, variantsServed: [...variants], ifElseBranchesInCore: Object.keys(branchesHit).length, branchesHit, note: HACK ? 'har naya client/tweak = core backend ka code + deploy' : 'sab ko ek hi shape' }));
app.listen(PORT, () => log(SVC, `:${PORT}  HACK=${HACK ? 1 : 0}`));
