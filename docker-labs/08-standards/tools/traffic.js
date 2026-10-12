#!/usr/bin/env node
/* npm run traffic [n=40] — n checkouts, alag-alag coupons. Ek fail hua traceId print karta hai. */
const n = Number(process.argv[2] || 40);
const codes = ['KHANA50', 'FREEDEL', 'DIWALI', '', 'KHANA50'];
(async () => {
  const stats = {}; let failTrace = null;
  for (let i = 0; i < n; i++) {
    const coupon = codes[i % codes.length];
    const r = await fetch('http://localhost:5001/v1/checkouts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ coupon }) });
    const j = await r.json();
    stats[r.status] = (stats[r.status] || 0) + 1;
    if (!r.ok && !failTrace) failTrace = j.traceId;
  }
  console.log(`${n} checkouts → ${Object.entries(stats).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
  if (failTrace) console.log(`Ek fail hua checkout ka traceId: ${failTrace}\n  → npm run logs ${failTrace}`);
})().catch(e => { console.log('npm start ex2-observability chal raha hai?', e.message); process.exit(1); });
