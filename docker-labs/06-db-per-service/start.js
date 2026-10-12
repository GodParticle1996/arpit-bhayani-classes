#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const env = process.env;
const per = env.DB_MODE === 'per-service';
const db = (NAME, PORT, POOL) => ['db-server', { NAME, PORT: String(PORT), POOL: String(POOL) }];
const svc = (ROLE, DB_PORT) => ['app-service', { ROLE, DB_PORT: String(DB_PORT) }];
const EX = {
  'ex1-right-db': [
    ['search-service', { ENGINE: env.ENGINE_SEARCH || 'like' }],
    ['social-service', { ENGINE: env.ENGINE_SOCIAL || 'sql' }],
  ],
  'ex2-isolation': per
    ? [db('profile-db', 5501, 5), db('chat-db', 5502, 5), db('payment-db', 5503, 5), svc('profile', 5501), svc('chat', 5502), svc('payment', 5503)]
    : [db('shared-db', 5500, 15), svc('profile', 5500), svc('chat', 5500), svc('payment', 5500)],
  'ex3-distributed-txn': [
    ['participant', { NAME: 'inventory', PORT: '4821', STOCK: '50', WORK_MS: '20', LOCK: env.MODE === 'twopc' ? '1' : '0' }],
    ['participant', { NAME: 'delivery', PORT: '4822', STOCK: '100', WORK_MS: '150', FAIL_EVERY: env.RIDER_FAIL_EVERY || '0' }],
    ['order-service', { MODE: env.MODE || 'naive' }],
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
