#!/usr/bin/env node
/* node tools/seed.js — purane store (file) mein 300 orders, 3 users. Migration se pehle ki duniya. */
const makeStore = require('../lib/stores');
(async () => {
  const s = makeStore('file');
  await s.reset();
  let t = 1700000000000;
  for (let i = 0; i < 300; i++) await s.put({ id: `O-${t + i}`, userId: `u${(i % 3) + 1}`, total: 150 + (i % 9) * 30, createdAt: t + i });
  console.log(`file store mein ${await s.count()} orders`);
})();
