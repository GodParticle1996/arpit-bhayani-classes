#!/usr/bin/env node
/* npm run backfill — purane file store se naye kv store mein copy (dobara chalana safe), phir verify. */
const crypto = require('crypto');
const makeStore = require('../lib/stores');
const hash = o => crypto.createHash('sha1').update(JSON.stringify([o.id, o.userId, o.total, o.createdAt])).digest('hex');
(async () => {
  const from = makeStore('file'), to = makeStore('kv');
  const rows = await from.all();
  let copied = 0;
  for (const o of rows) { const existing = await to.get(o.id); if (!existing || hash(existing) !== hash(o)) { await to.put(o); copied++; } }
  const target = await to.all();
  const byId = new Map(target.map(o => [o.id, hash(o)]));
  const bad = rows.filter(o => byId.get(o.id) !== hash(o)).length;
  console.log(`\nBackfill: ${rows.length} orders padhe, ${copied} copy/update kiye (baaki pehle se sahi)`);
  console.log(`Verify:   file ${rows.length} · kv ${target.length} · checksum mismatch ${bad} ${bad === 0 && rows.length === target.length ? '✅' : '❌'}\n`);
})();
