#!/usr/bin/env node
/* npm run hop — ek extra hop kitna mehenga? 200 requests: seedha restaurant-service vs mobile BFF (restaurant + reviews + trimming). */
const N = 200;
const pct = (a, p) => a.sort((x, y) => x - y)[Math.floor(a.length * p)];
async function measure(url, headers) { const ms = []; for (let i = 0; i < N; i++) { const t = process.hrtime.bigint(); await fetch(url, { headers }).then(r => r.arrayBuffer()); ms.push(Number(process.hrtime.bigint() - t) / 1e6); } return ms; }
(async () => {
  const direct = await measure('http://localhost:5201/v1/restaurants/R-4');
  const bff = await measure('http://localhost:5222/restaurant-page/R-4', { 'x-app-attestation': 'ok' });
  console.log(`\n  seedha restaurant-service   p50 ${pct(direct, 0.5).toFixed(1)} ms  p99 ${pct(direct, 0.99).toFixed(1)} ms  (sirf restaurant, poora 120 KB+)`);
  console.log(`  mobile BFF (2 calls + trim)  p50 ${pct(bff, 0.5).toFixed(1)} ms  p99 ${pct(bff, 0.99).toFixed(1)} ms  (restaurant + reviews, ~3 KB)`);
  console.log('\n  Data center ke andar BFF hop kuch ms ka. E-commerce page ke liye theek; 5 ms budget wale trading/gaming path ke liye nahi.\n');
})().catch(e => { console.log('npm start ex3-bff-costs chal raha hai?', e.message); process.exit(1); });
