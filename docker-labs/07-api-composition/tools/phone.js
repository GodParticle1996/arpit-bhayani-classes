#!/usr/bin/env node
/* npm run phone — 4G phone jaisa client (har round trip par RTT_MS, default 250).
   Order details page teen tareeke se banao aur time + round trips + download dekho. */
const RTT = Number(process.env.RTT_MS || 250);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let bytes = 0;
const trip = async url => { await sleep(RTT / 2); const t = await (await fetch(url)).text(); bytes += t.length; await sleep(RTT / 2); return JSON.parse(t); };
async function measure(label, fn) { bytes = 0; const t0 = Date.now(); const trips = await fn(); console.log(`${label.padEnd(44)} ${String(Date.now() - t0).padStart(5)} ms · ${trips} round trips · ${bytes} bytes`); }
(async () => {
  console.log(`(phone RTT ${RTT} ms)\n`);
  await measure('A) Phone khud 4 services ko (ek ke baad ek)', async () => {
    const o = await trip('http://localhost:4901/orders/O-501');
    await trip(`http://localhost:4902/payments/by-order/${o.id}`);
    await trip(`http://localhost:4904/restaurants/${o.restaurantId}`);
    await trip(`http://localhost:4903/tracking/${o.riderId}`);
    return 4;
  });
  await measure('B) Phone khud: order, phir baaki 3 ek saath', async () => {
    const o = await trip('http://localhost:4901/orders/O-501');
    await Promise.all([trip(`http://localhost:4902/payments/by-order/${o.id}`), trip(`http://localhost:4904/restaurants/${o.restaurantId}`), trip(`http://localhost:4903/tracking/${o.riderId}`)]);
    return 4;
  });
  await measure('C) Gateway composer, sequential', async () => { await trip('http://localhost:4900/order-details/O-501?plan=sequential'); return 1; });
  await measure('D) Gateway composer, parallel', async () => { await trip('http://localhost:4900/order-details/O-501?plan=parallel'); return 1; });
  console.log('\nPhone ko 4 services ke address, 4 API formats, aur jodne ka code nahi chahiye — sirf C/D mein.');
})().catch(e => { console.log('services chal rahi hain? npm start ex1-composer\n', e.message); process.exit(1); });
