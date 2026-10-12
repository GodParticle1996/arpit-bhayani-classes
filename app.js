/* =====================================================================
   Arpit Bhayani Classes — Screens & flow
   home → track → level intro (hook → steps → myth → decision card) →
   stages (dry run / flow lab / quiz / docker...) → 🎤 interview →
   success criteria → complete · Revision Dojo · pop quiz · certificates
   ===================================================================== */

const appEl = document.getElementById('app');
const topbarEl = document.getElementById('topbar');
// NOTE: el / escapeHtml / shake games.js ke top-level `const` se aate hain (global lexical scope).
// Yahan redeclare NAHI karna — warna SyntaxError: Identifier 'el' has already been declared.

/* ---------------- topbar ---------------- */
function renderTopbar() {
  const rank = AB.currentRank();
  const next = AB.nextRank();
  const pct = next
    ? Math.min(100, Math.round(((AB.state.xp - rank.xp) / (next.xp - rank.xp)) * 100))
    : 100;
  const st = AB.state.streak;
  const alive = AB.streakAlive() && st.count > 0;
  topbarEl.innerHTML = `
    <div class="brand" id="brand">🎓 <b>Arpit Bhayani Classes</b></div>
    <div class="rankbox">
      <span class="streakbox${alive ? '' : ' cold'}" title="Roz khelo, streak badhao! Best: ${st.best} din">${alive ? '🔥' : '🩶'} ${alive ? st.count : 0} din</span>
      <span class="rank">${rank.icon} ${rank.name}</span>
      <div class="xpbar"><div class="xpfill" style="width:${pct}%"></div></div>
      <span class="xptext">${AB.state.xp} XP${next ? ` · ${next.xp - AB.state.xp} to ${next.icon}` : ' · MAX RANK 👑'}</span>
    </div>`;
  topbarEl.querySelector('#brand').onclick = showHome;
}

/* ---------- visuals ---------- */
function diagramFor(id, hero) {
  const v = (typeof VISUALS !== 'undefined') && VISUALS[id];
  if (!v) return null;
  const d = el('div', 'diagram' + (hero ? ' hero' : ''));
  d.innerHTML = `<div class="dg-title">📊 ${v.t}</div>${v.html}`;
  return d;
}

/* ============================================================
   HOME
   ============================================================ */
function showHome() {
  AB.session = null;
  renderTopbar();
  appEl.innerHTML = '';

  const hero = el('section', 'hero', `
    <h1>Microservices seekho, <span class="glow">KhanaKart</span> ke saath</h1>
    <p>Arpit Bhayani ki videos ke concepts — ek asli jaisi food-delivery company par. Har concept pehle <b>dry run</b> mein dikhta hai (ek click = ek badlaav), phir <b>live lab</b> mein slider ghuma ke khud todo, phir <b>Docker</b> par asli Node.js services chala ke. Aakhir mein seedha jawab: <b>kab use karein, kab nahi, kaise</b>.</p>`);
  appEl.appendChild(hero);

  // dojo + streak strip
  const due = AB.dueCards();
  const deckSize = Object.keys(AB.state.dojo).length;
  const st = AB.state.streak;
  const strip = el('section', 'homestrip');

  const dojoCard = el('div', 'stripcard clickable' + (due.length ? ' due' : ''));
  dojoCard.innerHTML = `
    <div class="strip-icon">🧘</div>
    <div>
      <div class="strip-title">Revision Dojo</div>
      <div class="strip-sub">${due.length
        ? `<b style="color:var(--gold)">${due.length} card${due.length > 1 ? 's' : ''} due hain aaj</b> — bhoolne se pehle revise karo!`
        : deckSize
          ? `Sab revise ho chuka ✅ (deck mein ${deckSize} cards) — naye levels khelo`
          : 'Levels complete karoge toh yahan flashcards aayenge'}</div>
    </div>`;
  dojoCard.onclick = showDojo;
  strip.appendChild(dojoCard);

  const alive = AB.streakAlive() && st.count > 0;
  strip.appendChild(el('div', 'stripcard', `
    <div class="strip-icon">${alive ? '🔥' : '🩶'}</div>
    <div>
      <div class="strip-title">${alive ? `${st.count} din ki streak!` : 'Streak thandi hai'}</div>
      <div class="strip-sub">${alive ? `Best: ${st.best} din. Aaj bhi khelo, kal bhi!` : 'Aaj kuch bhi khelo — streak phir se shuru 🔥'}</div>
    </div>`));

  const totalDone = AB.state.completed.length;
  const totalLevels = AB.tracks.reduce((s, t) => s + AB.levelsOf(t).length, 0);
  strip.appendChild(el('div', 'stripcard', `
    <div class="strip-icon">🏅</div>
    <div>
      <div class="strip-title">${totalDone} / ${totalLevels} levels</div>
      <div class="strip-sub">${AB.state.xp} XP · rank: ${AB.currentRank().name}</div>
    </div>`));
  appEl.appendChild(strip);

  // tracks
  const map = el('section', 'trackmap');
  AB.tracks.forEach(track => {
    const p = AB.trackProgress(track);
    const unlocked = AB.trackUnlocked(track);
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    const card = el('div', 'trackcard' + (p.complete ? ' done' : '') + (unlocked ? '' : ' locked'));
    card.innerHTML = `
      <div class="tk-icon">${track.icon}</div>
      <div class="tk-name">${track.name}</div>
      <div class="tk-blurb">${track.blurb}</div>
      <div class="tk-bar"><div class="tk-fill" style="width:${pct}%"></div></div>
      <div class="tk-prog">${p.done}/${p.total} levels${p.complete ? ' · ✅ complete' : ''}</div>
      <div class="tk-go">${unlocked ? (p.done ? 'Aage badho →' : 'Shuru karo →') : '🔒 Pehle pichla track complete karo'}</div>`;
    if (unlocked) card.onclick = () => showTrack(track);
    map.appendChild(card);
  });
  appEl.appendChild(map);

  const foot = el('div', 'home-foot');
  const reset = el('button', 'btn ghost small', '↺ Saara progress reset karo');
  reset.onclick = () => {
    if (confirm('Saara XP, badges, streak aur Dojo cards mit jayenge. Pakka?')) {
      AB.state = AB.defaultState();
      AB.saveState();
      showHome();
    }
  };
  foot.appendChild(reset);
  appEl.appendChild(foot);
}

/* ============================================================
   TRACK — level map
   ============================================================ */
function showTrack(track) {
  AB.session = null;
  appEl.innerHTML = '';
  window.scrollTo(0, 0);

  const head = el('section', 'track-head');
  const back = el('button', 'btn ghost small', '← Saare tracks');
  back.onclick = showHome;
  head.appendChild(back);
  head.appendChild(el('h2', 'track-title', `${track.icon} ${track.name}`));
  appEl.appendChild(head);

  const levels = AB.levelsOf(track);
  const map = el('section', 'levelmap');
  levels.forEach((lvl, i) => {
    const done = AB.state.completed.includes(lvl.id);
    const unlocked = i === 0 || AB.state.completed.includes(levels[i - 1].id);
    const stars = AB.state.stars[lvl.id] || 0;
    const card = el('div', 'levelcard' + (done ? ' done' : '') + (unlocked ? '' : ' locked'));
    card.innerHTML = `
      <div class="lv-num">${unlocked ? `LEVEL ${i + 1}` : '🔒 LOCKED'}</div>
      <div class="lv-icon">${lvl.icon}</div>
      <div class="lv-title">${lvl.title}</div>
      <div class="lv-stars">${done ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : unlocked ? '▶ Khelo' : 'Pichla level pehle'}</div>
      ${done ? `<div class="lv-badge">🏅 ${lvl.badge}</div>` : ''}`;
    if (unlocked) card.onclick = () => showIntro(lvl);
    map.appendChild(card);
  });
  appEl.appendChild(map);

  if (AB.trackProgress(track).complete) {
    const cert = el('div', 'certbtn-wrap');
    const btn = el('button', 'btn big gold', `🏆 Apna ${track.certTitle} certificate dekho`);
    btn.onclick = () => showCertificate(track);
    cert.appendChild(btn);
    appEl.appendChild(cert);
  }
}

/* ============================================================
   LEVEL INTRO — objectives + lesson
   ============================================================ */
function showIntro(level) {
  appEl.innerHTML = '';
  const track = AB.trackOf(level);
  const levels = AB.levelsOf(track);
  const idx = levels.indexOf(level);
  const wrap = el('section', 'panel');
  wrap.appendChild(el('div', 'crumb', `${track.icon} ${track.name} — Level ${idx + 1} of ${levels.length}`));
  wrap.appendChild(el('h2', 'level-h', `${level.icon} ${level.title}`));

  if (level.hook) {
    wrap.appendChild(el('div', 'hook-card', `
      <div class="hook-tag">🚨 ${level.hook.when || 'KhanaKart'}</div>
      <div class="hook-title">${level.hook.title}</div>
      <div class="hook-text">${level.hook.text}</div>`));
  }

  if (level.objectives && level.objectives.length) {
    wrap.appendChild(el('div', 'obj-box', `
      <h4>🎯 Is level mein tum seekhoge</h4>
      <ul>${level.objectives.map(o => `<li>${o}</li>`).join('')}</ul>`));
  }

  const hero = diagramFor(level.id, true);
  if (hero) wrap.appendChild(hero);

  if (level.steps && level.steps.length) wrap.appendChild(renderSteps(level.steps));
  (level.lesson || []).forEach(html => wrap.appendChild(el('div', 'lesson-card', html)));
  if (level.myth && level.myth.length) wrap.appendChild(renderMyth(level.myth));
  if (level.playbook) wrap.appendChild(renderPlaybook(level.playbook, false));
  if (level.source) wrap.appendChild(renderSource(level.source));

  const totalStages = allStages(level).length;
  const bonusCount = level.stages.filter(s => s.bonus).length;
  if (bonusCount) wrap.appendChild(el('p', 'bonus-note',
    `🎁 Is level mein ${bonusCount} bonus "Good to Know" round hai — extra XP!`));
  wrap.appendChild(el('p', 'bonus-note', '🎤 Aakhri mein Interview Round hoga — asli interview jaise sawal!'));
  if (level.stages.some(s => s.type === 'docker'))
    wrap.appendChild(el('p', 'bonus-note', '🐳 Is level mein ek Docker exercise hai — laptop par asli Node.js services chalaoge.'));

  const replay = AB.state.completed.includes(level.id);
  if (replay) wrap.appendChild(el('p', 'replay-note', '🔁 Replay — pehle complete kar chuke ho, XP nahi milega (par stars sudhar sakte hain!)'));

  const row = el('div', 'btnrow');
  const back = el('button', 'btn ghost', '← Level map');
  back.onclick = () => showTrack(track);
  const start = el('button', 'btn big', `🎮 Shuru karo (${totalStages} challenges)`);
  start.onclick = () => {
    AB.state.levelStarts++;
    AB.saveState();
    const begin = () => {
      AB.session = { level, stageIdx: 0, firstTry: 0, total: 0, replay };
      runStage();
    };
    // Surprise pop quiz: har ~2nd level start par, purane concepts ka quick check
    const pool = AB.harvestQuestions().filter(q => q.from.id !== level.id);
    if (!replay && AB.state.completed.length >= 2 && AB.state.levelStarts % 2 === 0 && pool.length >= 3)
      showPopQuiz(pool, begin);
    else begin();
  };
  row.append(back, start);
  wrap.appendChild(row);
  appEl.appendChild(wrap);
  window.scrollTo(0, 0);
}

/* ============================================================
   LESSON BLOCKS — steps (ek card = ek sawaal), myth vs sach,
   decision card (kab / kab nahi / kaise / red flags), source
   ============================================================ */
function renderSteps(steps) {
  const box = el('section', 'steps-box');
  const pills = el('div', 'st-pills');
  const card = el('div', 'st-card');
  const nav = el('div', 'st-nav');
  const prev = el('button', 'btn ghost small st-prev', '← Pichla');
  const next = el('button', 'btn small st-next', 'Agla sawaal →');
  const all = el('button', 'btn ghost small st-all', '📜 Saare ek saath');
  let i = 0, showAll = false;

  function stepHtml(s, n) {
    return `
      <div class="st-q"><span class="st-num">${n}</span>${s.q}</div>
      ${s.analogy ? `<div class="st-analogy">🍵 ${s.analogy}</div>` : ''}
      ${s.body ? `<div class="st-body">${s.body}</div>` : ''}
      ${s.points ? `<ul class="st-points">${s.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
      ${s.example ? `<div class="st-example">🧾 <b>KhanaKart mein:</b> ${s.example}</div>` : ''}
      ${s.code ? `<pre>${escapeHtml(s.code)}</pre>` : ''}
      ${s.asli ? `<div class="st-asli">💡 <b>Asli baat:</b> ${s.asli}</div>` : ''}`;
  }
  function paint() {
    pills.innerHTML = '';
    steps.forEach((s, k) => {
      const p = el('button', 'st-pill' + (k === i && !showAll ? ' on' : '') + (k < i ? ' seen' : ''), String(k + 1));
      p.onclick = () => { showAll = false; i = k; paint(); };
      pills.appendChild(p);
    });
    card.innerHTML = showAll
      ? steps.map((s, k) => `<div class="st-one">${stepHtml(s, k + 1)}</div>`).join('')
      : stepHtml(steps[i], i + 1);
    prev.disabled = showAll || i === 0;
    next.style.display = showAll || i === steps.length - 1 ? 'none' : '';
    all.textContent = showAll ? '🃏 Ek-ek karke' : '📜 Saare ek saath';
  }
  prev.onclick = () => { if (i > 0) { i--; paint(); } };
  next.onclick = () => { if (i < steps.length - 1) { i++; paint(); } };
  all.onclick = () => { showAll = !showAll; paint(); };
  nav.append(prev, next, all);
  box.append(el('div', 'st-head', '📖 Samjho — ek card, ek sawaal'), pills, card, nav);
  paint();
  return box;
}

function renderMyth(myths) {
  const box = el('section', 'myth-box');
  box.innerHTML = `<h4>🧐 Myth vs Sach</h4>` + myths.map(m => `
    <div class="myth-row">
      <div class="myth-m">❌ ${m.myth}</div>
      <div class="myth-s">✅ ${m.sach}</div>
    </div>`).join('');
  return box;
}

function renderPlaybook(pb, compact) {
  const col = (cls, title, items) => (items && items.length)
    ? `<div class="pb-col ${cls}"><h5>${title}</h5><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></div>` : '';
  const box = el('section', 'playbook' + (compact ? ' compact' : ''));
  box.innerHTML = `
    <h4>🧭 Decision Card — ${pb.title || 'kab, kab nahi, kaise'}</h4>
    <div class="pb-grid">
      ${col('use', '✅ Kab use karein', pb.use)}
      ${col('avoid', '⛔ Kab nahi', pb.avoid)}
      ${col('how', '🛠️ Kaise implement karein', pb.how)}
      ${col('flags', '🚩 Red flags', pb.redflags)}
    </div>
    ${pb.rule ? `<div class="pb-rule">📌 ${pb.rule}</div>` : ''}`;
  return box;
}

function renderSource(src) {
  const t = src.at ? `&t=${src.at}s` : '';
  return el('div', 'source-note', `📺 Concept source: <a href="https://www.youtube.com/watch?v=${src.video}${t}" target="_blank" rel="noopener">${src.title}</a> — Arpit Bhayani. Yahan ki explanation, KhanaKart scenarios aur labs naye likhe gaye hain.`);
}

/* ============================================================
   SURPRISE POP QUIZ — purane levels se 3 random sawal
   ============================================================ */
function showPopQuiz(pool, onFinish) {
  const qs = AB.shuffle(pool).slice(0, 3);
  let qi = 0, correct = 0;
  appEl.innerHTML = '';
  const wrap = el('section', 'panel');
  wrap.innerHTML = `<div class="popquiz-banner">🎲 SURPRISE POP QUIZ</div>
    <p class="instructions">Purane concepts yaad hain? 3 quick sawal — sahi jawab par +${AB.POP_XP} bonus XP, galat par koi penalty nahi. (Bhoole hue concepts Dojo mein wapas aa jayenge.)</p>`;
  const arena = el('div', 'arena');
  wrap.appendChild(arena);
  appEl.appendChild(wrap);
  window.scrollTo(0, 0);

  function ask() {
    arena.innerHTML = '';
    const q = qs[qi];
    let answered = false;
    arena.appendChild(el('div', 'quiz-progress', `Sawal ${qi + 1} / ${qs.length} · from: ${q.from.icon} ${q.from.title}`));
    if (q.context) arena.appendChild(el('pre', 'context', escapeHtml(q.context)));
    arena.appendChild(el('div', 'question', q.q));
    const feedback = el('div', 'feedback');
    const choices = el('div', 'choices');
    AB.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const btn = el('button', 'choice', c);
      btn.onclick = () => {
        if (answered) return;
        answered = true;
        choices.querySelectorAll('.choice').forEach(b => b.disabled = true);
        if (i === q.answer) {
          correct++;
          AB.addXP(AB.POP_XP);
          btn.classList.add('correct');
          feedback.className = 'feedback good';
          feedback.innerHTML = `💡 ${q.explain}`;
        } else {
          btn.classList.add('wrong');
          AB.noteMistake(q.q, `<b>${q.choices[q.answer]}</b><br>${q.explain}`);
          feedback.className = 'feedback bad';
          feedback.innerHTML = `❌ Sahi jawab: <b>${q.choices[q.answer]}</b><br>💡 ${q.explain}`;
        }
        const next = el('button', 'btn', qi + 1 < qs.length ? 'Agla →' : 'Level shuru karo 🎮');
        next.onclick = () => { qi++; if (qi < qs.length) ask(); else onFinish(); };
        arena.appendChild(next);
      };
      choices.appendChild(btn);
    });
    arena.append(choices, feedback);
  }
  ask();
}

/* ============================================================
   STAGE RUNNER — level.stages + 🎤 interview at the end
   ============================================================ */
function allStages(level) {
  const st = level.stages.slice();
  if (level.interview) st.push({ type: 'interview', title: '🎤 Interview Round', ...level.interview });
  return st;
}

function runStage() {
  const { level, stageIdx } = AB.session;
  const stages = allStages(level);
  const stage = stages[stageIdx];
  appEl.innerHTML = '';
  window.scrollTo(0, 0);

  const isIv = stage.type === 'interview';
  const wrap = el('section', 'panel' + (stage.bonus ? ' bonus-panel' : '') + (isIv ? ' iv-panel' : ''));
  wrap.appendChild(el('div', 'crumb',
    `${level.icon} ${level.title} — challenge ${stageIdx + 1}/${stages.length}`));
  if (stage.bonus) wrap.appendChild(el('div', 'bonus-banner', '🎁 BONUS ROUND — Good to Know'));
  if (isIv) wrap.appendChild(el('div', 'iv-banner', '🎤 INTERVIEW ROUND'));
  wrap.appendChild(el('h2', 'stage-h', stage.title));
  if (stage.instructions) wrap.appendChild(el('p', 'instructions', stage.instructions));

  const dia = diagramFor(level.id, false);
  if (dia && stage.type !== 'hotspot') {
    const tog = el('button', 'dg-toggle', '📊 Concept diagram dikhao');
    dia.style.display = 'none';
    tog.onclick = () => {
      const show = dia.style.display === 'none';
      dia.style.display = show ? '' : 'none';
      tog.textContent = show ? '📊 Diagram chhupao' : '📊 Concept diagram dikhao';
    };
    wrap.appendChild(tog);
    wrap.appendChild(dia);
  }

  const arena = el('div', 'arena');
  wrap.appendChild(arena);
  appEl.appendChild(wrap);

  const renderer = isIv ? renderInterview : AB.renderers[stage.type];
  if (!renderer) { console.error('Unknown stage type', stage.type); stageDone({ firstTry: 0, total: 0 }, wrap); return; }
  renderer(stage, arena, stats => stageDone(stats, wrap));
}

function stageDone(stats, wrap) {
  AB.session.firstTry += stats.firstTry;
  AB.session.total += stats.total;
  const stages = allStages(AB.session.level);
  const perfect = stats.total > 0 && stats.firstTry === stats.total;
  if (perfect) AB.addXP(AB.PERFECT_BONUS);

  const sum = el('div', 'stage-summary pop');
  sum.innerHTML = `
    <div class="sum-emoji">${perfect ? '🌟' : stats.firstTry / (stats.total || 1) >= 0.6 ? '✅' : '😅'}</div>
    <div class="sum-title">${perfect ? 'PERFECT! +' + AB.PERFECT_BONUS + ' XP bonus' : 'Challenge complete'}</div>
    <div class="sum-detail">${stats.firstTry}/${stats.total} first-try sahi</div>`;
  const btn = el('button', 'btn big',
    AB.session.stageIdx + 1 < stages.length ? 'Agla challenge →' : 'Level khatam karo 🏁');
  btn.onclick = () => {
    AB.session.stageIdx++;
    if (AB.session.stageIdx < stages.length) runStage();
    else levelComplete();
  };
  sum.appendChild(btn);
  wrap.appendChild(sum);
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   🎤 INTERVIEW — MCQ + embedded terminal tasks
   questions: [{q, choices, answer, explain, context?} | {terminal: {...}}]
   ============================================================ */
function renderInterview(stage, arena, onDone) {
  let qi = 0, firstTry = 0, total = 0;

  function next() {
    qi++;
    if (qi < stage.questions.length) ask();
    else onDone({ firstTry, total });
  }

  function ask() {
    arena.innerHTML = '';
    const q = stage.questions[qi];
    arena.appendChild(el('div', 'quiz-progress', `Interviewer ka sawal ${qi + 1} / ${stage.questions.length}`));

    if (q.terminal && AB.renderers.terminal) {
      // hands-on interview task — sim terminal embedded
      total++;
      const bubble = el('div', 'iv-bubble', `
        <div class="iv-avatar">🧑‍💼</div>
        <div class="iv-q">${q.terminal.goal}</div>`);
      arena.appendChild(bubble);
      const sub = el('div');
      arena.appendChild(sub);
      AB.renderers.terminal(q.terminal, sub, stats => {
        firstTry += stats.firstTry;
        const btn = el('button', 'btn big', qi + 1 < stage.questions.length ? 'Interviewer ka agla sawal →' : 'Interview khatam 🎤');
        btn.onclick = next;
        sub.appendChild(btn);
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }

    total++;
    let mistake = false;
    arena.appendChild(el('div', 'iv-bubble', `
      <div class="iv-avatar">🧑‍💼</div>
      <div class="iv-q">${q.q}</div>`));
    if (q.context) arena.appendChild(el('pre', 'context', escapeHtml(q.context)));
    const feedback = el('div', 'feedback');
    const choices = el('div', 'choices');
    AB.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const btn = el('button', 'choice', c);
      btn.onclick = () => {
        if (btn.disabled) return;
        if (i === q.answer) {
          if (!mistake) { firstTry++; AB.addXP(AB.XP_PER_ITEM); }
          btn.classList.add('correct');
          choices.querySelectorAll('.choice').forEach(b => b.disabled = true);
          feedback.className = 'feedback good';
          feedback.innerHTML = `💡 ${q.explain}`;
          const nx = el('button', 'btn', qi + 1 < stage.questions.length ? 'Agla sawal →' : 'Interview khatam 🎤');
          nx.onclick = next;
          arena.appendChild(nx);
          nx.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          if (!mistake) AB.noteMistake(`🎤 ${q.q}`, `<b>${q.choices[q.answer]}</b><br>${q.explain}`);
          mistake = true;
          btn.classList.add('wrong');
          btn.disabled = true;
          shake(btn);
          feedback.className = 'feedback bad';
          feedback.innerHTML = '❌ Interviewer ne bhaun chadha li 🤨 — ek aur try?';
        }
      };
      choices.appendChild(btn);
    });
    arena.append(choices, feedback);
  }

  ask();
}

/* ============================================================
   LEVEL COMPLETE — success criteria + homework + Dojo cards
   ============================================================ */
function levelComplete() {
  const { level, firstTry, total, replay } = AB.session;
  const acc = total ? firstTry / total : 1;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;

  const firstClear = !AB.state.completed.includes(level.id);
  if (firstClear) {
    AB.state.completed.push(level.id);
    AB.enrollLevelCards(level);
  }
  AB.state.stars[level.id] = Math.max(AB.state.stars[level.id] || 0, stars);
  AB.touchStreak();
  AB.saveState();
  renderTopbar();

  appEl.innerHTML = '';
  const wrap = el('section', 'panel complete pop');
  wrap.innerHTML = `
    <div class="confetti">🎉</div>
    <h2>Level complete!</h2>
    <div class="big-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <div class="earned-badge">🏅 Badge mila: <b>${level.badge}</b></div>
    <div class="sum-detail">${firstTry}/${total} first-try sahi${replay ? ' · replay (no XP)' : ''}</div>`;

  if (level.success && level.success.length) {
    wrap.appendChild(el('h3', '', '✔ Ab tum yeh kar sakte ho:'));
    wrap.appendChild(el('ul', 'success-list', level.success.map(s => `<li>${s}</li>`).join('')));
  }

  if (firstClear && (level.cards || []).length) {
    wrap.appendChild(el('p', 'bonus-note',
      `🧘 ${level.cards.length} flashcards Revision Dojo mein add hue — kal se revise karna, bhoolna mat!`));
  }

  if (level.playbook) wrap.appendChild(renderPlaybook(level.playbook, true));

  if (level.homework) {
    wrap.appendChild(el('div', 'homework', `
      <h4>🏋️ Asli duniya ka homework (apne project par try karo)</h4>
      ${level.homework}`));
  }

  const track = AB.trackOf(level);
  const levels = AB.levelsOf(track);
  const row = el('div', 'btnrow center');
  const home = el('button', 'btn ghost', 'Level map');
  home.onclick = () => showTrack(track);
  row.appendChild(home);

  const idx = levels.indexOf(level);
  if (idx + 1 < levels.length) {
    const next = el('button', 'btn big', `Agla: ${levels[idx + 1].icon} ${levels[idx + 1].title} →`);
    next.onclick = () => showIntro(levels[idx + 1]);
    row.appendChild(next);
  } else {
    const cert = el('button', 'btn big gold', `🏆 ${track.certTitle} certificate lo!`);
    cert.onclick = () => showCertificate(track);
    row.appendChild(cert);
  }
  wrap.appendChild(row);
  appEl.appendChild(wrap);
  window.scrollTo(0, 0);
}

/* ============================================================
   🧘 REVISION DOJO — spaced-repetition flashcards
   ============================================================ */
function showDojo() {
  AB.session = null;
  appEl.innerHTML = '';
  window.scrollTo(0, 0);

  const wrap = el('section', 'panel');
  const back = el('button', 'btn ghost small', '← Home');
  back.onclick = showHome;
  wrap.appendChild(back);
  wrap.appendChild(el('div', 'dojo-head', '<h2>🧘 Revision Dojo</h2>'));

  const queue = AB.shuffle(AB.dueCards());
  const deckSize = Object.keys(AB.state.dojo).length;

  if (!queue.length) {
    const nextDue = Object.values(AB.state.dojo).reduce((m, c) => Math.min(m, c.due), Infinity);
    const days = nextDue === Infinity ? null : Math.max(0, Math.ceil((nextDue - Date.now()) / AB.DAY));
    wrap.appendChild(el('div', 'dojo-done', `
      <div class="big">🧘</div>
      <h3>Aaj koi card due nahi hai!</h3>
      <p class="dojo-count">${deckSize
        ? `Deck mein ${deckSize} cards hain. ${days != null ? `Agla revision ~${days} din mein.` : ''} Naye levels khel ke aur cards kamao.`
        : 'Levels complete karo — unke concepts flashcards ban ke yahan aayenge, spaced-repetition ke saath.'}</p>`));
    appEl.appendChild(wrap);
    return;
  }

  let i = 0, remembered = 0;
  const counter = el('p', 'dojo-count');
  const cardBox = el('div');
  wrap.append(counter, cardBox);
  appEl.appendChild(wrap);

  function showCard() {
    counter.textContent = `Card ${i + 1} / ${queue.length} · yaad rakha toh agla revision aur door chala jayega`;
    const c = queue[i];
    cardBox.innerHTML = '';
    const fc = el('div', 'flashcard pop');
    const inner = el('div', 'fc-inner');
    inner.append(
      el('div', 'fc-tag', c.tag || 'Flashcard'),
      el('div', 'fc-front', c.front),
    );
    const revealBtn = el('button', 'btn', '🔍 Jawab dikhao');
    revealBtn.onclick = () => {
      revealBtn.remove();
      inner.appendChild(el('div', 'fc-back', c.back));
      const row = el('div', 'btnrow center');
      const nope = el('button', 'btn danger', '😅 Bhool gaya');
      const yep = el('button', 'btn good', '😎 Yaad tha!');
      nope.onclick = () => { AB.reviewCard(c.id, false); nextCard(); };
      yep.onclick = () => { AB.reviewCard(c.id, true); remembered++; AB.addXP(AB.CARD_XP); nextCard(); };
      row.append(nope, yep);
      inner.appendChild(row);
    };
    inner.appendChild(revealBtn);
    fc.appendChild(inner);
    cardBox.appendChild(fc);
  }

  function nextCard() {
    i++;
    if (i < queue.length) { showCard(); return; }
    counter.textContent = '';
    cardBox.innerHTML = '';
    cardBox.appendChild(el('div', 'dojo-done pop', `
      <div class="big">🙏</div>
      <h3>Aaj ka revision ho gaya!</h3>
      <p class="dojo-count">${remembered}/${queue.length} yaad the.
      ${remembered < queue.length ? 'Jo bhool gaye, woh kal phir aayenge — tab tak pakka yaad ho jayega.' : 'Sab yaad! Intervals badh gaye — concepts ab lambe time tak saath rahenge.'}</p>`));
    const home = el('button', 'btn big', 'Home →');
    home.onclick = showHome;
    cardBox.appendChild(home);
  }

  showCard();
}

/* ============================================================
   CERTIFICATE
   ============================================================ */
function showCertificate(track) {
  appEl.innerHTML = '';
  const levels = AB.levelsOf(track);
  const totalStars = levels.reduce((s, l) => s + (AB.state.stars[l.id] || 0), 0);
  const maxStars = levels.length * 3;
  const wrap = el('section', 'panel cert pop');
  wrap.innerHTML = `
    <div class="cert-inner">
      <div class="cert-crown">${track.icon}</div>
      <h1>${track.certTitle}</h1>
      <p class="cert-sub">${track.certSub}</p>
      <p>ne ${track.name} ke saare ${levels.length} levels jeet liye</p>
      <div class="cert-stars">${'★'.repeat(Math.min(totalStars, maxStars))} <span>(${totalStars}/${maxStars} stars · ${AB.state.xp} XP total)</span></div>
      <div class="cert-badges">${levels.map(l => `<span title="${l.badge}">${l.icon}</span>`).join('')}</div>
      <p class="cert-formula">${track.formula}</p>
      <p class="cert-motto">${track.motto}</p>
    </div>`;
  const back = el('button', 'btn ghost', '← Level map');
  back.onclick = () => showTrack(track);
  wrap.appendChild(back);
  appEl.appendChild(wrap);
}

/* ---------------- boot ---------------- */
renderTopbar();
showHome();
