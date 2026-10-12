#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>  */
const { spawn } = require('child_process');
const path = require('path');
const EX = {
  'ex1-shared-write': [['db-server', {}], ['restaurant-service', {}], ['review-service', {}]],
  'ex2-four-pains': [['db-server', {}], ['restaurant-service', {}], ['review-service', {}], ['order-service', {}], ['analytics-jobs', {}]],
  'ex3-guardrails': [
    ['db-server', { READONLY_ANALYTICS: '1' }], ['db-server', { ROLE: 'replica', READONLY_ANALYTICS: '1' }],
    ['order-service', {}], ['analytics-jobs', { USE_REPLICA: '1' }],
  ],
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
