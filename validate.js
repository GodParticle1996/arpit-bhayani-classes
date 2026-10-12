#!/usr/bin/env node
/* =====================================================================
   Arpit Bhayani Classes — validator

     node validate.js              # sab kuch
     node validate.js ms-timeout   # sirf ek level ke labs (tez loop)

   Chaar hisse:
   1) STRUCTURE — level/stage ki shakl, steps/decision card/source, unsolvable
      quiz/fill, softlock hotspot, toote incident branches, gayab VISUALS,
      dryrun ke galat node ids, docker project/exercise disk par hai ya nahi,
      ranks, non-Latin script guard, index.html ke script tags.
   2) LABS — har interactive lab ko SACH MEIN render karke jeet ke dikhao:
      dryrun (har ask ka sahi jawab dekar end tak), flowlab + tradeoff (poora
      knob sweep: jeeta ja sakta hai, aur shuru mein hi jeeta hua nahi),
      docker (saare steps tick + sahi jawab), replay/estimate/archdiff.
   3) RENDER — app.js ko boot karke har level ka intro render karo.
   4) DOCKER LABS — har project mein package.json, docker-compose.yml,
      README.md aur launcher hona chahiye.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DIR = __dirname;

const ENGINE = ['core.js', 'data-core.js', 'visuals.js', 'games.js', 'canvas.js', 'labs.js', 'viz.js', 'mslabs.js'];
const CONTENT = [
  'data-ms-01-scoping.js', 'data-ms-02-timeouts.js', 'data-ms-03-shared-db.js', 'data-ms-04-sync-async.js',
  'data-ms-05-workflows.js', 'data-ms-06-db-per-service.js', 'data-ms-07-composition.js',
  'data-ms-08-standards.js', 'data-ms-09-people.js', 'data-ms-10-bff.js', 'data-ms-boss.js',
];

let errors = 0, warns = 0, checks = 0;
const fail = m => { errors++; console.log('  ❌ ' + m); };
const warn = m => { warns++; console.log('  ⚠️  ' + m); };
const ok = () => { checks++; };

/* =====================================================================
   MINI DOM — asli renderers isi par chalte hain
   ===================================================================== */
function makeEl(tag) {
  const e = {
    tag, className: '', _html: '', children: [], style: {}, _txt: '',
    disabled: false, value: '', dataset: {}, _handlers: {},
    classList: {
      add(...c) { const s = new Set(String(e.className).split(' ').filter(Boolean)); c.forEach(x => s.add(x)); e.className = [...s].join(' '); },
      remove(...c) { e.className = String(e.className).split(' ').filter(x => x && !c.includes(x)).join(' '); },
      contains: c => String(e.className).split(' ').includes(c),
    },
    set innerHTML(v) { e._html = v; e.children.length = 0; }, get innerHTML() { return e._html; },
    set textContent(v) { e._txt = v; e.children.length = 0; }, get textContent() { return e._txt; },
    appendChild(c) { e.children.push(c); return c; },
    append(...cs) { cs.forEach(c => e.children.push(c)); },
    addEventListener(ev, fn) { e._handlers[ev] = fn; },
    removeChild(c) { const i = e.children.indexOf(c); if (i > -1) e.children.splice(i, 1); },
    insertBefore(c) { e.children.unshift(c); return c; },
    click() { if (e.onclick) e.onclick(); },
    remove() { if (e._parentRef) e._parentRef.removeChild(e); e._removed = true; },
    querySelector() { return makeEl('div'); },
    querySelectorAll() { return []; },
    closest() { return null; },
    scrollIntoView() {}, focus() {}, offsetWidth: 0,
    getBoundingClientRect: () => ({ width: 0, height: 0 }),
  };
  return e;
}

const sandbox = {
  console, Math, Date, JSON, RegExp, Error, parseInt, parseFloat, isNaN, isFinite, Number, String, Object, Array, Set, Map,
  setTimeout: f => { if (typeof f === 'function') f(); }, clearTimeout() {},
  localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  document: {
    createElement: makeEl, createTextNode: () => makeEl('#text'),
    _els: {},
    getElementById(id) { return this._els[id] || (this._els[id] = makeEl('div')); },
    body: makeEl('body'),
  },
  Element: function () {}, location: { href: '' },
  window: { scrollTo() {}, addEventListener() {}, matchMedia: () => ({ matches: false, addListener() {} }) },
  scrollTo() {}, requestAnimationFrame: f => f && f(),
  encodeURIComponent, decodeURIComponent,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const FILES = ENGINE.concat(CONTENT.filter(f => fs.existsSync(path.join(DIR, f))));
FILES.forEach(f => {
  try { vm.runInContext(fs.readFileSync(path.join(DIR, f), 'utf8'), sandbox, { filename: f }); }
  catch (e) { console.log(`\n💥 ${f} load nahi hua: ${e.message}\n`); process.exit(1); }
});
vm.runInContext('globalThis.__AB = typeof AB !== "undefined" ? AB : null;' +
                'globalThis.__VISUALS = typeof VISUALS !== "undefined" ? VISUALS : null;' +
                'globalThis.__RANKS = typeof RANKS !== "undefined" ? RANKS : null;', sandbox);
const AB = sandbox.__AB, VISUALS = sandbox.__VISUALS, RANKS = sandbox.__RANKS;
if (!AB) { console.log('💥 AB namespace nahi mila'); process.exit(1); }
AB.addXP = () => {};
AB.noteMistake = () => {};

const ONLY = process.argv[2];
const LAB_TYPES = ['replay', 'tradeoff', 'estimate', 'archdiff', 'dryrun', 'flowlab', 'docker'];
const labStages = [];
const allLevels = [];
AB.tracks.forEach(t => (AB.levelSets[t.id] || []).forEach(l => allLevels.push({ track: t, level: l })));

function allStages(l) {
  const s = (l.stages || []).slice();
  if (l.interview) s.push(Object.assign({ type: 'interview' }, l.interview));
  return s;
}
function checkQ(q, where) {
  if (!q || !q.q) return fail(`${where}: sawaal missing`);
  if (!q.choices || q.choices.length < 2) return fail(`${where}: kam se kam 2 choices chahiye`);
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.choices.length)
    return fail(`${where}: answer index range se bahar (${q.answer} / ${q.choices.length})`);
  if (new Set(q.choices).size !== q.choices.length) fail(`${where}: duplicate choices`);
  if (!q.explain) warn(`${where}: explain missing`);
  ok();
}

/* =====================================================================
   1. STRUCTURE
   ===================================================================== */
function structure() {
  console.log('\n🔎 STRUCTURE');
  const seen = new Set();

  AB.tracks.forEach(t => {
    if (!AB.levelSets[t.id] || !AB.levelSets[t.id].length) fail(`track '${t.id}' mein koi level nahi`);
    ['icon', 'name', 'blurb', 'certTitle', 'certSub', 'motto', 'formula'].forEach(k => {
      if (!t[k]) fail(`track '${t.id}': '${k}' missing`); else ok();
    });
  });

  allLevels.forEach(({ track, level: l }) => {
    const at = `${track.id}/${l.id}`;
    if (!l.id) return fail(`${track.id}: bina id ka level`);
    if (seen.has(l.id)) fail(`duplicate level id: '${l.id}'`); else { seen.add(l.id); ok(); }
    ['icon', 'title', 'badge'].forEach(k => { if (!l[k]) fail(`${at}: '${k}' missing`); else ok(); });
    if (!(l.objectives || []).length) fail(`${at}: objectives khaali`); else ok();
    if (!(l.steps || []).length && !(l.lesson || []).length) fail(`${at}: na steps na lesson — padhne ko kuch nahi`); else ok();
    (l.steps || []).forEach((s, i) => {
      if (!s.q) fail(`${at} steps[${i}]: 'q' (sawaal) missing`);
      if (!s.body && !s.points && !s.example && !s.analogy) fail(`${at} steps[${i}]: khaali card`);
    });
    if ((l.steps || []).length > 7) warn(`${at}: ${l.steps.length} step cards — ADHD ke liye 7 se kam rakho`);
    if (!l.hook) warn(`${at}: 'hook' (problem-first scenario) missing`);
    if (!l.playbook) warn(`${at}: decision card (playbook) missing`);
    else ['use', 'avoid', 'how'].forEach(k => { if (!(l.playbook[k] || []).length) warn(`${at}: playbook.${k} khaali`); });
    if (!l.source) warn(`${at}: source video link missing`);
    if (!(l.stages || []).length) fail(`${at}: koi stage nahi`); else ok();
    if (!(l.success || []).length) warn(`${at}: success list khaali`);
    if (!(l.cards || []).length) warn(`${at}: koi flashcard nahi`);
    if (!l.interview) warn(`${at}: koi interview nahi`);
    if (!VISUALS[l.id]) fail(`${at}: VISUALS['${l.id}'] nahi hai`); else ok();
    const first = (l.stages || [])[0];
    if (first && !['dryrun', 'flowlab', 'tradeoff', 'replay', 'design', 'incident', 'archdiff'].includes(first.type) && !/^boss/.test(l.id))
      warn(`${at}: pehla stage '${first.type}' hai — ADHD rule: interactive stage pehle`);

    allStages(l).forEach((st, si) => {
      const sat = `${at} stage[${si}] (${st.type})`;
      if (!st.type) return fail(`${sat}: type missing`);
      if (!st.title && st.type !== 'interview') warn(`${sat}: title missing`);
      if (st.visual && !VISUALS[st.visual]) fail(`${sat}: visual '${st.visual}' nahi hai`);

      if (st.type === 'quiz' || st.type === 'interview') {
        const qs = st.questions || [];
        if (!qs.length) fail(`${sat}: koi question nahi`);
        qs.forEach((q, qi) => checkQ(q, `${sat} q[${qi}]`));
      }
      if (st.type === 'bins') {
        const ids = (st.bins || []).map(b => b.id);
        if (ids.length < 2) fail(`${sat}: kam se kam 2 bins chahiye`);
        (st.items || []).forEach((it, ii) => {
          if (!ids.includes(it.bin)) fail(`${sat} item[${ii}]: bin '${it.bin}' exist nahi karta`); else ok();
          if (!it.explain) warn(`${sat} item[${ii}]: explain missing`);
        });
        if (!(st.items || []).length) fail(`${sat}: koi item nahi`);
      }
      if (st.type === 'match') {
        (st.pairs || []).forEach((p, pi) => {
          if (!p.left || !p.right) fail(`${sat} pair[${pi}]: left/right missing`); else ok();
          if (!p.explain) warn(`${sat} pair[${pi}]: explain missing`);
        });
        if ((st.pairs || []).length < 3) fail(`${sat}: kam se kam 3 pairs chahiye`);
      }
      if (st.type === 'order') {
        (st.steps || []).forEach((s2, i2) => {
          if (!s2.text) fail(`${sat} step[${i2}]: text missing`); else ok();
          if (!s2.explain) warn(`${sat} step[${i2}]: explain missing`);
        });
        if ((st.steps || []).length < 3) fail(`${sat}: kam se kam 3 steps chahiye`);
      }
      if (st.type === 'fill') {
        const holes = [...new Set((st.template || '').match(/\{\d+\}/g) || [])];
        const blanks = st.blanks || [];
        if (holes.length !== blanks.length) fail(`${sat}: template mein ${holes.length} blank, blanks[] mein ${blanks.length}`);
        else ok();
        blanks.forEach((b, bi) => {
          if (!(st.tokens || []).includes(b.answer)) fail(`${sat} blank[${bi}]: answer '${b.answer}' tokens[] mein nahi — unsolvable`);
          else ok();
        });
      }
      if (st.type === 'hotspot') {
        const v = VISUALS[st.visual];
        if (!v) return fail(`${sat}: visual '${st.visual}' missing`);
        const targets = new Set((v.html.match(/data-hs="([^"]+)"/g) || []).map(m => m.slice(9, -1)));
        (st.questions || []).forEach((q, qi) => {
          if (!targets.has(q.target)) fail(`${sat} q[${qi}]: target '${q.target}' diagram mein nahi — softlock`); else ok();
        });
      }
      if (st.type === 'incident') {
        const nodes = st.nodes || {};
        if (!nodes[st.start]) return fail(`${sat}: start node '${st.start}' missing`);
        const reached = new Set([st.start]);
        const walk = id => {
          const n = nodes[id];
          if (!n || n.end) return;
          if (!(n.choices || []).some(c => c.good)) fail(`${sat} node '${id}': koi good choice nahi — dead end`);
          (n.choices || []).forEach((c, ci) => {
            if (!c.explain) warn(`${sat} node '${id}' choice[${ci}]: explain missing`);
            if (c.good && !c.next) fail(`${sat} node '${id}' choice[${ci}]: good hai par 'next' nahi`);
            if (c.next) {
              if (!nodes[c.next]) fail(`${sat} node '${id}': next '${c.next}' exist nahi karta`);
              else if (!reached.has(c.next)) { reached.add(c.next); walk(c.next); }
            }
          });
        };
        walk(st.start);
        const ends = Object.keys(nodes).filter(k => nodes[k].end);
        if (!ends.some(e => reached.has(e))) fail(`${sat}: koi end node reachable nahi`); else ok();
      }
      if (st.type === 'design') {
        const slots = st.slots || [];
        if (slots.length < 3) fail(`${sat}: kam se kam 3 slots chahiye`);
        let max = 0;
        slots.forEach((sl, sli) => {
          const opts = sl.options || [];
          if (opts.length < 2) return fail(`${sat} slot[${sli}]: kam se kam 2 options`);
          if (!opts.some(o => o.score > 0)) fail(`${sat} slot[${sli}]: koi positive option nahi`); else ok();
          opts.forEach((o, oi) => { if (!o.why) warn(`${sat} slot[${sli}] opt[${oi}]: 'why' missing`); });
          max += Math.max(...opts.map(o => o.score));
        });
        if (st.pass != null && st.pass > max) fail(`${sat}: pass=${st.pass} par max ${max} — unwinnable`); else ok();
      }
      if (st.type === 'dryrun') {
        const ids = new Set((st.nodes || []).map(n => n.id));
        if ((st.nodes || []).length < 2) fail(`${sat}: kam se kam 2 nodes chahiye`);
        (st.nodes || []).forEach((n, ni) => {
          if (typeof n.x !== 'number' || typeof n.y !== 'number') fail(`${sat} node[${ni}] '${n.id}': x/y number nahi`);
          else if (n.x < 80 || n.x > 920 || n.y < 30 || n.y > 470) warn(`${sat} node '${n.id}': (${n.x},${n.y}) diagram ke kinare se bahar ja sakta hai`);
        });
        (st.edges || []).forEach((e, ei) => {
          if (!ids.has(e.from) || !ids.has(e.to)) fail(`${sat} edge[${ei}]: '${e.from}'→'${e.to}' node exist nahi karta`);
        });
        const panelIds = new Set((st.panels || []).map(p => p.id));
        const steps = st.steps || [];
        if (steps.length < 3) fail(`${sat}: kam se kam 3 steps chahiye`); else ok();
        let asks = 0;
        steps.forEach((s, i) => {
          if (!s.say) fail(`${sat} step[${i}]: 'say' missing`);
          (s.flows || []).forEach((f, fi) => {
            if (!ids.has(f.from) || !ids.has(f.to)) fail(`${sat} step[${i}] flow[${fi}]: '${f.from}'→'${f.to}' node nahi`);
          });
          Object.keys(s.nodes || {}).forEach(k => { if (!ids.has(k)) fail(`${sat} step[${i}]: node state '${k}' nodes[] mein nahi`); });
          Object.keys(s.panels || {}).forEach(k => { if (!panelIds.has(k)) fail(`${sat} step[${i}]: panel '${k}' panels[] mein declare nahi`); });
          if (s.ask) { asks++; checkQ(s.ask, `${sat} step[${i}] ask`); }
        });
        if (asks < 2) warn(`${sat}: sirf ${asks} ask — dry run mein kam se kam 2 "ruk ke socho" sawaal rakho`);
        if (!st.lesson) warn(`${sat}: lesson missing`);
        labStages.push({ at: sat, st, level: l });
      }
      if (st.type === 'flowlab' || st.type === 'tradeoff') {
        const ks = st.knobs || [];
        if (ks.length < 1) fail(`${sat}: kam se kam 1 knob chahiye`); else ok();
        ks.forEach((k, ki) => {
          if (!k.id || !k.label) fail(`${sat} knob[${ki}]: id/label missing`);
          if (typeof k.min !== 'number' || typeof k.max !== 'number' || k.min >= k.max) fail(`${sat} knob[${ki}]: min/max galat`);
          else if (k.value < k.min || k.value > k.max) fail(`${sat} knob[${ki}]: starting value range se bahar`);
          else ok();
        });
        if (st.type === 'flowlab') {
          if (typeof st.model !== 'function') fail(`${sat}: model() function nahi`);
          if (typeof st.check !== 'function') fail(`${sat}: check() function nahi`);
          const ids = new Set((st.nodes || []).map(n => n.id));
          (st.edges || []).forEach((e, ei) => { if (!ids.has(e.from) || !ids.has(e.to)) fail(`${sat} edge[${ei}]: node nahi`); });
        } else {
          ['readouts', 'bars', 'verdict', 'check'].forEach(fn => { if (typeof st[fn] !== 'function') fail(`${sat}: ${fn}() nahi`); });
        }
        if (st.quiz) checkQ(st.quiz, `${sat} quiz`);
        if (!st.goal) warn(`${sat}: goal missing`);
        labStages.push({ at: sat, st, level: l });
      }
      if (st.type === 'docker') {
        if (!st.project) fail(`${sat}: project missing`);
        else {
          const pdir = path.join(DIR, 'docker-labs', st.project);
          if (!fs.existsSync(pdir)) fail(`${sat}: docker-labs/${st.project} folder nahi hai`);
          else if (st.exercise) {
            const readme = fs.existsSync(path.join(pdir, 'README.md')) ? fs.readFileSync(path.join(pdir, 'README.md'), 'utf8') : '';
            if (!readme.includes(st.exercise)) fail(`${sat}: exercise '${st.exercise}' project README mein nahi mila`);
            else ok();
          }
        }
        if ((st.steps || []).length < 2) fail(`${sat}: kam se kam 2 steps chahiye`);
        (st.steps || []).forEach((s, i) => { if (!s.text) fail(`${sat} step[${i}]: text missing`); });
        checkQ(st.observe, `${sat} observe`);
        labStages.push({ at: sat, st, level: l });
      }
      if (['replay', 'estimate', 'archdiff'].includes(st.type)) labStages.push({ at: sat, st, level: l });
    });
  });

  AB.tracks.forEach(t => {
    const ls = AB.levelSets[t.id] || [];
    const bossIdx = ls.findIndex(l => /^boss/.test(l.id));
    if (bossIdx > -1 && bossIdx !== ls.length - 1) fail(`track '${t.id}': boss level aakhir mein nahi`);
    else ok();
  });
  for (let i = 1; i < RANKS.length; i++) {
    if (RANKS[i].xp <= RANKS[i - 1].xp) fail(`RANKS: xp badhta nahi (${RANKS[i - 1].name} → ${RANKS[i].name})`);
  }
  /* reachable XP vs top rank (moti hisaab: har item 10, har stage 20 bonus, cards 5) */
  let maxXP = 0;
  allLevels.forEach(({ level: l }) => allStages(l).forEach(st => {
    const n = st.type === 'quiz' || st.type === 'interview' ? (st.questions || []).length
      : st.type === 'bins' ? (st.items || []).length : st.type === 'match' ? (st.pairs || []).length
      : st.type === 'order' ? (st.steps || []).length : st.type === 'dryrun' ? (st.steps || []).filter(s => s.ask).length
      : st.type === 'flowlab' ? (st.quiz ? 2 : 1) : 1;
    maxXP += n * 10 + 20;
  }));
  allLevels.forEach(({ level: l }) => { maxXP += (l.cards || []).length * 5; });
  const top = RANKS[RANKS.length - 1];
  if (allLevels.length && maxXP < top.xp) warn(`RANKS: top rank ${top.xp} XP maangta hai par content se ~${maxXP} milta hai`);

  const used = new Set(allLevels.map(x => x.level.id));
  allLevels.forEach(({ level: l }) => allStages(l).forEach(st => { if (st.visual) used.add(st.visual); }));
  Object.keys(VISUALS).forEach(k => { if (!used.has(k)) warn(`VISUALS['${k}'] kisi level/stage se use nahi hota`); });

  const NON_LATIN = /[Ѐ-ӿऀ-ॿ؀-ۿ]/;
  ENGINE.concat(CONTENT).forEach(f => {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) return;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(NON_LATIN);
      if (m) fail(`${f}:${i + 1} — non-Latin character '${m[0]}': ${line.trim().slice(0, 70)}`);
    });
  });
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  ENGINE.concat(CONTENT).forEach(f => {
    if (fs.existsSync(path.join(DIR, f)) && !html.includes(`src="${f}"`)) fail(`index.html mein <script src="${f}"> nahi hai`);
    else ok();
  });
  CONTENT.forEach(f => { if (!fs.existsSync(path.join(DIR, f))) warn(`${f} abhi bani nahi`); });
}

/* =====================================================================
   2. LABS — render karke jeet ke dikhao
   ===================================================================== */
function findAll(node, out) {
  out = out || [];
  (node.children || []).forEach(c => { out.push(c); findAll(c, out); });
  return out;
}
function byClass(root, cls) {
  return findAll(root).filter(n => String(n.className || '').split(' ').indexOf(cls) > -1);
}
function one(root, cls) { return byClass(root, cls)[0]; }
function clickRight(root, cls, answer) {
  const opt = byClass(root, cls).find(b => b.dataset.i === String(answer) && !b.disabled);
  if (opt) opt.click();
  return !!opt;
}
function sweep(st, at, fn) {
  const knobs = st.knobs || [];
  const vals = knobs.map(k => {
    const a = [], step = k.step || 1;
    for (let v = k.min; v <= k.max + 1e-9; v += step) a.push(+v.toFixed(6));
    return a;
  });
  const total = vals.reduce((a, v) => a * v.length, 1);
  if (total > 400000) { warn(`${at}: ${total} knob combinations — sweep skip`); return; }
  let solvable = 0, crash = null;
  const cur = {};
  const walk = i => {
    if (i === knobs.length) {
      try { if (fn(cur)) solvable++; } catch (e) { crash = crash || e.message; }
      return;
    }
    for (const v of vals[i]) { cur[knobs[i].id] = v; walk(i + 1); }
  };
  walk(0);
  if (crash) fail(`${at}: check()/model() crash — ${crash}`);
  if (!solvable) fail(`${at}: UNSOLVABLE — ${total} combinations mein se ek bhi goal poora nahi karta`);
  else ok();
  const start = {};
  knobs.forEach(k => { start[k.id] = k.value; });
  let pre = false;
  try { pre = !!fn(start); } catch (e) { fail(`${at}: starting values par crash — ${e.message}`); }
  if (pre) fail(`${at}: goal SHURU MEIN HI poora hai — knob chhoona hi nahi padega`);
  else ok();
  return { total, solvable };
}

function labs() {
  console.log('\n🎛️  LABS (render + jeet ke dikhao)');
  let n = 0;
  labStages.forEach(({ at, st, level }) => {
    if (ONLY && level.id !== ONLY) return;
    n++;
    const renderer = AB.renderers[st.type];
    if (!renderer) return fail(`${at}: renderer '${st.type}' nahi mila`);

    if (st.type === 'flowlab') {
      sweep(st, at, k => {
        const m = st.model(Object.assign({}, k));
        if (!m || typeof m !== 'object') throw new Error('model() ne object nahi lautaya');
        const svg = AB.viz.svg(st.nodes || [], st.edges || [], { nodes: m.nodes, flows: m.flows });
        if (/undefined|NaN/.test(svg)) throw new Error('diagram mein undefined/NaN');
        (m.readouts || []).forEach(r => { if (/undefined|NaN/.test(String(r.value))) throw new Error(`readout '${r.label}' = ${r.value}`); });
        (m.bars || []).forEach(b => { if (!isFinite(b.pct)) throw new Error(`bar '${b.label}' pct = ${b.pct}`); });
        if (!m.verdict || typeof m.verdict.text !== 'string') throw new Error('verdict missing');
        return !!st.check(Object.assign({}, k));
      });
    }
    if (st.type === 'tradeoff') sweep(st, at, k => !!st.check(Object.assign({}, k)));

    const arena = makeEl('div');
    let done = null;
    try { renderer(st, arena, r => { done = r; }); }
    catch (e) { return fail(`${at}: render crash — ${e.message}`); }
    ok();

    if (st.type === 'dryrun') {
      const steps = st.steps || [];
      for (let i = 0, guard = 0; guard < steps.length * 3 + 5 && !done; guard++) {
        const cur = steps[Math.min(i, steps.length - 1)];
        if (cur.ask && byClass(arena, 'dr-opt').length) {
          if (!clickRight(arena, 'dr-opt', cur.ask.answer)) { fail(`${at}: step[${i}] ka sahi option render nahi hua`); break; }
        }
        const endBtn = one(arena, 'dr-done');
        if (endBtn) { endBtn.click(); break; }
        const nx = one(arena, 'dr-next');
        if (!nx) break;
        if (nx.disabled) { fail(`${at}: step[${i}] par sahi jawab ke baad bhi 'Agla' disabled — SOFTLOCK`); break; }
        nx.click();
        i++;
      }
      const asks = steps.filter(s => s.ask).length;
      if (!done) fail(`${at}: SOFTLOCK — dry run end tak nahi pahuncha`);
      else if (done.firstTry !== asks || done.total !== asks) fail(`${at}: sab sahi jawab diye par score ${done.firstTry}/${done.total} (asks ${asks})`);
      else ok();
      /* HTML sanity: har step ka diagram undefined/NaN se khaali */
      steps.forEach((s, i) => {
        const svg = AB.viz.svg(st.nodes || [], st.edges || [], { nodes: s.nodes, flows: s.flows });
        if (/undefined|NaN/.test(svg)) fail(`${at} step[${i}]: diagram mein undefined/NaN`);
      });
    }
    if (st.type === 'flowlab') {
      /* ek jeetne wala combination dhoondho aur renderer ke andar laga ke win-walk karo */
      const knobs = st.knobs || [];
      let winK = null;
      const cur = {};
      const find = i => {
        if (winK) return;
        if (i === knobs.length) { try { if (st.check(Object.assign({}, cur))) winK = Object.assign({}, cur); } catch (e) {} return; }
        const k = knobs[i];
        for (let v = k.min; v <= k.max + 1e-9 && !winK; v += (k.step || 1)) { cur[k.id] = +v.toFixed(6); find(i + 1); }
      };
      find(0);
      if (winK && arena._flowlabSet) {
        arena._flowlabSet(winK);
        if (st.quiz) clickRight(arena, 'fl-opt', st.quiz.answer);
        const nx = one(arena, 'fl-next');
        if (nx) nx.click();
        if (!done) fail(`${at}: SOFTLOCK — jeetne wali values par bhi lab poora nahi hua`);
        else if (done.firstTry !== done.total) fail(`${at}: sahi values + sahi quiz par score ${done.firstTry}/${done.total}`);
        else ok();
      }
    }
    if (st.type === 'docker') {
      byClass(arena, 'dk-tick').forEach(b => b.click());
      if (!clickRight(arena, 'dk-opt', st.observe.answer)) fail(`${at}: saare steps tick karne par bhi observe sawaal nahi aaya`);
      const d = one(arena, 'dk-done');
      if (d) d.click();
      if (!done) fail(`${at}: SOFTLOCK — docker lab poora nahi hua`);
      else if (done.firstTry !== 1) fail(`${at}: sahi jawab par firstTry ${done.firstTry}`);
      else ok();
    }
    if (st.type === 'replay') {
      const asks = (st.frames || []).filter(f => f.ask);
      let ai = 0;
      for (let guard = 0; guard < (st.frames || []).length * 4 + 20 && !done; guard++) {
        const opts = byClass(arena, 'rp-opt');
        if (opts.length && ai < asks.length) {
          const want = asks[ai].ask.answer;
          if (!opts[want]) { fail(`${at}: ask[${ai}] option nahi`); break; }
          opts[want].click(); ai++;
          const go = one(arena, 'rp-go'); if (go) go.click();
        } else {
          const nxt = one(arena, 'rp-play') || one(arena, 'rp-done');
          if (!nxt) break;
          nxt.click();
        }
      }
      if (!done) fail(`${at}: SOFTLOCK — replay poora nahi hua`); else ok();
    }
    if (st.type === 'archdiff') {
      const flawIds = (st.flaws || []).map(f => f.id);
      byClass(arena, 'ad-node').filter(c => flawIds.indexOf(c.dataset.id) > -1).forEach(c => c.click());
      const fin = one(arena, 'ad-done'); if (fin) fin.click();
      if (!done) fail(`${at}: SOFTLOCK — archdiff poora nahi hua`); else ok();
    }
    if (st.type === 'estimate') {
      const probs = st.problems || [];
      for (let i = 0; i < probs.length + 2 && !done; i++) {
        const inp = byClass(arena, 'es-input')[0];
        const go = one(arena, 'es-go');
        if (inp && go) { inp.value = String(probs[Math.min(i, probs.length - 1)].answer); go.click(); }
        const nxt = one(arena, 'es-next'); if (nxt) nxt.click();
      }
      if (!done) fail(`${at}: SOFTLOCK — estimate poora nahi hua`); else ok();
    }
  });
  console.log(`  ${n} labs render hue aur jeet ke dikhaye`);
}

/* =====================================================================
   3. RENDER — app.js boot + har level ka intro
   ===================================================================== */
function render() {
  console.log('\n🖼️  RENDER (app.js boot + har intro)');
  try { vm.runInContext(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8'), sandbox, { filename: 'app.js' }); }
  catch (e) { fail(`app.js boot nahi hua: ${e.message}`); return; }
  ok();
  let n = 0;
  allLevels.forEach(({ track, level: l }) => {
    try {
      vm.runInContext(`showIntro(AB.levelSets[${JSON.stringify(track.id)}].find(x => x.id === ${JSON.stringify(l.id)}))`, sandbox);
      n++;
      const app = sandbox.document._els['app'];
      const html = findAll(app).map(c => (c._html || '') + ' ' + (c._txt || '')).join(' ');
      if (/undefined|\[object Object\]|\bNaN\b/.test(html)) fail(`${l.id}: intro HTML mein undefined/NaN`);
      else ok();
    } catch (e) { fail(`${l.id}: intro render crash — ${e.message}`); }
  });
  console.log(`  ${n} level intro screens render hue`);
  Object.keys(VISUALS).forEach(k => {
    if (!VISUALS[k].t || !VISUALS[k].html) fail(`VISUALS['${k}']: 't' ya 'html' missing`); else ok();
  });
}

/* =====================================================================
   4. DOCKER LABS — har project ki shakl
   ===================================================================== */
function dockerLabs() {
  console.log('\n🐳 DOCKER LABS (project files)');
  const root = path.join(DIR, 'docker-labs');
  if (!fs.existsSync(root)) return warn('docker-labs/ folder abhi nahi hai');
  const used = new Set(labStages.filter(x => x.st.type === 'docker').map(x => x.st.project));
  fs.readdirSync(root).filter(d => fs.statSync(path.join(root, d)).isDirectory()).forEach(d => {
    const p = path.join(root, d);
    ['package.json', 'docker-compose.yml', 'README.md', 'Dockerfile', 'start.js'].forEach(f => {
      if (!fs.existsSync(path.join(p, f))) fail(`docker-labs/${d}: ${f} missing`); else ok();
    });
    if (!used.has(d)) warn(`docker-labs/${d}: kisi level ka docker stage isse use nahi karta`);
  });
}

/* =====================================================================
   RUN
   ===================================================================== */
structure();
labs();
if (!ONLY) render();
if (!ONLY) dockerLabs();
const stageCount = allLevels.reduce((a, x) => a + allStages(x.level).length, 0);
const cardCount = allLevels.reduce((a, x) => a + (x.level.cards || []).length, 0);
console.log(`\n📊 ${AB.tracks.length} tracks · ${allLevels.length} levels · ${stageCount} stages · ` +
  `${cardCount} flashcards · ${Object.keys(VISUALS).length} diagrams · ${labStages.length} interactive labs`);
AB.tracks.forEach(t => console.log(`   ${t.icon} ${t.id} ${(AB.levelSets[t.id] || []).map(l => l.id).join(' → ')}`));
if (errors) { console.log(`\n❌ ${errors} error · ${warns} warning · ${checks} checks pass\n`); process.exit(1); }
console.log(`\n✅ Koi problem nahi. ${checks} checks pass${warns ? ` · ${warns} warning` : ''}.\n`);
