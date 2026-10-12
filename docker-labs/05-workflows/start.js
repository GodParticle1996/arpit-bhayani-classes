#!/usr/bin/env node
/* Docker ke bina launcher:  npm start <exercise>   (env upar se) */
const { spawn } = require('child_process');
const path = require('path');
const step = (NAME, PORT, extra) => ['step', Object.assign({ NAME, PORT: String(PORT) }, extra || {})];
const sub = (NAME, PORT, extra) => ['subscriber', Object.assign({ NAME, PORT: String(PORT) }, extra || {})];
const env = process.env;
const EX = {
  'ex1-orchestrator': [
    step('restaurant', 4702, { LATENCY_MS: '300' }),
    step('notification', 4703, { LATENCY_MS: '400', DOWN: env.NOTIF_DOWN === '1' ? '1' : '0' }),
    step('delivery', 4704, { LATENCY_MS: '600', FAIL_FIRST: env.RIDER_FAIL_FIRST || '0' }),
    step('loyalty', 4705, { LATENCY_MS: '200' }),
    ['orchestrator', {}],
  ],
  'ex2-choreography': [
    ['pubsub', {}],
    ['order-chor', {}],
    sub('notification', 4712, { WORK_MS: '400', PAUSED: env.NOTIF_DOWN === '1' ? '1' : '0' }),
    sub('restaurant', 4713, { WORK_MS: '300', SKIP_WORK: env.RESTAURANT_BUG === '1' ? '1' : '0' }),
    sub('delivery', 4714, { WORK_MS: '600' }),
  ],
  'ex3-otp-and-recs': [
    ['pubsub', {}],
    ['sms-gateway', { DOWN: env.SMS_DOWN === '1' ? '1' : '0' }],
    ['auth-service', { MODE: env.MODE || 'sync' }],
    sub('otp-worker', 4716, { TOPIC: 'otp_requested', FORWARD_URL: 'http://localhost:4722/send', BACKLOG_MS: env.BACKLOG_MS || '6000' }),
    ['menu-service', {}],
    ['recommendation', {}],
  ],
};
const name = process.argv[2];
if (!EX[name]) { console.log('Kaunsi exercise?\n' + Object.keys(EX).map(k => '  npm start ' + k).join('\n')); process.exit(1); }
const kids = EX[name].map(([svc, e]) => {
  const p = spawn(process.execPath, [path.join(__dirname, 'services', svc + '.js')], { env: Object.assign({}, process.env, e), stdio: 'inherit' });
  p.on('exit', code => { if (code) console.log(`\n⚠️  ${svc} band ho gayi (exit ${code})\n`); });
  return p;
});
const stop = () => { kids.forEach(k => k.kill()); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
