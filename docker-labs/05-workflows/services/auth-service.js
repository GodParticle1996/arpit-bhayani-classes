/* ex3 — Login OTP. Do tareeke:
   MODE=sync  (orchestration): auth-service khud sms-gateway ko call karti hai, fail ho toh 2 retry,
              aur user ko SACH batati hai — "OTP gaya" ya "Resend dabao".
   MODE=event (choreography):  auth-service "otp_requested" event publish karke turant "OTP sent" bol deti hai.
              OTP worker queue se uthayega — jab uski baari aaye.
   POST /login/otp { phone } */
const express = require('express');
const { log, callJson, host, sleep } = require('../lib/util');
const PORT = 4721, SVC = 'auth-service';
const MODE = process.env.MODE === 'event' ? 'event' : 'sync';
const app = express();
app.use(express.json());
let seq = 0;

app.post('/login/otp', async (req, res) => {
  const phone = (req.body && req.body.phone) || '98xxxxxx01';
  const requestedAt = Date.now();
  const traceId = `otp-${++seq}`;
  if (MODE === 'event') {
    try {
      await callJson(`http://${host('pubsub')}:4710/publish/otp_requested`, { method: 'POST', body: { phone, traceId, requestedAt }, timeoutMs: 1000 });
      log(SVC, `📣 ${phone}: event daala, user ko "OTP sent" bol diya (pata nahi kab pahunchega)`);
      return res.status(202).json({ status: 'OTP sent (shayad)', traceId, waitedMs: Date.now() - requestedAt });
    } catch (e) {
      return res.status(503).json({ status: 'broker down', waitedMs: Date.now() - requestedAt });
    }
  }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await callJson(`http://${host('sms-gateway')}:4722/send`, { method: 'POST', body: { phone, traceId, requestedAt }, timeoutMs: 2000 });
      log(SVC, `✅ ${phone}: OTP gaya (attempt ${attempt})`);
      return res.json({ status: 'OTP sent', traceId, attempts: attempt, waitedMs: Date.now() - requestedAt });
    } catch (e) {
      log(SVC, `🔁 ${phone}: attempt ${attempt} fail (${e.message})`);
      await sleep(200 * attempt);
    }
  }
  res.status(502).json({ status: 'OTP nahi gaya — app "Resend" button dikhaye', traceId, attempts: 3, waitedMs: Date.now() - requestedAt });
});
app.listen(PORT, () => log(SVC, `:${PORT}  MODE=${MODE}`));
