/* ex2/ex3 — Backend for Frontend. KIND=web|mobile|voice. Sirf presentation: kya fetch, kaise, kya bhejna. Business logic nahi.
   web    (5221) GET /restaurant-page/:id  → poora page (internal fields hata ke)
   mobile (5222) GET /restaurant-page/:id  → chhota page; header x-app-attestation zaroori (mobile ka security check)
   voice  (5223) GET /restaurant-page/:id  → Alexa speech + reprompt
   Sab: GET /cart-summary?total=250 → delivery fee text (ex3)
   Env: SHARED_LIB=1 → lib/display.js use; warna har BFF ka apna copy (voice ka copy purana — DRIFT) */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const KIND = process.env.KIND || 'web';
const PORT = { web: 5221, mobile: 5222, voice: 5223 }[KIND];
const SVC = `${KIND}-bff`;
const SHARED = process.env.SHARED_LIB === '1';
const R = `http://${host('restaurant')}:5201`, RV = `http://${host('reviews')}:5202`, O = `http://${host('orders')}:5203`;
const app = express();

/* --- ex3: duplication. Bina shared lib ke har BFF ne niyam copy kiya tha; niyam badla, voice BFF update karna bhool gaye. --- */
const localIsFree = {
  web: total => total > 199,
  mobile: total => total > 199,
  voice: total => total > 299,          // purana niyam ₹299 — copy update karna bhool gaye
}[KIND];
const isFree = SHARED ? require('../lib/display').isFreeDelivery : localIsFree;
/* wording har client ki apni (presentation) — niyam shared */
const deliveryText = total => KIND === 'voice'
  ? (isFree(total) ? 'delivery free hai' : 'delivery ke 30 rupaye lagenge')
  : (isFree(total) ? 'Free delivery' : 'Delivery ₹30');

const strip = r => { const { commissionPct, gstin, ownerPhone, ...safe } = r; return safe; };

app.get('/restaurant-page/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (KIND === 'web') {
      const [r, rv] = await Promise.all([callJson(`${R}/v1/restaurants/${id}`), callJson(`${RV}/v1/restaurants/${id}/reviews?limit=50`)]);
      return res.json(Object.assign(strip(r), { reviews: rv }));
    }
    if (KIND === 'mobile') {
      if (!req.get('x-app-attestation')) return res.status(403).json({ error: 'app attestation missing — asli KhanaKart app nahi' });
      const [r, rv] = await Promise.all([callJson(`${R}/v1/restaurants/${id}`), callJson(`${RV}/v1/restaurants/${id}/reviews?limit=3`)]);
      return res.json({
        id: r.id, name: r.name, rating: r.rating, cover: r.gallery[0], offers: r.offers,
        menu: r.menu.slice(0, 30).map(m => ({ id: m.id, name: m.name, price: m.price, veg: m.veg })),
        topReviews: rv.items.map(x => ({ stars: x.stars, text: x.text.slice(0, 80) })),
        more: { reviews: `/restaurants/${id}/reviews`, faqs: `/restaurants/${id}/faqs` },
      });
    }
    const [r, last] = await Promise.all([callJson(`${R}/v1/restaurants/${id}`), callJson(`${O}/v1/users/u42/last-order`)]);
    return res.json({
      speech: `${r.name}, ${r.rating} star. Aapka pichhla order tha ${last.items.map(i => `${i.qty} ${i.name}`).join(' aur ')}, ${last.total} rupaye. ${deliveryText(last.total)}. Kya dobara order karein?`,
      reprompt: 'Haan ya na boliye.',
    });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});
app.get('/cart-summary', (req, res) => {
  const total = Number(req.query.total || 0);
  res.json({ bff: KIND, total, deliveryText: deliveryText(total), sharedLib: SHARED });
});
app.listen(PORT, () => log(SVC, `:${PORT}${SHARED ? '  (shared display lib)' : '  (apna copy)'}`));
