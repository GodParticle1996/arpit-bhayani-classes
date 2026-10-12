#!/usr/bin/env node
/* npm run flood [N]  — IPL final: 3 second tak chat mein N log lagataar message bhej rahe hain,
   aur usi dauraan payments ek ke baad ek. Payments ka time flood se pehle aur flood ke dauraan. */
const N = Number(process.argv[2] || 60);
const DURATION = 3000;
const post = async url => { const t0 = Date.now(); const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }); await r.json(); return { ms: Date.now() - t0, ok: r.ok }; };
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
async function payments(untilOrCount) {
  const ms = [];
  const more = () => typeof untilOrCount === 'number' ? ms.length < untilOrCount : Date.now() < untilOrCount.end;
  while (more()) ms.push((await post('http://localhost:4813/pay')).ms);
  return ms;
}
(async () => {
  await payments(5);                                   // warm-up
  const before = await payments(20);
  console.log(`Flood se pehle      — payment p50 ${pct(before, 0.5)} ms, p99 ${pct(before, 0.99)} ms`);
  const end = Date.now() + DURATION;
  let chats = 0, chatSlowest = 0;
  const chatter = async () => { while (Date.now() < end) { const r = await post('http://localhost:4812/messages'); chats++; chatSlowest = Math.max(chatSlowest, r.ms); } };
  const flood = Promise.all(Array.from({ length: N }, chatter));
  const during = await payments({ end });
  await flood;
  console.log(`Chat flood (${N} log) — payment p50 ${pct(during, 0.5)} ms, p99 ${pct(during, 0.99)} ms  (${during.length} payments in 3 s)`);
  console.log(`Chat khud           — ${chats} messages in 3 s, sabse dheema ${chatSlowest} ms`);
})().catch(e => { console.log('services chal rahi hain? npm start ex2-isolation\n', e.message); process.exit(1); });
