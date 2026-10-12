#!/usr/bin/env node
/* npm run clients <generic|hack|bff>
   Teen clients restaurant page kholte hain: desktop web (fast wifi), mobile app (4G: RTT 250 ms, 1.5 Mbps), Alexa.
   Har ek kitne bytes paata hai aur kitne asal mein screen par use hote hain. */
const mode = process.argv[2] || 'generic';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NET = { web: { rtt: 40, mbps: 50 }, app: { rtt: 250, mbps: 1.5 }, alexa: { rtt: 80, mbps: 10 } };
const USED = { web: null, app: 30 * 60 + 3 * 120 + 400, alexa: 250 };                 // app: 30 items + 3 reviews + header (bytes, andaaza)
function url(client) {
  if (mode === 'bff') return { web: 'http://localhost:5221/restaurant-page/R-4', app: 'http://localhost:5222/restaurant-page/R-4', alexa: 'http://localhost:5223/restaurant-page/R-4' }[client];
  return `http://localhost:5210/v1/restaurant-page/R-4${mode === 'hack' ? `?platform=${client}` : ''}`;
}
(async () => {
  console.log(`\nmode=${mode}\n`);
  console.log('  client   bytes aaye   screen par use   bekaar     network time (andaaza)');
  for (const client of ['web', 'app', 'alexa']) {
    const t = await fetch(url(client), { headers: client === 'app' ? { 'x-app-attestation': 'play-integrity-ok' } : {} }).then(r => r.text());
    const bytes = Buffer.byteLength(t);
    const used = USED[client] === null ? bytes : Math.min(bytes, USED[client]);
    const netMs = Math.round(NET[client].rtt + (bytes * 8) / (NET[client].mbps * 1e6) * 1000);
    const size = b => (b < 1024 ? `${b} B` : `${Math.round(b / 1024)} KB`);
    console.log(`  ${client.padEnd(7)}  ${size(bytes).padEnd(11)}  ${size(used).padEnd(15)}  ${(Math.round((bytes - used) / Math.max(1, bytes) * 100) + '%').padEnd(9)}  ${netMs} ms`);
    if (client === 'alexa') { let spoken = '(JSON — Alexa isse bol nahi sakta)'; try { const j = JSON.parse(t); if (j.speech) spoken = `"${j.speech}"`; } catch (e) {} console.log(`\n  Alexa bolega: ${spoken}`); }
    await sleep(50);
  }
  if (mode !== 'bff') { const s = await fetch('http://localhost:5210/stats').then(r => r.json()); console.log(`\n  core backend: ${s.ifElseBranchesInCore} platform if-else branches, variants ${JSON.stringify(s.variantsServed)} — ${s.note}`); }
  console.log('');
})().catch(e => { console.log('services chal rahi hain? (npm start ex1-one-endpoint / ex2-bffs)\n', e.message); process.exit(1); });
