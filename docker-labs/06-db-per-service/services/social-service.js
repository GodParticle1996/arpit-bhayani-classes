/* ex1 — "Aapke dosto ne yahan order kiya" (KhanaKart social feature).
   50,000 users, har user ke 40 dost. Har user ne 5 restaurants se order kiya.
   ENGINE=sql   → har degree ek JOIN: friendships table se rows nikalo (duplicates saath chalte hain, end mein DISTINCT)
   ENGINE=graph → graph traversal: har user ek baar (visited set), seedha padosi par jao
   GET /friends-ordered?user=42&restaurant=7&depth=3   (depth 1-4) */
const express = require('express');
const { log } = require('../lib/util');
const PORT = 4802, SVC = 'social-service';
const ENGINE = process.env.ENGINE === 'graph' ? 'graph' : 'sql';
const USERS = 50000, FRIENDS = 40, RESTAURANTS = 2000;
let seed = 11;
/* mulberry32 — har baar same data, taaki sabke numbers milte-julte aayein */
const rnd = n => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) % n; };
/* asli dost-circle jaisa: 100 groups (college, society, office) × 500 log; 40 mein se 36 dost apne hi group se */
const GROUP = 500;
const friends = Array.from({ length: USERS }, (_, u) => Array.from({ length: FRIENDS }, (_, i) => i < 36 ? Math.floor(u / GROUP) * GROUP + rnd(GROUP) : rnd(USERS)));
const ordered = Array.from({ length: USERS }, () => new Set(Array.from({ length: 5 }, () => rnd(RESTAURANTS))));

const app = express();
app.get('/friends-ordered', (req, res) => {
  const user = Number(req.query.user || 42), restaurant = Number(req.query.restaurant || 7);
  const depth = Math.min(4, Math.max(1, Number(req.query.depth || 2)));
  const t0 = process.hrtime.bigint();
  let touched = 0, people;
  if (ENGINE === 'sql') {
    let frontier = [user];                       // intermediate JOIN result rows (duplicates ke saath)
    const all = [];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const u of frontier) for (const f of friends[u]) { next.push(f); touched++; }
      for (const x of next) all.push(x);
      frontier = next;
    }
    people = new Set(all.filter(u => u !== user));        // DISTINCT sabse aakhir mein
  } else {
    const seen = new Set([user]);
    let frontier = [user];
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const u of frontier) for (const f of friends[u]) { touched++; if (!seen.has(f)) { seen.add(f); next.push(f); } }
      frontier = next;
    }
    seen.delete(user);
    people = seen;
  }
  const matches = [...people].filter(u => ordered[u].has(restaurant));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  log(SVC, `🕸️  user ${user}, depth ${depth}: ${people.size} log, ${matches.length} ne R-${restaurant} se order kiya · ${touched} rows · ${ms.toFixed(1)} ms`);
  res.json({ engine: ENGINE, depth, peopleInNetwork: people.size, orderedHere: matches.length, rowsTouched: touched, ms: Number(ms.toFixed(1)) });
});
app.listen(PORT, () => log(SVC, `:${PORT}  ENGINE=${ENGINE}  ${USERS} users × ${FRIENDS} dost`));
