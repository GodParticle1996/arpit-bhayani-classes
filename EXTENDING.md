# Naya content kaise daalein

## Likhne ke niyam

- **Hinglish, simple shabd.** Chhote vaakya. Jargon aakhir mein, pehle KhanaKart ki situation.
- **Feynman "khud samjhao" blocks nahi.** Realistic scenario + dry run + lab se samjhao.
- **ADHD rules:** "yeh / woh / isse / uska" ki jagah naam dobara likho; pehla stage interactive (dryrun/flowlab/design/archdiff); ek card = ek sawaal; problem pehle.
- **Ek hi company:** KhanaKart. Numbers ₹, orders/sec, IPL/Diwali jaise asli moments.
- Har level: `hook` → `objectives` → `steps` (≤ 7) → `myth` → `playbook` → `source` → stages → `interview` → `cards`.

## Naya level

Data file IIFE mein likho aur `index.html` + `validate.js` ki file list mein jodo (boss file se pehle):

```js
(function () {
  const N = AB.kk.n;                       // N('order', x, y, { label, icon, id })
  VISUALS['ms-naya'] = { t: 'Diagram title', html: `<div class="dg-flow">…</div>` };
  AB.registerLevels('microservices', [{
    id: 'ms-naya', icon: '🧩', title: '…', badge: '…',
    source: { video: 'YOUTUBE_ID', title: '…', at: 120 },
    hook: { when: 'KhanaKart · …', title: '…', text: '…' },
    objectives: ['…'],
    steps: [{ q: 'Sawaal?', analogy: '…', body: '…', points: ['…'], example: '…', asli: '…' }],
    myth: [{ myth: '…', sach: '…' }],
    playbook: { title: '…', use: [], avoid: [], how: [], redflags: [], rule: '…' },
    stages: [ /* neeche */ ],
    interview: { title: '…', instructions: '…', questions: [{ q, choices, answer, explain }] },
    success: ['…'], homework: '<p>…</p>', cards: [{ front: '…', back: '…' }],
  }]);
})();
```

Boss level ka `id` `boss` se shuru ho aur track mein aakhri rahe.

## Stage types

| type | Zaroori fields |
|---|---|
| `dryrun` | `goal, nodes, edges, panels:[{id,title}], steps:[{say, flows, nodes, panels, clock?, ask?:{q,choices,answer,explain}}], lesson` — node states cumulative; kam se kam 2 `ask` |
| `flowlab` | `goal, scenario, knobs:[{id,label,min,max,step,value,unit?,labels?}], nodes, edges, model(k) → {nodes, flows, readouts, bars, verdict:{ok,text}}, check(k), lesson, quiz?` — `check` ka koi knob combination jeetna chahiye; validator saare combos chalata hai |
| `docker` | `project` (docker-labs folder), `exercise` (README mein likha naam), `goal, steps:[{text, cmd, expect?}], observe:{q,choices,answer,explain}` |
| `quiz` | `questions:[{q, choices, answer, explain}]` |
| `bins` | `instructions, bins:[{id,label}], items:[{text, bin, explain}]` |
| `match` | `pairs:[{left, right, explain}]` |
| `order` | `instructions, steps:[{text, explain}]` (sahi kram mein likho) |
| `design` | `brief, requirements, slots:[{id,label,icon,options:[{id,label,score,why}]}], pass, verdicts` |
| `archdiff` | `brief, goal, nodes:[{id,label,sub,row}], flaws:[{id,why}], fine:{id: text}, lesson` |

Diagram coordinates: viewBox 1000 × 520, x/y = node ka centre. Badges node ke neeche ~70px lete hain — neeche wali row y ≤ 450. Lambi labels wale nodes left edge se kam se kam ~130px door.

## Naya Docker lab

```
docker-labs/NN-naam/
  package.json        scripts.start = "node start.js", express ^5
  Dockerfile          node:20-alpine
  .dockerignore       node_modules
  docker-compose.yml  har exercise ka profile
  start.js            npm start <exercise> — services spawn, env pass-through
  services/  tools/  lib/
  README.md           har exercise ka naam (jaise ex1-...) heading mein
```

- Har level ki ek exercise; ports ka naya range lo (README ki list dekho).
- Services ke beech host `lib/util.js` ke `host('name')` se (`NAME_HOST` env, default localhost) — compose mein service naam.
- Pehle **Node se test karo** (`npm start <exercise>` + curl/tool), numbers README aur level ke `expect` mein wahi likho jo asal mein aaye.

## Check

```bash
node validate.js     # 0 errors hone chahiye
```

Validator: structure, har dryrun/flowlab/docker/design/archdiff jeet ke dikhana, har intro render, docker project files.
