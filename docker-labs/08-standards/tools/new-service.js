#!/usr/bin/env node
/* npm run new-service <name> <port>
   KhanaKart service template: khanakart-kit ke saath nayi service + runbook. Pehle din se "good service". */
const fs = require('fs');
const path = require('path');
const [name, port] = process.argv.slice(2);
if (!name || !/^[a-z][a-z-]+$/.test(name) || !Number(port)) { console.log('Use: npm run new-service <name> <port>   (jaise: npm run new-service reviews 5032)'); process.exit(1); }
const svc = path.join(__dirname, '..', 'services', `${name}.js`);
const runbook = path.join(__dirname, '..', 'services', `${name}.runbook.md`);
if (fs.existsSync(svc)) { console.log(`services/${name}.js pehle se hai — overwrite nahi karunga`); process.exit(1); }
const plural = name.endsWith('s') ? name : name + 's';
fs.writeFileSync(svc, `/* ${name} — KhanaKart service template se bani (khanakart-kit). */
const { createService } = require('../kit');
const svc = createService('${name}', ${Number(port)});

svc.app.get('/v1/${plural}/:id', async (req, res) => {
  svc.log('info', '${name} fetch', { traceId: req.traceId, id: req.params.id });
  res.json({ id: req.params.id });
});

svc.listen();
`);
fs.writeFileSync(runbook, `# ${name} — runbook

- **Owner team:** (bharo)
- **On-call:** (PagerDuty rotation ka naam)
- **Dashboards:** http_requests_total, http_request_duration_ms (service="${name}")
- **Logs:** logs/${name}.log — JSON, traceId se search: \`npm run logs <traceId>\`
- **Health:** GET /health
- **Dependencies:** (list + timeout + fallback)
- **Scale kaise:** (instances / DB)
- **Common incidents aur pehla kadam:** (bharo)
`);
console.log(`✅ services/${name}.js aur services/${name}.runbook.md bane.\n   Chalao: node services/${name}.js\n   Jaancho: npm run scorecard ${name} ${port}`);
