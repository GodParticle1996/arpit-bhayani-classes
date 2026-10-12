#!/usr/bin/env node
/* npm run scorecard <name> <port> — "good service" checklist: manageable, observable, debuggable. */
const fs = require('fs');
const path = require('path');
const [name, port] = process.argv.slice(2);
if (!name || !port) { console.log('Use: npm run scorecard <name> <port>'); process.exit(1); }
const base = `http://localhost:${port}`;
const checks = [];
const add = (group, label, ok, note) => checks.push({ group, label, ok, note });
(async () => {
  const h = await fetch(`${base}/health`).then(async r => ({ ok: r.ok, j: await r.json().catch(() => null) })).catch(() => null);
  if (h === null) { console.log(`${base} se baat nahi hui — service chal rahi hai?`); process.exit(1); }
  add('observable', 'GET /health', h.ok && h.j && h.j.status === 'ok');
  const m = await fetch(`${base}/metrics`).then(r => r.ok ? r.text() : '').catch(() => '');
  add('observable', 'GET /metrics (Prometheus format)', m.includes('http_requests_total'));
  const trace = `scorecard-${Date.now()}`;
  const r = await fetch(`${base}/__scorecard_probe`, { headers: { 'x-trace-id': trace } }).catch(() => null);
  add('debuggable', 'x-trace-id response mein wapas', !!(r && r.headers.get('x-trace-id') === trace));
  await new Promise(res => setTimeout(res, 300));
  const file = path.join(__dirname, '..', 'logs', `${name}.log`);
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').slice(-50) : [];
  const json = lines.map(l => { try { return JSON.parse(l); } catch (e) { return null; } });
  add('debuggable', 'Logs JSON mein', lines.length > 0 && json.every(Boolean), lines.length ? `${json.filter(Boolean).length}/${lines.length} lines JSON` : 'log file nahi');
  add('debuggable', 'Log mein traceId se request mili', json.some(j => j && j.traceId === trace));
  add('manageable', 'Runbook (services/<name>.runbook.md)', fs.existsSync(path.join(__dirname, '..', 'services', `${name}.runbook.md`)));
  const src = path.join(__dirname, '..', 'services', `${name}.js`);
  add('manageable', 'Standard kit (khanakart-kit) use karti hai', fs.existsSync(src) && fs.readFileSync(src, 'utf8').includes("require('../kit')"));
  console.log(`\nScorecard: ${name} (:${port})\n`);
  for (const g of ['manageable', 'observable', 'debuggable']) {
    console.log(`  ${g.toUpperCase()}`);
    checks.filter(c => c.group === g).forEach(c => console.log(`    ${c.ok ? '✅' : '❌'} ${c.label}${c.note ? `  (${c.note})` : ''}`));
  }
  const score = checks.filter(c => c.ok).length;
  console.log(`\n  Score: ${score}/${checks.length} ${score === checks.length ? '🌟 good service' : ''}\n`);
})();
