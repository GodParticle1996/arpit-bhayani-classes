#!/usr/bin/env node
/* npm run trace <traceId>
   Choreography ka sabse bada sawaal: "event gaya? sabko mila? sabne kaam kiya?" — teeno ek table mein. */
const traceId = process.argv[2];
if (!traceId) { console.log('Use: npm run trace <traceId>   (traceId order ke jawab mein milta hai)'); process.exit(1); }
const get = url => fetch(url).then(r => r.json()).catch(() => null);
(async () => {
  const t = await get(`http://localhost:4710/trace/${traceId}`);
  if (!t) { console.log('pubsub (4710) se baat nahi hui'); process.exit(1); }
  console.log(`\n1) Event publish hua?  ${t.published ? '✅ haan (' + t.topic + ')' : '❌ nahi'}`);
  if (!t.published) return;
  const did = {};
  for (let port = 4712; port <= 4719; port++) {
    const s = await get(`http://localhost:${port}/seen/${traceId}`);
    if (s && s.service) did[s.service] = s.did;
  }
  console.log('\n   subscriber        2) broker ke hisaab se     3) subscriber ne asal mein kiya?');
  console.log('   ----------------  -------------------------  -------------------------------');
  Object.entries(t.groups).forEach(([g, status]) => {
    const icon = status === 'acked' ? '✅ acked' : status === 'delivered' ? '⏳ delivered, ack nahi' : '📦 queue mein pending';
    const work = did[g] ? '✅ ' + did[g].action : (g in did ? '❌ koi record nahi' : '❔ service se jawab nahi');
    console.log(`   ${g.padEnd(16)}  ${icon.padEnd(25)}  ${work}`);
  });
  console.log('\n   Jis subscriber ne baad mein subscribe kiya, woh is list mein nahi hoga — use sirf naye events milenge.\n');
})();
