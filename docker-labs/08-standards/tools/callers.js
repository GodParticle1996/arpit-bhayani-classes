#!/usr/bin/env node
/* npm run callers [seconds=5]
   Do callers profile-service ko ek saath:
     recommendation — naye deploy mein bug: 60 parallel loops, bina ruke (ek galat retry loop)
     checkout       — normal: 4 parallel loops, har call ke baad 50 ms */
const SECS = Number(process.argv[2] || 5);
const end = Date.now() + SECS * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = { recommendation: [], checkout: [] };
async function loop(caller, pause) {
  let i = 0;
  while (Date.now() < end) {
    const t0 = Date.now();
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(`http://localhost:5021/v1/profiles/u${++i}`, { headers: { 'x-caller': caller }, signal: ctrl.signal });
      await r.text();
      res[caller].push({ s: r.status, ms: Date.now() - t0 });
    } catch (e) { res[caller].push({ s: 'timeout', ms: Date.now() - t0 }); }
    clearTimeout(t);
    if (pause) await sleep(pause);
  }
}
(async () => {
  await Promise.all([...Array.from({ length: 60 }, () => loop('recommendation', 0)), ...Array.from({ length: 4 }, () => loop('checkout', 50))]);
  console.log(`\n${SECS} second ka hisaab:\n`);
  for (const [caller, rows] of Object.entries(res)) {
    const by = {}; rows.forEach(r => { by[r.s] = (by[r.s] || 0) + 1; });
    const ok = rows.filter(r => r.s === 200).map(r => r.ms).sort((a, b) => a - b);
    const p = q => ok.length ? ok[Math.min(ok.length - 1, Math.floor(ok.length * q))] : '-';
    console.log(`  ${caller.padEnd(15)} ${Object.entries(by).map(([s, c]) => `${s}: ${c}`).join('  ').padEnd(34)} ok p50 ${p(0.5)} ms, p99 ${p(0.99)} ms`);
  }
  console.log('');
})();
