#!/usr/bin/env node
/* npm run drift — kaunsi service template se kitni peeche hai, kya missing hai, aur uska risk. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const tpl = JSON.parse(fs.readFileSync(path.join(root, 'templates', 'khanakart-service', 'template.json'), 'utf8'));
const RISK = {
  'circuit-breaker': 'cascade risk (ADR-0002)',
  'prometheus-metrics': 'dashboard par andhera (ADR-0003)',
  'grpc-internal': 'internal contract/deadlines nahi (ADR-0001)',
  'redis-client': 'cache setup khud karna padega (ADR-0004)',
  'rest-external': 'external API standard se bahar',
  'folder-structure': 'naye engineer ko dhoondhna mushkil',
};
const ver = v => v.split('.').map(Number).reduce((a, n) => a * 100 + n, 0);
const rows = fs.readdirSync(path.join(root, 'manifests')).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(root, 'manifests', f), 'utf8')));
console.log(`\nTemplate ${tpl.name} v${tpl.version}\n`);
console.log('  service        owner           version  status');
console.log('  -------------  --------------  -------  ------------------------------------------');
for (const r of rows.sort((a, b) => ver(a.templateVersion) - ver(b.templateVersion))) {
  const missing = Object.keys(tpl.features).filter(f => !r.features.includes(f) && !(r.optOut && r.optOut[f]));
  const status = missing.length ? `❌ missing: ${missing.join(', ')}` : (ver(r.templateVersion) < ver(tpl.version) ? '🟡 peeche, features theek' : '✅ up to date');
  console.log(`  ${r.service.padEnd(13)}  ${r.owner.padEnd(14)}  ${r.templateVersion.padEnd(7)}  ${status}`);
  missing.forEach(m => console.log(`  ${''.padEnd(40)}   ↳ ${m}: ${RISK[m]}`));
  Object.entries(r.optOut || {}).forEach(([f, why]) => console.log(`  ${''.padEnd(40)}   ↳ opt-out ${f}: "${why}"`));
  (r.custom || []).forEach(c => console.log(`  ${''.padEnd(40)}   ↳ custom: ${c}`));
}
console.log('\n  Opt-out galat nahi — bina reason ka opt-out galat hai. Template badalna ho toh: npm run rfc "<title>"\n');
