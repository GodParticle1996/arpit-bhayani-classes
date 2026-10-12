/* ex3 — mini message broker (RabbitMQ/SQS jaisa bartaav, in-memory):
   POST /topics/:t/publish      → message queue mein, turant ack
   POST /topics/:t/consume      → ek message do (visibility: ack na aaye toh 5 s baad wapas)
   POST /ack/:id  |  POST /nack/:id  → nack par attempts++, 3 ke baad DLQ
   GET  /stats                  → queue depth, in-flight, DLQ */
const express = require('express');
const { log } = require('../lib/util');
const app = express();
app.use(express.json());
const PORT = 4620, SVC = 'broker';
const MAX_ATTEMPTS = 3, VISIBILITY_MS = 5000;
const topics = {}, inflight = new Map(), dlq = [];
let seq = 0, published = 0, acked = 0;
const q = t => (topics[t] = topics[t] || []);

app.post('/topics/:t/publish', (req, res) => {
  const msg = { id: ++seq, topic: req.params.t, body: req.body, attempts: 0, at: Date.now() };
  q(req.params.t).push(msg);
  published++;
  res.json({ ack: true, id: msg.id });
});
app.post('/topics/:t/consume', (req, res) => {
  const now = Date.now();
  for (const [id, m] of inflight) if (now - m.leasedAt > VISIBILITY_MS) { inflight.delete(id); q(m.topic).unshift(m); }
  const m = q(req.params.t).shift();
  if (!m) return res.json({ empty: true });
  m.attempts++; m.leasedAt = now;
  inflight.set(m.id, m);
  res.json(m);
});
app.post('/ack/:id', (req, res) => { if (inflight.delete(Number(req.params.id))) acked++; res.json({ ok: true }); });
app.post('/nack/:id', (req, res) => {
  const m = inflight.get(Number(req.params.id));
  if (m) {
    inflight.delete(m.id);
    if (m.attempts >= MAX_ATTEMPTS) { dlq.push(m); log(SVC, `☠️ message ${m.id} → DLQ (${m.attempts} attempts)`); }
    else q(m.topic).push(m);
  }
  res.json({ ok: true });
});
app.get('/stats', (req, res) => res.json({
  published, acked, dlq: dlq.length, inflight: inflight.size,
  depth: Object.fromEntries(Object.entries(topics).map(([k, v]) => [k, v.length])),
  oldestWaitingSec: Object.values(topics).flat().reduce((m, x) => Math.max(m, Math.round((Date.now() - x.at) / 1000)), 0),
}));
app.get('/dlq', (req, res) => res.json(dlq.map(m => ({ id: m.id, body: m.body, attempts: m.attempts }))));
app.listen(PORT, () => log(SVC, `:${PORT}  (visibility ${VISIBILITY_MS}ms, max attempts ${MAX_ATTEMPTS})`));
