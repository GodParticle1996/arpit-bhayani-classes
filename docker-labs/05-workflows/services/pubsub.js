/* ex2/ex3 — mini pub/sub broker (Kafka consumer groups / SNS+SQS jaisa bartaav, in-memory).
   Queue (lab 04) mein ek message EK consumer ko jaata tha. Yahan har SUBSCRIPTION (group) ko apni copy milti hai.
   POST /subscribe            { topic, group }  → group ki apni queue (sirf iske BAAD ke events)
   POST /publish/:topic       { ...event, traceId }
   POST /pull/:topic/:group   → agla message (lease 5 s; ack na aaye toh wapas)
   POST /ack/:group/:id
   GET  /stats                → har group ki depth, in-flight, acked
   GET  /trace/:traceId       → event publish hua? kis group ne ack kiya, kiske paas pending? */
const express = require('express');
const { log } = require('../lib/util');
const PORT = 4710, SVC = 'pubsub';
const LEASE_MS = 5000;
const app = express();
app.use(express.json());

const subs = {};        // topic → { group → { queue: [], inflight: Map, acked: 0 } }
const traces = {};      // traceId → { topic, at, groups: { group: 'queued' | 'delivered' | 'acked' } }
let seq = 0;

app.post('/subscribe', (req, res) => {
  const { topic, group } = req.body || {};
  subs[topic] = subs[topic] || {};
  if (!subs[topic][group]) { subs[topic][group] = { queue: [], inflight: new Map(), acked: 0 }; log(SVC, `➕ ${group} ne "${topic}" subscribe kiya`); }
  res.json({ ok: true });
});

app.post('/publish/:topic', (req, res) => {
  const topic = req.params.topic, body = req.body || {};
  const groups = Object.keys(subs[topic] || {});
  const id = ++seq;
  traces[body.traceId] = { topic, at: Date.now(), groups: {} };
  groups.forEach(g => { subs[topic][g].queue.push({ id, topic, body, at: Date.now(), deliveries: 0 }); traces[body.traceId].groups[g] = 'queued'; });
  log(SVC, `📣 ${topic} #${id} (${body.traceId}) → ${groups.length} subscribers: ${groups.join(', ') || '(koi nahi!)'}`);
  res.json({ ack: true, id, fannedOutTo: groups });
});

app.post('/pull/:topic/:group', (req, res) => {
  const s = subs[req.params.topic] && subs[req.params.topic][req.params.group];
  if (!s) return res.status(404).json({ error: 'pehle /subscribe karo' });
  const now = Date.now();
  for (const [id, m] of s.inflight) if (now - m.leasedAt > LEASE_MS) { s.inflight.delete(id); s.queue.unshift(m); }
  const m = s.queue.shift();
  if (!m) return res.json({ empty: true });
  m.deliveries++; m.leasedAt = now;
  s.inflight.set(m.id, m);
  if (traces[m.body.traceId]) traces[m.body.traceId].groups[req.params.group] = 'delivered';
  res.json(m);
});

app.post('/ack/:group/:id', (req, res) => {
  for (const topic of Object.keys(subs)) {
    const s = subs[topic][req.params.group];
    const m = s && s.inflight.get(Number(req.params.id));
    if (m) { s.inflight.delete(m.id); s.acked++; if (traces[m.body.traceId]) traces[m.body.traceId].groups[req.params.group] = 'acked'; }
  }
  res.json({ ok: true });
});

app.get('/stats', (req, res) => {
  const out = {};
  Object.entries(subs).forEach(([topic, gs]) => {
    out[topic] = {};
    Object.entries(gs).forEach(([g, s]) => {
      const oldest = s.queue.length ? Math.round((Date.now() - s.queue[0].at) / 1000) : 0;
      out[topic][g] = { depth: s.queue.length, inflight: s.inflight.size, acked: s.acked, oldestWaitingSec: oldest };
    });
  });
  res.json(out);
});

app.get('/trace/:traceId', (req, res) => {
  const t = traces[req.params.traceId];
  res.json(t ? { published: true, topic: t.topic, groups: t.groups } : { published: false });
});

app.listen(PORT, () => log(SVC, `:${PORT}  (lease ${LEASE_MS}ms)`));
