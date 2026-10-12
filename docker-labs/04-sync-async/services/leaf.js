/* ek "leaf" service — NAME, PORT, LATENCY_MS, DOWN=1 (hang), FAIL=1 (500) env se.
   restaurant / delivery / notification / tax — sab isi file se chalti hain. */
const express = require('express');
const { log, sleep } = require('../lib/util');
const app = express();
app.use(express.json());
const NAME = process.env.NAME || 'leaf', PORT = Number(process.env.PORT || 4600);
const LAT = Number(process.env.LATENCY_MS || 100);
let inflight = 0;
app.all('/work', async (req, res) => {
  if (process.env.FAIL === '1') return res.status(500).json({ error: `${NAME} failed` });
  inflight++;
  try {
    if (process.env.DOWN === '1') { await sleep(60000); }       // "hang" — jawab hi nahi
    await sleep(LAT);
    res.json({ service: NAME, ms: LAT });
  } finally { inflight--; }
});
app.get('/stats', (req, res) => res.json({ service: NAME, inflight, down: process.env.DOWN === '1' }));
app.listen(PORT, () => log(NAME, `:${PORT}/work  latency=${LAT}ms  down=${process.env.DOWN === '1'}`));
