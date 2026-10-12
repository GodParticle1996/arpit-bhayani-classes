#!/usr/bin/env node
/* npm run mobile — 4G phone jaisa client. Har round trip par RTT_MS (default 250) jodta hai.
   Teen tareeke se "Aapke liye" section bharo aur time dekho. */
const RTT = Number(process.env.RTT_MS || 250);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const trip = async url => { await sleep(RTT / 2); const r = await fetch(url).then(x => x.json()); await sleep(RTT / 2); return r; };
(async () => {
  let t0 = Date.now(), trips = 1;
  const ids = (await trip('http://localhost:4723/recommendations/u42')).ids;
  for (const id of ids) { await trip(`http://localhost:4724/dishes/${id}`); trips++; }
  console.log(`A) sirf ids, phir har dish alag (ek ke baad ek): ${trips} round trips, ${Date.now() - t0} ms`);

  t0 = Date.now(); trips = 1;
  const ids2 = (await trip('http://localhost:4723/recommendations/u42')).ids;
  await Promise.all(ids2.map(id => trip(`http://localhost:4724/dishes/${id}`))); trips += ids2.length;
  console.log(`B) sirf ids, phir saari dishes parallel:         ${trips} round trips, ${Date.now() - t0} ms`);

  t0 = Date.now();
  const r = await trip('http://localhost:4723/recommendations/u42?enrich=1');
  console.log(`C) server ne sync call karke bhar ke diya:       1 round trip, ${Date.now() - t0} ms  (${r.items.map(i => i.name).join(', ')})`);
})().catch(e => { console.log('services chal rahi hain? npm start ex3-otp-and-recs\n', e.message); process.exit(1); });
