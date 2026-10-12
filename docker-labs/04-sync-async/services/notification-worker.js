/* ex3 — notification worker: broker se "order_placed" uthao, email bhejo (400 ms).
   WORKERS=N parallel consumers. EMAIL_DOWN=1 → email provider fail → nack → retry → DLQ */
const { log, callJson, sleep, host } = require('../lib/util');
const SVC = 'notif-worker';
const WORKERS = Number(process.env.WORKERS || 2);
let sent = 0;
async function worker(n) {
  for (;;) {
    let m;
    try { m = await callJson(`http://${host('broker')}:4620/topics/order_placed/consume`, { method: 'POST', timeoutMs: 2000 }); }
    catch (e) { await sleep(1000); continue; }
    if (m.empty) { await sleep(200); continue; }
    await sleep(400);                                     // email provider call
    if (process.env.EMAIL_DOWN === '1') {
      log(SVC, `w${n}: ❌ email fail for ${m.body.orderId} (attempt ${m.attempts}) → nack`);
      await callJson(`http://${host('broker')}:4620/nack/${m.id}`, { method: 'POST', timeoutMs: 2000 }).catch(() => {});
      continue;
    }
    await callJson(`http://${host('broker')}:4620/ack/${m.id}`, { method: 'POST', timeoutMs: 2000 }).catch(() => {});
    sent++;
    if (sent % 25 === 0) log(SVC, `📧 ${sent} emails bheje`);
  }
}
log(SVC, `${WORKERS} workers shuru (EMAIL_DOWN=${process.env.EMAIL_DOWN === '1'})`);
for (let i = 1; i <= WORKERS; i++) worker(i);
