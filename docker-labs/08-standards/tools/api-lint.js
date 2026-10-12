#!/usr/bin/env node
/* npm run lint-api <port> — KhanaKart API standard ke 6 niyam check karta hai. */
const port = process.argv[2];
if (!port) { console.log('Use: npm run lint-api <port>   (5011 messy, 5012 standard)'); process.exit(1); }
const RULES = [
  ['R1', 'Version prefix: path /v1/... se shuru', r => /^\/v\d+\//.test(r.path)],
  ['R2', 'Path mein verbs nahi (get/create/update/delete/list/fetch)', r => !/(get|create|update|delete|list|fetch)/i.test(r.path.replace(/:[^/]+/g, ''))],
  ['R3', 'Ek path = ek resource (and / _and_ nahi)', r => !/(_and_|And|-and-)/.test(r.path)],
  ['R4', 'Collections plural, kebab-case lowercase', r => r.path.split('/').filter(s => s && !s.startsWith(':') && !/^v\d+$/.test(s)).every((s, i, arr) => /^[a-z]+(-[a-z]+)*$/.test(s) && (arr.length === 1 || s.endsWith('s') || ['status'].includes(s)))],
  ['R5', 'Pagination sirf limit + cursor', r => !r.query || r.query.filter(q => ['page', 'size', 'offset', 'page_no', 'pageSize'].includes(q)).length === 0],
  ['R6', 'Response JSON', r => !r.produces || r.produces === 'application/json'],
];
(async () => {
  const j = await fetch(`http://localhost:${port}/_routes`).then(r => r.json()).catch(() => null);
  if (!j) { console.log('service chal rahi hai? npm start ex3-interfaces'); process.exit(1); }
  let bad = 0;
  console.log(`\nAPI lint — ${j.style} (:${port})\n`);
  j.routes.forEach(r => {
    const fails = RULES.filter(([, , test]) => !test(r)).map(([id]) => id);
    bad += fails.length;
    console.log(`  ${fails.length ? '❌' : '✅'} ${r.method.padEnd(4)} ${r.path}${r.query ? '?' + r.query.join('&') : ''}${fails.length ? '   ← ' + fails.join(', ') : ''}`);
  });
  console.log('\n  Niyam:'); RULES.forEach(([id, text]) => console.log(`   ${id}  ${text}`));
  console.log(`\n  ${bad ? `${bad} violations` : '🌟 0 violations'}\n`);
})();
