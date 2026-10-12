#!/usr/bin/env node
/* npm run heavy <buffer|stream> [concurrency=12] [n=20]
   Diwali home feed: `concurrency` users lagataar 6 second tak home feed khol rahe hain. */
const mode = process.argv[2] === 'stream' ? 'stream' : 'buffer';
const C = Number(process.argv[3] || 12), N = Number(process.argv[4] || 20);
const end = Date.now() + 6000;
let ok = 0, fail = 0, crashed = false;
const lat = [];
async function user() {
  while (Date.now() < end && !crashed) {
    const t0 = Date.now();
    try {
      const r = await fetch(`http://localhost:4920/home-feed?n=${N}&mode=${mode}`);
      const t = await r.text();
      if (r.ok && t.length > 1000) { ok++; lat.push(Date.now() - t0); } else fail++;
    } catch (e) {
      fail++;
      try { await fetch('http://localhost:4920/stats'); } catch (_) { crashed = true; }
    }
  }
}
(async () => {
  const before = await fetch('http://localhost:4920/stats').then(r => r.json()).catch(() => null);
  if (!before) { console.log('gateway-heavy (4920) chal nahi raha — npm start ex3-composer-limits'); process.exit(1); }
  await Promise.all(Array.from({ length: C }, user));
  lat.sort((a, b) => a - b);
  console.log(`mode=${mode}, ${C} users, ${N} restaurants/feed (~${Math.round(N * 0.2)} MB har response)`);
  console.log(`  feeds served ${ok}, failed ${fail}, p50 ${lat[Math.floor(lat.length / 2)] || '-'} ms`);
  const after = await fetch('http://localhost:4920/stats').then(r => r.json()).catch(() => null);
  if (!after || crashed) console.log(`  💥 GATEWAY OOMKilled — ek saath itna data pakda ki ${before.memLimitMB} MB container limit paar (gateway logs dekho)`);
  else console.log(`  gateway ne ek waqt par sabse zyada ${after.peakHeldMB} MB response data pakda (limit ${after.memLimitMB} MB)`);
})();
