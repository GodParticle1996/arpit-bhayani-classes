/* ex4 — profile-service (kit + config/tolerance.json).
   Capacity: ek saath sirf 10 requests (DB pool jaisa); baaki line mein.
   Har profile ke liye avatar-service ko call (timeout 3000 ms) — pool slot pakde hue. */
const { createService, sleep } = require('../kit');
const svc = createService('profile', 5021, { toleranceFile: 'config/tolerance.json', quietAccessLog: true });
const CAP = 10;
let busy = 0;
const line = [];
const acquire = () => new Promise(r => { if (busy < CAP) { busy++; r(); } else line.push(r); });
const release = () => { const n = line.shift(); if (n) n(); else busy--; };
const AVATAR = `http://${process.env.AVATAR_HOST || 'localhost'}:5022`;

svc.app.get('/v1/profiles/:id', async (req, res) => {
  await acquire();
  try {
    await sleep(40);
    const avatar = await svc.call('avatar', `${AVATAR}/v1/avatars/${req.params.id}`, { req, timeoutMs: 3000 });
    res.json({ id: req.params.id, name: 'Priya', avatar: avatar.url });
  } catch (e) {
    res.status(e.status || 502).json({ error: e.message });
  } finally { release(); }
});
svc.app.get('/stats', (req, res) => res.json({ busy, waiting: line.length }));
svc.listen();
