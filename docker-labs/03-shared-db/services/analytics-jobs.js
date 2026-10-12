/* analytics-jobs — do "script" endpoints:
   POST /jobs/report  → bhari report query (3 s har slot) × 4, ek saath
   POST /jobs/cleanup → "purane test restaurants" hatane ki buggy script (WHERE galat!)
   USE_REPLICA=1 → report replica par chalti hai */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const app = express();
const PORT = 4504, SVC = 'analytics-jobs';
const CRED = { user: 'analytics_svc', pass: 'an4lytics' };
const REPORT_DB = process.env.USE_REPLICA === '1' ? `http://${host('db-replica')}:5433/query` : `http://${host('db-primary')}:5432/query`;

app.post('/jobs/report', async (req, res) => {
  log(SVC, `📈 monthly report shuru → ${process.env.USE_REPLICA === '1' ? 'REPLICA' : 'PRIMARY'} par 4 bhari queries`);
  const t0 = Date.now();
  const runs = await Promise.all([1, 2, 3, 4].map(() => callJson(REPORT_DB, { method: 'POST', timeoutMs: 20000,
    body: Object.assign({ op: 'select', table: 'menu_items', cost: 'heavy' }, CRED) }).catch(e => ({ error: e.message }))));
  res.json({ queries: runs.length, errors: runs.filter(r => r.error).length, tookMs: Date.now() - t0, db: process.env.USE_REPLICA === '1' ? 'replica' : 'primary' });
});
app.post('/jobs/cleanup', async (req, res) => {
  /* irada: sirf "test" restaurants hatana. Galti: where khaali reh gaya → SAB menu items */
  log(SVC, '🧹 cleanup script: DELETE FROM menu_items WHERE <bhool gaye>');
  try {
    const r = await callJson(`http://${host('db-primary')}:5432/query`, { method: 'POST', timeoutMs: 5000,
      body: Object.assign({ op: 'delete', table: 'menu_items', where: {} }, CRED) });
    res.json({ ok: true, deleted: r.deleted });
  } catch (e) { res.status(e.status || 500).json({ ok: false, blocked: e.message, body: e.body }); }
});
app.listen(PORT, () => log(SVC, `POST http://localhost:${PORT}/jobs/report  |  /jobs/cleanup  (USE_REPLICA=${process.env.USE_REPLICA === '1'})`));
