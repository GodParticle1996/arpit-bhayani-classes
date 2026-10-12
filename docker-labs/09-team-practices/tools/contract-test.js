#!/usr/bin/env node
/* npm run contract-test <file|kv|kv-buggy>
   Ek hi test suite har store par. Naya store tabhi aayega jab yeh saare tests pass hon. */
const path = require('path');
const fs = require('fs');
const fileStore = require('../lib/stores/file-store');
const kvStore = require('../lib/stores/kv-store');
const name = process.argv[2] || 'file';
const tmp = path.join(__dirname, '..', 'data', `contract-${name}.json`);
const store = name === 'kv' ? kvStore({ file: tmp }) : name === 'kv-buggy' ? kvStore({ file: tmp, buggy: true }) : fileStore(tmp);
const tests = [];
const test = (label, fn) => tests.push([label, fn]);
const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: mila ${JSON.stringify(a)}, chahiye ${JSON.stringify(b)}`); };

test('put phir get — wahi order wapas', async () => { await store.put({ id: 'A', userId: 'u1', total: 100, createdAt: 1 }); eq(await store.get('A'), { id: 'A', userId: 'u1', total: 100, createdAt: 1 }, 'get A'); });
test('jo order nahi hai uska get → null', async () => eq(await store.get('NOPE'), null, 'get NOPE'));
test('same id dobara put → update, duplicate nahi', async () => { await store.put({ id: 'A', userId: 'u1', total: 150, createdAt: 1 }); eq((await store.get('A')).total, 150, 'total'); eq(await store.count(), 1, 'count'); });
test('listByUser — sabse naya pehle', async () => {
  await store.put({ id: 'C', userId: 'u1', total: 1, createdAt: 3 });
  await store.put({ id: 'B', userId: 'u1', total: 1, createdAt: 2 });
  eq((await store.listByUser('u1')).items.map(o => o.id), ['C', 'B', 'A'], 'order');
});
test('listByUser — doosre user ke orders nahi', async () => { await store.put({ id: 'X', userId: 'u2', total: 1, createdAt: 4 }); eq((await store.listByUser('u1')).items.map(o => o.id), ['C', 'B', 'A'], 'u1 list'); });
test('limit ka respect', async () => eq((await store.listByUser('u1', { limit: 2 })).items.length, 2, 'limit'));
test('cursor se agla page — duplicate nahi, kuch chhoota nahi', async () => {
  const p1 = await store.listByUser('u1', { limit: 2 });
  const p2 = await store.listByUser('u1', { limit: 2, cursor: p1.nextCursor });
  eq([...p1.items, ...p2.items].map(o => o.id), ['C', 'B', 'A'], 'pages');
});

(async () => {
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  console.log(`\nContract tests — store: ${store.name}\n`);
  let fail = 0;
  for (const [label, fn] of tests) {
    try { await fn(); console.log(`  ✅ ${label}`); } catch (e) { fail++; console.log(`  ❌ ${label}\n     ${e.message}`); }
  }
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  console.log(`\n  ${tests.length - fail}/${tests.length} pass ${fail ? '— yeh store abhi production ke layak nahi' : '— interface ka vaada poora'}\n`);
  process.exitCode = fail ? 1 : 0;
})();
