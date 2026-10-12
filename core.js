/* =====================================================================
   SQL Gurukul — Core: state, XP, streak, spaced repetition, registry
   Loaded FIRST. Everything lives under the global `AB` namespace so
   content files (data-*.js) can self-register levels & cards.
   (Ported from kubegurukul/core.js — SQL & MySQL edition)
   ===================================================================== */

/* kuch purane browsers/webviews mein scrollIntoView nahi hota — app na toote */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView)
  Element.prototype.scrollIntoView = function () {};

const AB = {
  STORE_KEY: 'arpitbhayaniclasses-v1',
  XP_PER_ITEM: 10,
  PERFECT_BONUS: 20,
  TERMINAL_XP: 30,       // base XP for completing a hands-on mission
  HINT_COST: 5,          // XP shaved off a terminal mission per hint
  CARD_XP: 5,            // XP per due flashcard reviewed
  POP_XP: 5,             // bonus XP per correct pop-quiz answer
  SRS_INTERVALS: [1, 3, 7, 16, 35],   // days — SM-2-lite boxes

  levelSets: {},         // trackId -> [level, ...]  (filled by data-*.js)
  tracks: [],            // filled by data-core.js
  state: null,
  session: null,
};

/* ---------------- level registry (extensibility hook) ----------------
   A data file calls:  AB.registerLevels('api', [ {...}, {...} ])
   Multiple calls append — so you can add ONE new level from ANY file. */
AB.registerLevels = function (trackId, levels) {
  if (!AB.levelSets[trackId]) AB.levelSets[trackId] = [];
  AB.levelSets[trackId].push(...levels);
};

/* Naya level track ke BEECH mein daalna ho (aur boss ko aakhir mein rakhna ho):
     AB.registerLevelsAfter('data', 'indexing', [ {...} ])
   Agar `afterId` nahi mila toh normal append ho jaata hai. */
AB.registerLevelsAfter = function (trackId, afterId, levels) {
  if (!AB.levelSets[trackId]) AB.levelSets[trackId] = [];
  const arr = AB.levelSets[trackId];
  const i = arr.findIndex(l => l.id === afterId);
  if (i < 0) arr.push(...levels);
  else arr.splice(i + 1, 0, ...levels);
};

/* ---------------- persistence ---------------- */
AB.defaultState = function () {
  return {
    xp: 0,
    completed: [],        // level ids
    stars: {},            // levelId -> 1..3
    dojo: {},             // cardId -> { box, due (ms), front, back, tag }
    streak: { last: null, count: 0, best: 0 },
    levelStarts: 0,       // for pop-quiz cadence
  };
};

AB.loadState = function () {
  try {
    const s = JSON.parse(localStorage.getItem(AB.STORE_KEY));
    if (s && typeof s.xp === 'number' && Array.isArray(s.completed)) {
      // forward-compat: fill any missing keys added in later versions
      return Object.assign(AB.defaultState(), s);
    }
  } catch (e) { /* corrupted store — start fresh */ }
  return AB.defaultState();
};
AB.saveState = function () { localStorage.setItem(AB.STORE_KEY, JSON.stringify(AB.state)); };
AB.state = AB.loadState();

/* ---------------- DOM helpers ---------------- */
AB.el = function (tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
AB.shuffle = function (arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
AB.shake = function (node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
};
AB.escapeHtml = function (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/* ---------------- XP & ranks ---------------- */
AB.currentRank = function () {
  let r = RANKS[0];
  for (const rank of RANKS) if (AB.state.xp >= rank.xp) r = rank;
  return r;
};
AB.nextRank = function () { return RANKS.find(r => r.xp > AB.state.xp) || null; };
AB.addXP = function (n) {
  if (AB.session && AB.session.replay) return;
  if (n <= 0) return;
  AB.state.xp += n;
  AB.touchStreak();
  AB.saveState();
  if (typeof renderTopbar === 'function') renderTopbar();
  AB.floatXP(n);
};
AB.floatXP = function (n) {
  const bar = document.getElementById('topbar');
  const f = AB.el('div', 'xp-float', `+${n} XP`);
  bar.appendChild(f);
  setTimeout(() => f.remove(), 1200);
};

/* ---------------- daily streak ---------------- */
AB.todayStr = function () {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
AB.touchStreak = function () {
  const s = AB.state.streak;
  const today = AB.todayStr();
  if (s.last === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  s.count = (s.last === yesterday) ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.last = today;
  AB.saveState();
};
AB.streakAlive = function () {
  const s = AB.state.streak;
  if (!s.last) return false;
  const today = AB.todayStr();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  return s.last === today || s.last === yesterday;
};

/* ---------------- Revision Dojo: SM-2-lite spaced repetition ----------
   Card = { box, due, front, back, tag }.  box indexes SRS_INTERVALS.
   - level complete  -> level.cards enter the deck (due tomorrow)
   - wrong answer    -> auto "mistake card" (due tomorrow, box 0)
   - review correct  -> box+1 (capped), due = now + interval[box]
   - review wrong    -> box = 0, due tomorrow                      */
AB.DAY = 24 * 60 * 60 * 1000;

AB.addCard = function (id, front, back, tag) {
  if (AB.state.dojo[id]) return; // already in the deck
  AB.state.dojo[id] = { box: 0, due: Date.now() + AB.DAY, front, back, tag: tag || '' };
  AB.saveState();
};

/* called by game renderers on a wrong answer — turns the mistake into a card */
AB.noteMistake = function (front, back, tag) {
  if (AB.session && AB.session.replay) return;
  if (!front || !back) return;
  // stable id from the front text so the same mistake never duplicates
  let h = 0;
  for (let i = 0; i < front.length; i++) h = ((h << 5) - h + front.charCodeAt(i)) | 0;
  AB.addCard('mistake-' + Math.abs(h), front, back, tag || '🙈 Galti se seekho');
};

AB.enrollLevelCards = function (level) {
  (level.cards || []).forEach((c, i) =>
    AB.addCard(`${level.id}-c${i}`, c.front, c.back, `${level.icon} ${level.title}`));
};

AB.dueCards = function () {
  const now = Date.now();
  return Object.entries(AB.state.dojo)
    .filter(([, c]) => c.due <= now)
    .map(([id, c]) => ({ id, ...c }));
};

AB.reviewCard = function (id, remembered) {
  const c = AB.state.dojo[id];
  if (!c) return;
  if (remembered) {
    c.box = Math.min(c.box + 1, AB.SRS_INTERVALS.length - 1);
    c.due = Date.now() + AB.SRS_INTERVALS[c.box] * AB.DAY;
  } else {
    c.box = 0;
    c.due = Date.now() + AB.DAY;
  }
  AB.saveState();
};

/* ---------------- pop-quiz question harvesting ----------------
   Pulls MCQs from already-completed levels (quiz stages + interview). */
AB.harvestQuestions = function () {
  const qs = [];
  AB.tracks.forEach(t => (AB.levelSets[t.id] || []).forEach(lvl => {
    if (!AB.state.completed.includes(lvl.id)) return;
    (lvl.stages || []).forEach(st => {
      if (st.type === 'quiz') (st.questions || []).forEach(q => qs.push({ ...q, from: lvl }));
    });
    if (lvl.interview) (lvl.interview.questions || []).forEach(q => {
      if (q.choices) qs.push({ ...q, from: lvl });
    });
  }));
  return qs;
};

/* ---------------- track helpers ---------------- */
AB.trackOf = function (level) {
  return AB.tracks.find(t => (AB.levelSets[t.id] || []).includes(level));
};
AB.levelsOf = function (track) { return AB.levelSets[track.id] || []; };
AB.trackProgress = function (track) {
  const levels = AB.levelsOf(track);
  const done = levels.filter(l => AB.state.completed.includes(l.id)).length;
  return { done, total: levels.length, complete: done === levels.length && levels.length > 0 };
};
AB.trackUnlocked = function (track) {
  /* Side-tracks (jaise 📡 The Feed) hamesha khule rehte hain — unmein naya
     content kabhi bhi aa sakta hai, isliye unhe pichhle track par mat roko. */
  if (track.alwaysUnlocked) return true;
  const idx = AB.tracks.indexOf(track);
  if (idx <= 0) return true;
  return AB.trackProgress(AB.tracks[idx - 1]).complete;
};
