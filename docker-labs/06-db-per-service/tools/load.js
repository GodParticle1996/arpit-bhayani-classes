#!/usr/bin/env node
/* npm run load [N] — Instamart par N orders EK SAATH (sab ek hi doodh ke liye).
   Phir dono services ka stock check: jitne orders placed, utna hi stock kam hua? */
const N = Number(process.argv[2] || 20);
const post = async url => { const t0 = Date.now(); const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); return Object.assign({ ms: Date.now() - t0 }, await r.json()); };
const get = url => fetch(url).then(r => r.json());
(async () => {
  const mode = (await get('http://localhost:4820/')).MODE;
  const t0 = Date.now();
  const rs = await Promise.all(Array.from({ length: N }, () => post('http://localhost:4820/orders')));
  const total = Date.now() - t0;
  const count = s => rs.filter(r => r.status === s).length;
  const placed = count('placed');
  console.log(`MODE=${mode}: ${N} orders ek saath → placed ${placed}, failed ${count('failed')}${count('coordinator-crashed') ? `, crashed ${count('coordinator-crashed')}` : ''}`);
  console.log(`  kul time ${total} ms · sabse dheema order ${Math.max(...rs.map(r => r.ms))} ms · ${(N / (total / 1000)).toFixed(1)} orders/sec`);
  const reasons = {};
  rs.filter(r => r.reason).forEach(r => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
  if (Object.keys(reasons).length) console.log('  fail kyun:', JSON.stringify(reasons));
  const inv = await get('http://localhost:4821/stats');
  const expected = inv.start - placed;
  console.log(`  doodh stock: ${inv.available} (hona chahiye ${expected}) ${inv.available === expected ? '✅ sahi' : `❌ ${expected - inv.available} packet atke/gayab`}`);
  if (inv.lockHolder) {
    console.log(`  🔒 inventory lock abhi bhi ${inv.lockHolder} ke paas (${inv.lockHeldMs} ms se)`);
    const late = await post('http://localhost:4820/orders');
    console.log(`  ek naya order ab: ${late.status} ${late.reason ? '(' + late.reason + ')' : ''} — ${late.ms} ms`);
  }
})().catch(e => { console.log('services chal rahi hain? npm start ex3-distributed-txn\n', e.message); process.exit(1); });
