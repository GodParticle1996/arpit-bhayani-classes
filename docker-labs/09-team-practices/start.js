#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const env = process.env;
const EX = {
  'ex1-data-decision': [['delivery-json', { RIDER_SEARCH_MS: env.RIDER_SEARCH_MS || '0' }], ['delivery-bin', { RIDER_SEARCH_MS: env.RIDER_SEARCH_MS || '0' }]],
  'ex2-swap-store': [['orders', { STORE: env.STORE || 'file' }]],
  'ex3-template-drift': [],
};
const name = process.argv[2];
if (!EX[name]) { console.log('Kaunsi exercise?\n' + Object.keys(EX).map(k => '  npm start ' + k).join('\n')); process.exit(1); }
if (!EX[name].length) { console.log('ex3 mein koi service nahi chalti. Seedha:\n  npm run drift\n  npm run rfc "Template mein OpenTelemetry tracing default"\n  ls docs/adr'); process.exit(0); }
const kids = EX[name].map(([s, e]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', s + '.js')], { env: Object.assign({}, process.env, e), stdio: 'inherit' });
  p.on('exit', code => { if (code) console.log(`\n⚠️  ${s} band ho gayi (exit ${code})\n`); });
  return p;
});
const stop = () => { kids.forEach(k => k.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
