#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const env = process.env;
const EX = {
  'ex1-composer': [
    ['backend', { ROLE: 'order' }], ['backend', { ROLE: 'payment' }], ['backend', { ROLE: 'delivery' }], ['backend', { ROLE: 'restaurant' }],
    ['composer', {}],
  ],
  'ex2-gateway-powers': [
    ['monolith', {}], ['payment-service', {}],
    ['gateway', { STRANGLER: env.STRANGLER || '0', CACHE: env.CACHE || '0', RATE_LIMIT: env.RATE_LIMIT || '10' }],
  ],
  'ex3-composer-limits': [
    ['heavy-backends', { ROLE: 'menu' }], ['heavy-backends', { ROLE: 'reviews', DOWN: env.REVIEWS_DOWN === '1' ? '1' : '0' }], ['heavy-backends', { ROLE: 'offers' }],
    ['gateway-heavy', { MEM_LIMIT_MB: env.MEM_LIMIT_MB || '64' }],
  ],
};
const name = process.argv[2];
if (!EX[name]) { console.log('Kaunsi exercise?\n' + Object.keys(EX).map(k => '  npm start ' + k).join('\n')); process.exit(1); }
const kids = EX[name].map(([s, e]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', s + '.js')], { env: Object.assign({}, process.env, e), stdio: 'inherit' });
  p.on('exit', code => { if (code) console.log(`\n⚠️  ${s} band ho gayi (exit ${code})\n`); });
  return p;
});
const stop = () => { kids.forEach(k => k.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
