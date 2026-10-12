/* ex3 — composer ki seemayein.
   MEM_LIMIT_MB (default 64) = container ki memory limit (docker mem_limit / Kubernetes limits.memory jaisa).
   Gateway ginta hai ek waqt par kitna response data pakde baitha hai ("held"). Limit paar → OOMKilled (exit 137).
   GET /home-feed?n=20&mode=buffer   → 20 full menus fetch + parse + merge MEMORY mein, phir ek saath bhejo
   GET /home-feed?n=20&mode=stream   → har menu aate hi seedha response mein likho (parse nahi, jodna nahi)
   GET /restaurant-page/:id?partial=0|1 → menu summary + reviews + offers; reviews down par
        partial=0 → 502 (sab ya kuch nahi), partial=1 → 200 + "degraded":["reviews"]
   GET /stats → heap MB, peak heap MB */
const express = require('express');
const { log, host } = require('../lib/util');
const PORT = 4920, SVC = 'gateway-heavy';
const B = (role, path) => `http://${host(role)}:${{ menu: 4921, reviews: 4922, offers: 4923 }[role]}${path}`;
const app = express();
const LIMIT = Number(process.env.MEM_LIMIT_MB || 64) * 1048576;
let held = 0, peakHeld = 0, inflight = 0, served = 0;
const mb = n => Math.round(n / 1048576);
function hold(bytes) {
  held += bytes;
  peakHeld = Math.max(peakHeld, held);
  if (held > LIMIT) {
    log(SVC, `💥 OOMKilled — ${mb(held)} MB response data memory mein, container limit ${mb(LIMIT)} MB`);
    process.exit(137);
  }
}

app.get('/home-feed', async (req, res) => {
  const n = Math.min(60, Number(req.query.n || 20));
  const mode = req.query.mode === 'stream' ? 'stream' : 'buffer';
  inflight++;
  try {
    const ids = Array.from({ length: n }, (_, i) => `R-${i + 1}`);
    if (mode === 'buffer') {
      let mine = 0;
      try {
        const texts = await Promise.all(ids.map(id => fetch(B('menu', `/restaurants/${id}/full-menu`)).then(r => r.text()).then(t => { mine += t.length; hold(t.length); return t; })));
        const merged = { restaurants: texts.map(t => JSON.parse(t)), count: texts.length, generatedAt: new Date().toISOString() };
        const body = JSON.stringify(merged);
        mine += body.length; hold(body.length);                 // jodne ke baad poora body bhi memory mein
        await new Promise(r => res.type('json').send(body).on('finish', r));
      } finally { held -= mine; }
    } else {
      res.type('json');
      res.write('{"restaurants":[');
      for (let i = 0; i < ids.length; i += 4) {
        const chunk = await Promise.all(ids.slice(i, i + 4).map(id => fetch(B('menu', `/restaurants/${id}/full-menu`)).then(r => r.text())));
        const bytes = chunk.reduce((a, t) => a + t.length, 0);
        hold(bytes);
        try {
          for (let j = 0; j < chunk.length; j++) {
            if (!res.write((i + j ? ',' : '') + chunk[j])) await new Promise(r => res.once('drain', r));
          }
        } finally { held -= bytes; }                           // likhte hi chhod do
      }
      res.end(`],"count":${n}}`);
    }
    served++;
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ error: e.message });
  } finally { inflight--; }
});

app.get('/restaurant-page/:id', async (req, res) => {
  const partial = req.query.partial === '1';
  const parts = ['offers', 'reviews'];
  const got = await Promise.allSettled(parts.map(p => fetch(B(p, `/restaurants/${req.params.id}/${p}`)).then(r => { if (!r.ok) throw new Error(`${p} ${r.status}`); return r.json(); })));
  const failed = parts.filter((_, i) => got[i].status === 'rejected');
  if (failed.length && !partial) return res.status(502).json({ error: `${failed.join(', ')} fail — poora page fail` });
  const body = { restaurant: req.params.id, name: 'Sharma Dhaba' };
  parts.forEach((p, i) => { body[p] = got[i].status === 'fulfilled' ? got[i].value : null; });
  if (failed.length) body.degraded = failed;
  res.json(body);
});

app.get('/stats', (req, res) => res.json({ heldMB: mb(held), peakHeldMB: mb(peakHeld), memLimitMB: mb(LIMIT), rssMB: mb(process.memoryUsage().rss), inflight, served }));
app.listen(PORT, () => log(SVC, `:${PORT}  container memory limit ${mb(LIMIT)} MB`));
