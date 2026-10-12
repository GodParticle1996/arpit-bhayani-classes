#!/usr/bin/env node
/* Docker ke bina chalane ka launcher.
     npm start ex1-monolith
     COUPON_BUG=1 npm start ex1-split
   Har exercise ki services alag Node processes mein chalti hain — bilkul
   docker compose jaisa, bas containers ke bina. Ctrl+C se sab band. */
const { spawn } = require('child_process');
const path = require('path');

const EX = {
  'ex1-monolith': [['monolith', {}]],
  'ex1-split': [['menu-service', {}], ['coupon-service', {}], ['order-service', {}]],
  'ex2-direct-db': [['delivery-service', {}], ['order-reads-db', {}], ['order-uses-api', {}]],
  'ex3-shared-code': [
    ['menu-service', { PRICING_MODE: 'shared', FEE_VERSION: '2' }],     // menu ko naya deploy mila
    ['order-service', { PRICING_MODE: 'shared', FEE_VERSION: '1' }],    // order abhi purane deploy par
    ['coupon-service', {}],
  ],
  'ex3-owned': [
    ['pricing-service', { FEE_VERSION: '2' }],
    ['menu-service', { PRICING_MODE: 'owned' }],
    ['order-service', { PRICING_MODE: 'owned' }],
    ['coupon-service', {}],
  ],
};

const name = process.argv[2];
if (!EX[name]) {
  console.log('Kaunsi exercise chalani hai?\n');
  Object.keys(EX).forEach(k => console.log('  npm start ' + k));
  process.exit(1);
}

const kids = EX[name].map(([svc, env]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', svc + '.js')], {
    env: Object.assign({}, process.env, env), stdio: 'inherit',
  });
  p.on('exit', code => {
    if (code) console.log(`\n⚠️  ${svc} band ho gayi (exit ${code}) — baaki services abhi bhi chal rahi hain.\n`);
  });
  return p;
});
process.on('SIGINT', () => { kids.forEach(k => k.kill()); process.exit(0); });
process.on('SIGTERM', () => { kids.forEach(k => k.kill()); process.exit(0); });
