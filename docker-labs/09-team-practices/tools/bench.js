#!/usr/bin/env node
/* npm run bench [calls=4000] [concurrency=40]
   Order-service → delivery-service: REST/JSON vs binary/HTTP2. Bahas opinion se nahi, data se. */
const http = require('http');
const http2 = require('http2');
const { encodeReq, decodeRes } = require('../lib/codec');
const CALLS = Number(process.argv[2] || 4000), C = Number(process.argv[3] || 40);
const order = i => ({ orderId: i, restaurant: { lat: 18.5204, lng: 73.8567 }, drop: { lat: 18.5310, lng: 73.8446 }, items: [{ sku: 'paneer-tikka', qty: 1 }, { sku: 'butter-naan', qty: 2 }], priority: 'normal', note: 'gate 2 se aana' });
const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
async function run(label, one) {
  const lat = []; let reqBytes = 0, resBytes = 0, next = 0;
  const cpu0 = process.cpuUsage(); const t0 = Date.now();
  await Promise.all(Array.from({ length: C }, async () => {
    while (next < CALLS) { const i = next++; const s = process.hrtime.bigint(); const r = await one(i); lat.push(Number(process.hrtime.bigint() - s) / 1e6); reqBytes += r.req; resBytes += r.res; }
  }));
  const wall = Date.now() - t0; const cpu = process.cpuUsage(cpu0);
  lat.sort((a, b) => a - b);
  return { label, reqB: Math.round(reqBytes / CALLS), resB: Math.round(resBytes / CALLS), p50: pct(lat, 0.5).toFixed(2), p99: pct(lat, 0.99).toFixed(2), rps: Math.round(CALLS / (wall / 1000)), cpuMs: Math.round((cpu.user + cpu.system) / 1000) };
}
(async () => {
  const agent = new http.Agent({ keepAlive: true, maxSockets: C });
  const json = await run('REST: HTTP/1.1 + JSON', i => new Promise((resolve, reject) => {
    const body = JSON.stringify(order(i));
    const req = http.request({ host: 'localhost', port: 5101, path: '/v1/assignments', method: 'POST', agent, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => { const t = Buffer.concat(chunks); JSON.parse(t); resolve({ req: Buffer.byteLength(body), res: t.length }); });
    });
    req.on('error', reject); req.end(body);
  }));
  const session = http2.connect('http://localhost:5102');
  const bin = await run('Binary: HTTP/2 + codec', i => new Promise((resolve, reject) => {
    const body = encodeReq(order(i));
    const s = session.request({ ':method': 'POST', ':path': '/assign', 'content-type': 'application/octet-stream' });
    const chunks = []; s.on('data', c => chunks.push(c)); s.on('end', () => { const t = Buffer.concat(chunks); decodeRes(t); resolve({ req: body.length, res: t.length }); }); s.on('error', reject);
    s.end(body);
  }));
  session.close(); agent.destroy();
  console.log(`\n${CALLS} calls, ${C} ek saath\n`);
  console.log('  tareeka                   req bytes  res bytes  p50 ms  p99 ms  calls/s  client CPU ms');
  for (const r of [json, bin]) console.log(`  ${r.label.padEnd(24)}  ${String(r.reqB).padEnd(9)}  ${String(r.resB).padEnd(9)}  ${r.p50.padEnd(6)}  ${r.p99.padEnd(6)}  ${String(r.rps).padEnd(7)}  ${r.cpuMs}`);
  const d = Number(json.p50) - Number(bin.p50);
  const cpu = Math.round(100 - (bin.cpuMs / json.cpuMs) * 100);
  console.log(`\n  Data kya kehta hai:`);
  console.log(`   • Payload ${(json.reqB / bin.reqB).toFixed(1)}× chhota (bandwidth, mobile/cross-region traffic par kaam ka)`);
  console.log(`   • Client CPU ${cpu >= 0 ? cpu + '% kam' : Math.abs(cpu) + '% zyada'} binary mein`);
  console.log(`   • p50 latency farak ${Math.abs(d).toFixed(2)} ms (${Math.abs(d) < 1 ? 'lagbhag barabar' : d > 0 ? 'binary tez' : 'JSON tez'}) — 150 ms ke rider search ke saamne ${(Math.abs(d) / 150 * 100).toFixed(1)}%`);
  console.log('\n  "gRPC hamesha tez" ek opinion tha. Yeh table meeting mein le jao — faisla bandwidth, CPU bill, tooling aur debugging dekh ke.');
  console.log('  Downstream kaam ke saath dobara naapo: RIDER_SEARCH_MS=150 npm start ex1-data-decision\n');
})().catch(e => { console.log('services chal rahi hain? npm start ex1-data-decision\n', e.message); process.exit(1); });
