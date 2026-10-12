/* ex2 — delivery-service: riders ka data isi ka hai (data/riders.json = iska "database") */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { log } = require('../lib/util');
const app = express();
const PORT = 4201;
const SVC = 'delivery-service';
const FILE = path.join(__dirname, '..', 'data', 'riders.json');
const SCHEMA = process.env.SCHEMA || 'v1';

/* startup par "migration": v1 = riders[] {id, name, eta_min} · v2 = drivers[] {riderId, fullName, etaSeconds} */
const v1 = { riders: [{ id: 'r7', name: 'Ramesh', eta_min: 12 }, { id: 'r9', name: 'Salma', eta_min: 7 }] };
const v2 = { drivers: [{ riderId: 'r7', fullName: 'Ramesh K', etaSeconds: 720 }, { riderId: 'r9', fullName: 'Salma B', etaSeconds: 420 }] };
fs.writeFileSync(FILE, JSON.stringify(SCHEMA === 'v2' ? v2 : v1, null, 2));
log(SVC, `apna database schema ${SCHEMA} par migrate kiya → data/riders.json`);

/* CONTRACT — schema kuch bhi ho, bahar ka jawab wahi rehta hai */
app.get('/v1/riders/:id/eta', (req, res) => {
  const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const r = SCHEMA === 'v2'
    ? (db.drivers || []).find(d => d.riderId === req.params.id)
    : (db.riders || []).find(d => d.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'rider nahi mila' });
  const etaMinutes = SCHEMA === 'v2' ? Math.round(r.etaSeconds / 60) : r.eta_min;
  res.json({ riderId: req.params.id, etaMinutes });
});

app.listen(PORT, () => log(SVC, `http://localhost:${PORT}/v1/riders/r7/eta  (schema ${SCHEMA})`));
