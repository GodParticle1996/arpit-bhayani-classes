#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env variables upar se pass karo) */
const { spawn } = require('child_process');
const path = require('path');
const EX = {
  'ex1-timeout': [['analytics-service', {}], ['search-service', {}]],
  'ex2-idempotency': [['bank', {}], ['payment-service', {}]],
  'ex3-async-ingest': [['search-async', {}], ['analytics-service', { PUSH_TO_SEARCH: '1' }]],
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
