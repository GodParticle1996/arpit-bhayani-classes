#!/usr/bin/env node
/* npm run logs <traceId> — "central logging": logs/*.log padh kar ek trace ki poori kahani, time ke kram mein. */
const fs = require('fs');
const path = require('path');
const trace = process.argv[2];
if (!trace) { console.log('Use: npm run logs <traceId>'); process.exit(1); }
const dir = path.join(__dirname, '..', 'logs');
const hits = [], unparsed = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.log'))) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean);
  let bad = 0;
  lines.forEach(l => { try { const j = JSON.parse(l); if (j.traceId === trace) hits.push(j); } catch (e) { bad++; } });
  if (bad) unparsed.push(`${f}: ${bad}/${lines.length} lines JSON nahi — traceId se dhoondh hi nahi sakte`);
}
hits.sort((a, b) => a.ts.localeCompare(b.ts));
console.log(`\nTrace ${trace} — ${hits.length} log lines\n`);
hits.forEach(h => {
  const extra = Object.entries(h).filter(([k]) => !['ts', 'level', 'service', 'msg', 'traceId'].includes(k)).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' ');
  console.log(`  ${h.ts.slice(11, 23)} ${h.level.padEnd(5)} ${h.service.padEnd(10)} ${h.msg}  ${extra}`);
});
if (unparsed.length) { console.log('\n  ⚠️  Andhere kone:'); unparsed.forEach(u => console.log('     ' + u)); }
console.log('');
