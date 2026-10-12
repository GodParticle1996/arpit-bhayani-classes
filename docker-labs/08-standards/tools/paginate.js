#!/usr/bin/env node
/* npm run paginate <port> — user "My orders" mein 10 page scroll karta hai (har page ke beech 300 ms),
   aur usi dauraan naye orders aate rehte hain. Duplicate aur chhoote orders gino. */
const port = process.argv[2];
if (!port) { console.log('Use: npm run paginate <port>'); process.exit(1); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const meta = await fetch(`http://localhost:${port}/_routes`).then(r => r.json());
  const seen = new Map();
  let cursor = null;
  for (let page = 1; page <= 10; page++) {
    let items;
    if (meta.style === 'messy') {
      items = (await fetch(`http://localhost:${port}/getOrdersForUser?userId=u1&page=${page}&size=20`).then(r => r.json())).Orders;
    } else {
      const j = await fetch(`http://localhost:${port}/v1/users/u1/orders?limit=20${cursor ? '&cursor=' + cursor : ''}`).then(r => r.json());
      items = j.data; cursor = j.nextCursor;
    }
    items.forEach(o => seen.set(o.id, (seen.get(o.id) || 0) + 1));
    await sleep(300);
  }
  const ids = [...seen.keys()].map(id => Number(id.slice(2)));
  const dup = [...seen.values()].filter(c => c > 1).length;
  const max = Math.max(...ids), min = Math.min(...ids);
  const missing = max - min + 1 - ids.length;
  console.log(`\n${meta.style}: 10 pages × 20 = 200 rows padhi`);
  console.log(`  alag orders dikhe: ${seen.size}`);
  console.log(`  duplicate (do baar dikhe): ${dup} ${dup ? '❌' : '✅'}`);
  console.log(`  beech ke chhoote orders: ${missing} ${missing ? '❌' : '✅'}\n`);
})().catch(e => { console.log('npm start ex3-interfaces chal raha hai?', e.message); process.exit(1); });
