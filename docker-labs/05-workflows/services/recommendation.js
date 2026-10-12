/* ex3 — recommendation-service. Model sirf dish ids deta hai.
   GET /recommendations/:user           → sirf ids (client ko har dish ke liye alag call karni padegi)
   GET /recommendations/:user?enrich=1  → server khud menu-service ko SYNC call karke poori details deta hai */
const express = require('express');
const { log, callJson, host } = require('../lib/util');
const PORT = 4723, SVC = 'recommendation';
const app = express();

app.get('/recommendations/:user', async (req, res) => {
  const t0 = Date.now();
  const ids = ['d1', 'd4', 'd7', 'd9'];
  if (req.query.enrich !== '1') return res.json({ user: req.params.user, ids, serverMs: Date.now() - t0 });
  const items = await Promise.all(ids.map(id => callJson(`http://${host('menu')}:4724/dishes/${id}`, { timeoutMs: 500 }).catch(() => ({ id, name: '(details abhi nahi mili)' }))));
  log(SVC, `🍽️  ${req.params.user}: ${ids.length} dishes menu-service se bhar ke bheji`);
  res.json({ user: req.params.user, items, serverMs: Date.now() - t0 });
});
app.listen(PORT, () => log(SVC, `:${PORT}`));
