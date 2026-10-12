#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const leaf = (NAME, PORT, extra) => ['leaf', Object.assign({ NAME, PORT: String(PORT) }, extra || {})];
const EX = {
  'ex1-sync-chain': [
    leaf('restaurant', 4602, { LATENCY_MS: '300' }),
    leaf('delivery', 4603, { LATENCY_MS: '600' }),
    leaf('notification', 4604, { LATENCY_MS: '400', DOWN: process.env.NOTIF_DOWN === '1' ? '1' : '0' }),
    ['order-sync', {}],
  ],
  'ex2-cascade': [
    leaf('tax', 4614, { LATENCY_MS: '50', DOWN: process.env.TAX_DOWN === '1' ? '1' : '0' }),
    ['chain', { ROLE: 'pricing' }], ['chain', { ROLE: 'order' }], ['chain', { ROLE: 'gateway' }],
  ],
  'ex3-broker': [['broker', {}], ['order-async', {}], ['notification-worker', {}]],
};
const name = process.argv[2];
if (!EX[name]) { console.log('Kaunsi exercise?\n' + Object.keys(EX).map(k => '  npm start ' + k).join('\n')); process.exit(1); }
const kids = EX[name].map(([svc, env]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', svc + '.js')], { env: Object.assign({}, process.env, env), stdio: 'inherit' });
  p.on('exit', code => { if (code) console.log(`\n⚠️  ${svc} band ho gayi (exit ${code})\n`); });
  return p;
});
const stop = () => { kids.forEach(k => k.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
