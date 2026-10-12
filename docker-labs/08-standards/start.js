#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const env = process.env;
const EX = {
  'ex1-template': [['rewards-legacy', {}]],
  'ex2-observability': [['cart', {}], ['coupon', { COUPON_BUG: env.COUPON_BUG || '0' }], ['pricing-legacy', {}], ['checkout', {}]],
  'ex3-interfaces': [['orders-api', { STYLE: 'messy' }], ['orders-api', { STYLE: 'standard' }]],
  'ex4-tolerance': [['avatar', { AVATAR_DOWN: env.AVATAR_DOWN || '0' }], ['profile', {}]],
};
const name = process.argv[2];
if (!EX[name]) { console.log('Kaunsi exercise?\n' + Object.keys(EX).map(k => '  npm start ' + k).join('\n')); process.exit(1); }
const logs = path.join(__dirname, 'logs');
fs.readdirSync(logs).filter(f => f.endsWith('.log')).forEach(f => fs.unlinkSync(path.join(logs, f)));    // har run saaf logs se
const kids = EX[name].map(([s, e]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', s + '.js')], { env: Object.assign({}, process.env, e), stdio: 'inherit' });
  p.on('exit', code => { if (code) console.log(`\n⚠️  ${s} band ho gayi (exit ${code})\n`); });
  return p;
});
const stop = () => { kids.forEach(k => k.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
