/* ex1 — Restaurant/dish search. 2,00,000 dishes memory mein.
   ENGINE=like  → har dish ka naam padho (SQL "WHERE name LIKE '%q%'" jaisa full scan)
   ENGINE=index → inverted index: word → dish ids (Elasticsearch jaisa), + 1-letter typo tolerance
   GET /search?q=paneer tikka */
const express = require('express');
const { log } = require('../lib/util');
const PORT = 4801, SVC = 'search-service';
const ENGINE = process.env.ENGINE === 'index' ? 'index' : 'like';

/* ---- data: 2 lakh dishes ---- */
const BASE = ['paneer', 'chicken', 'mutton', 'veg', 'egg', 'aloo', 'gobi', 'dal', 'rajma', 'chole', 'mushroom', 'fish', 'prawn', 'soya', 'corn'];
const STYLE = ['tikka', 'butter masala', 'biryani', 'curry', 'kadai', 'korma', 'fried rice', 'noodles', 'roll', 'momos', 'pulao', 'handi', 'lababdar', 'do pyaza', 'kebab'];
const EXTRA = ['', 'special', 'dhaba style', 'combo', 'family pack', 'jain', 'spicy', 'half', 'full', 'thali'];
let seed = 7;
/* mulberry32 — har baar same data, taaki sabke numbers milte-julte aayein */
const rnd = n => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) % n; };
const dishes = [];
for (let i = 0; i < 200000; i++) {
  const name = `${BASE[rnd(BASE.length)]} ${STYLE[rnd(STYLE.length)]} ${EXTRA[rnd(EXTRA.length)]}`.trim();
  dishes.push({ id: i, name, restaurant: `R-${rnd(2000)}`, rating: 3 + rnd(20) / 10 });
}

/* ---- inverted index ---- */
const index = new Map();
if (ENGINE === 'index') {
  dishes.forEach(d => new Set(d.name.split(' ')).forEach(w => { if (!index.has(w)) index.set(w, []); index.get(w).push(d.id); }));
}
const vocab = () => [...index.keys()];
function oneEditAway(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const app = express();
app.get('/search', (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const t0 = process.hrtime.bigint();
  let hits = [], scanned = 0, corrected = null;
  if (ENGINE === 'like') {
    for (const d of dishes) { scanned++; if (d.name.includes(q)) hits.push(d); }
  } else {
    const words = q.split(/\s+/).filter(Boolean).map(w => {
      if (index.has(w)) return w;
      const fix = vocab().find(v => oneEditAway(w, v));
      if (fix) corrected = (corrected ? corrected + ', ' : '') + `${w}→${fix}`;
      return fix || w;
    });
    let ids = null;
    words.forEach(w => { const list = index.get(w) || []; scanned += list.length; const s = new Set(list); ids = ids ? ids.filter(id => s.has(id)) : list.slice(); });
    hits = (ids || []).map(id => dishes[id]);
  }
  hits.sort((a, b) => b.rating - a.rating);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  log(SVC, `🔍 "${q}" → ${hits.length} results, ${scanned} rows padhi, ${ms.toFixed(2)} ms`);
  res.json({ engine: ENGINE, q, typoFix: corrected, results: hits.length, top3: hits.slice(0, 3).map(d => `${d.name} (${d.restaurant}, ⭐${d.rating.toFixed(1)})`), rowsRead: scanned, ms: Number(ms.toFixed(2)) });
});
app.listen(PORT, () => log(SVC, `:${PORT}  ENGINE=${ENGINE}  ${dishes.length} dishes${ENGINE === 'index' ? `, ${index.size} words indexed` : ''}`));
