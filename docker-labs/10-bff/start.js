#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const env = process.env;
const core = [['core', { ROLE: 'restaurant' }], ['core', { ROLE: 'reviews' }], ['core', { ROLE: 'orders' }]];
const bffs = shared => ['web', 'mobile', 'voice'].map(KIND => ['bff', { KIND, SHARED_LIB: shared }]);
const EX = {
  'ex1-one-endpoint': [...core, ['generic-api', { HACK: env.HACK || '0' }]],
  'ex2-bffs': [...core, ...bffs(env.SHARED_LIB || '1')],
  'ex3-bff-costs': [...core, ...bffs(env.SHARED_LIB || '0')],
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
