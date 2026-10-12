/* ex4 — avatar-service. AVATAR_DOWN=1 → request aati hai par jawab kabhi nahi (hang). */
const { createService, sleep } = require('../kit');
const svc = createService('avatar', 5022, { quietAccessLog: true });
const DOWN = process.env.AVATAR_DOWN === '1';
svc.app.get('/v1/avatars/:id', async (req, res) => {
  if (DOWN) return;                                   // hang
  await sleep(10);
  res.json({ url: `/img/avatars/${req.params.id}.jpg` });
});
svc.listen();
