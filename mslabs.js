/* =====================================================================
   Arpit Bhayani Classes — Microservices labs
   dryrun | flowlab | docker

   Contract (games.js jaisa): (stage, arena, onDone) → onDone({ firstTry, total })

   Do niyam jo System Gurukul se seekhe:
   1. Renderer apna state LEVEL DATA par kabhi nahi likhta — sab local variables.
   2. Har button ki apni CLASS hai (dr-next, dr-opt, fl-next, dk-tick, dk-opt,
      dk-done...) — validator buttons ko class se pakadta hai, text se nahi.

   Poori file IIFE mein — games.js ke top-level `const el` se takraav na ho.
   ===================================================================== */
(function () {
  const el = AB.el, escapeHtml = AB.escapeHtml, shake = AB.shake;

  function goalBox(text) {
    const g = el('div', 'lab-goal');
    g.appendChild(el('h4', null, '🎯 GOAL'));
    g.appendChild(el('div', 'lab-goal-text', text));
    return g;
  }

  /* ek MCQ card — sahi par onRight(firstTryBool), galat par shake + Dojo card */
  function askCard(q, cls, tag, onRight) {
    const card = el('div', 'ms-ask');
    card.appendChild(el('div', 'ms-ask-q', '🤔 ' + q.q));
    const fb = el('div', 'ms-ask-fb');
    let wrong = false, done = false;
    AB.shuffle(q.choices.map((c, i) => ({ c, i }))).forEach(({ c, i }) => {
      const b = el('button', 'ms-opt ' + cls, c);
      b.dataset.i = String(i);
      b.onclick = () => {
        if (done || b.disabled) return;
        if (i === q.answer) {
          done = true;
          b.classList.add('right');
          fb.className = 'ms-ask-fb good';
          fb.innerHTML = '✅ ' + (q.explain || 'Sahi!');
          onRight(!wrong);
        } else {
          if (!wrong) AB.noteMistake(q.q, `<b>${q.choices[q.answer]}</b><br>${q.explain || ''}`, tag);
          wrong = true;
          b.classList.add('wrong');
          b.disabled = true;
          shake(card);
          fb.className = 'ms-ask-fb bad';
          fb.innerHTML = '❌ Nahi — diagram dobara dekho aur ek aur try karo.';
        }
      };
      card.appendChild(b);
    });
    card.appendChild(fb);
    return card;
  }

  /* =====================================================================
     DRYRUN — ek click = ek badlaav. Request ka safar step-by-step.
     stage = { type:'dryrun', title, goal, nodes:[], edges:[], panels?:[{id,title}],
               steps:[{ say, flows?:[], nodes?:{id:{tone,badge}}, panels?:{id:[lines]},
                        clock?, ask?:{q,choices,answer,explain} }], lesson }
     Node aur panel ki state PICHLE steps se chalti aati hai jab tak badle nahi.
     ===================================================================== */
  AB.renderers.dryrun = function renderDryrun(stage, arena, onDone) {
    const steps = stage.steps || [];
    const answered = {};           /* stepIndex -> firstTry bool (LOCAL state) */
    let i = 0, finished = false;

    if (stage.goal) arena.appendChild(goalBox(stage.goal));
    const wrap = el('div', 'dr-wrap');
    const top = el('div', 'dr-top');
    const counter = el('div', 'dr-counter');
    const clock = el('div', 'dr-clock');
    top.append(counter, clock);
    const stageBox = el('div', 'dr-stage');
    const diagram = el('div', 'dr-diagram');
    const panels = el('div', 'dr-panels');
    stageBox.append(diagram, panels);
    const say = el('div', 'dr-say');
    const askSlot = el('div', 'dr-ask');
    const nav = el('div', 'dr-nav');
    const prev = el('button', 'btn ghost dr-prev', '← Pichla step');
    const next = el('button', 'btn big dr-next', 'Agla step →');
    nav.append(prev, next);
    const endSlot = el('div', 'dr-end');
    wrap.append(top, stageBox, say, askSlot, nav, endSlot);
    arena.appendChild(wrap);

    function stateAt(k) {
      const nodes = {}, pans = {};
      let clk = '';
      for (let j = 0; j <= k; j++) {
        const s = steps[j];
        Object.assign(nodes, s.nodes || {});
        Object.assign(pans, s.panels || {});
        if (s.clock) clk = s.clock;
      }
      return { nodes, pans, clk, flows: steps[k].flows || [] };
    }

    function paint() {
      const s = steps[i];
      const st = stateAt(i);
      counter.innerHTML = `Step <b>${i + 1}</b> / ${steps.length}` +
        `<span class="dr-dots">${steps.map((_, k) => `<i class="${k < i ? 'seen' : k === i ? 'on' : ''}"></i>`).join('')}</span>`;
      clock.textContent = st.clk ? '⏱ ' + st.clk : '';
      diagram.innerHTML = AB.viz.svg(stage.nodes || [], stage.edges || [], { nodes: st.nodes, flows: st.flows });
      panels.innerHTML = (stage.panels || []).map(p => {
        const lines = st.pans[p.id] || [];
        return `<div class="dr-panel"><div class="dr-ptitle">${p.title}</div>` +
          (lines.length ? lines.map(l => `<div class="dr-pline">${l}</div>`).join('') : '<div class="dr-pline muted">—</div>') +
          '</div>';
      }).join('');
      say.innerHTML = s.say || '';
      askSlot.innerHTML = '';
      prev.disabled = i === 0;
      const needAsk = s.ask && answered[i] === undefined;
      next.disabled = !!needAsk;
      next.textContent = i === steps.length - 1 ? 'Dry run poora ✔' : 'Agla step →';
      if (s.ask) {
        if (answered[i] === undefined) {
          askSlot.appendChild(askCard(s.ask, 'dr-opt', '🔍 Dry run', first => {
            answered[i] = first;
            next.disabled = false;
          }));
        } else {
          askSlot.appendChild(el('div', 'ms-ask-fb good', '✅ ' + (s.ask.explain || '')));
        }
      }
    }

    prev.onclick = () => { if (i > 0) { i--; paint(); } };
    next.onclick = () => {
      if (next.disabled) return;
      if (i < steps.length - 1) { i++; paint(); return; }
      if (finished) return;
      finished = true;
      nav.style.display = 'none';
      const box = el('div', 'lab-win');
      box.innerHTML = stage.lesson || '✅ Dry run poora.';
      endSlot.appendChild(box);
      const asks = Object.keys(answered);
      const firstTry = asks.filter(k => answered[k]).length;
      const done = el('button', 'btn big dr-done', 'Aage badho →');
      done.onclick = () => onDone({ firstTry, total: asks.length });
      endSlot.appendChild(done);
    };
    paint();
  };

  /* =====================================================================
     FLOWLAB — slider ghumao, services ka diagram aur numbers LIVE badlein.
     stage = { type:'flowlab', title, goal, scenario, knobs:[{id,label,min,max,step,value,unit,note}],
               nodes:[], edges:[], model: k => ({ nodes, flows, readouts, bars, verdict }),
               check: k => bool, lesson, quiz? }
     Validator poora knob sweep chala ke prove karta hai ki goal jeeta ja sakta hai
     aur shuru mein hi jeeta hua nahi hai.
     ===================================================================== */
  AB.renderers.flowlab = function renderFlowlab(stage, arena, onDone) {
    const knobs = stage.knobs || [];
    const k = {};
    knobs.forEach(kn => { k[kn.id] = kn.value; });
    let solved = false, touched = false, total = 1, firstTry = 0;

    arena.appendChild(goalBox(stage.goal || 'Knobs ghumao jab tak verdict hara na ho jaaye.'));
    if (stage.scenario) arena.appendChild(el('div', 'lab-scenario', stage.scenario));

    const panel = el('div', 'fl-panel');
    const left = el('div', 'fl-left');
    const kWrap = el('div', 'td-knobs');
    const inputs = [];
    knobs.forEach(kn => {
      const row = el('div', 'td-knob');
      const topRow = el('div', 'td-krow');
      topRow.appendChild(el('span', 'td-klabel', escapeHtml(kn.label)));
      const vv = el('span', 'td-kval', fmtKnob(kn, kn.value));
      topRow.appendChild(vv);
      row.appendChild(topRow);
      const input = el('input', 'td-slider fl-slider');
      input.type = 'range';
      input.min = String(kn.min); input.max = String(kn.max);
      input.step = String(kn.step || 1); input.value = String(kn.value);
      input.addEventListener('input', () => {
        k[kn.id] = Number(input.value);
        vv.textContent = fmtKnob(kn, k[kn.id]);
        touched = true;
        paint();
      });
      inputs.push(input);
      row.appendChild(input);
      if (kn.note) row.appendChild(el('div', 'td-knote', kn.note));
      kWrap.appendChild(row);
    });
    left.appendChild(kWrap);
    const right = el('div', 'fl-right');
    const diagram = el('div', 'fl-diagram');
    const roWrap = el('div', 'td-readouts');
    const barWrap = el('div', 'td-bars');
    const verdict = el('div', 'td-verdict');
    right.append(diagram, roWrap, barWrap, verdict);
    panel.append(left, right);
    arena.appendChild(panel);
    const winSlot = el('div', 'td-win-slot');
    arena.appendChild(winSlot);

    function fmtKnob(kn, v) {
      if (kn.labels && kn.labels[v] != null) return kn.labels[v];
      return String(v) + (kn.unit || '');
    }

    function paint() {
      const m = stage.model(k) || {};
      diagram.innerHTML = AB.viz.svg(stage.nodes || [], stage.edges || [], { nodes: m.nodes, flows: m.flows });
      roWrap.innerHTML = '';
      (m.readouts || []).forEach(r => {
        const c = el('div', 'td-ro ' + (r.tone || ''));
        c.appendChild(el('div', 'td-ro-l', escapeHtml(r.label)));
        c.appendChild(el('div', 'td-ro-v', r.value));
        roWrap.appendChild(c);
      });
      barWrap.innerHTML = '';
      (m.bars || []).forEach(b => {
        const row = el('div', 'td-bar');
        row.appendChild(el('div', 'td-blabel', escapeHtml(b.label)));
        const track = el('div', 'td-track');
        const fill = el('div', 'td-fill ' + (b.tone || ''));
        fill.style.width = Math.max(0, Math.min(100, b.pct)) + '%';
        track.appendChild(fill);
        row.appendChild(track);
        row.appendChild(el('div', 'td-btext', b.text));
        barWrap.appendChild(row);
      });
      const v = m.verdict || { ok: false, text: '' };
      verdict.className = 'td-verdict ' + (v.ok ? 'good' : 'bad');
      verdict.innerHTML = (v.ok ? '✅ ' : '⚠️ ') + v.text;
      if (!solved && touched && stage.check(k)) {
        solved = true;
        firstTry = 1;
        win();
      }
    }

    function win() {
      inputs.forEach(inp => { inp.disabled = true; });
      const box = el('div', 'lab-win');
      box.innerHTML = stage.lesson || '✅ Goal poora.';
      winSlot.appendChild(box);
      if (stage.quiz) {
        total = 2;
        winSlot.appendChild(askCard(stage.quiz, 'fl-opt', '🎛️ Flow lab', first => {
          if (first) firstTry++;
          const nx = el('button', 'btn big fl-next', 'Aage badho →');
          nx.onclick = () => onDone({ firstTry, total });
          winSlot.appendChild(nx);
        }));
      } else {
        const b = el('button', 'btn big fl-next', 'Aage badho →');
        b.onclick = () => onDone({ firstTry, total });
        winSlot.appendChild(b);
      }
    }

    paint();
    /* validator/tests ke liye: knobs set karke paint chalao (DOM events ke bina).
       Hook ARENA par hai (DOM), level data par nahi. */
    arena._flowlabSet = vals => { Object.assign(k, vals); touched = true; paint(); };
  };

  /* =====================================================================
     DOCKER — laptop par asli services chalao, todo, dekho, jawab do.
     stage = { type:'docker', title, project, exercise, goal, why?,
               steps:[{ text, cmd?, expect? }], observe:{q,choices,answer,explain} }
     Hum tumhare laptop ka output check nahi kar sakte — isliye har step ke saath
     "kya dikhna chahiye" diya hai, aur aakhir mein ek sawaal jiska jawab
     sirf chala ke hi pakka pata chalega.
     ===================================================================== */
  AB.renderers.docker = function renderDocker(stage, arena, onDone) {
    const steps = stage.steps || [];
    const ticked = steps.map(() => false);
    let asked = false;

    arena.appendChild(goalBox(stage.goal));
    const where = el('div', 'dk-where');
    where.innerHTML = `📁 <code>arpitbhayaniclasses/docker-labs/${escapeHtml(stage.project)}</code>` +
      (stage.exercise ? ` · exercise <code>${escapeHtml(stage.exercise)}</code>` : '') +
      `<div class="dk-note">Docker nahi hai? Har project <code>npm install && npm start</code> se bhi chalta hai (Node.js 18+). Poori details project ke <code>README.md</code> mein.</div>`;
    arena.appendChild(where);
    if (stage.why) arena.appendChild(el('div', 'lab-scenario', stage.why));

    const list = el('ol', 'dk-steps');
    steps.forEach((s, idx) => {
      const li = el('li', 'dk-step');
      li.appendChild(el('div', 'dk-text', s.text));
      if (s.cmd) {
        const row = el('div', 'dk-cmdrow');
        row.appendChild(el('pre', 'dk-cmd', escapeHtml(s.cmd)));
        const copy = el('button', 'btn ghost small dk-copy', '📋 Copy');
        copy.onclick = () => {
          try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) navigator.clipboard.writeText(s.cmd);
            copy.textContent = '✅ Copied';
          } catch (e) { copy.textContent = 'Select karke copy karo'; }
        };
        row.appendChild(copy);
        li.appendChild(row);
      }
      if (s.expect) {
        const ex = el('details', 'dk-expect');
        ex.innerHTML = `<summary>👀 Kya dikhna chahiye?</summary><pre>${escapeHtml(s.expect)}</pre>`;
        li.appendChild(ex);
      }
      const tick = el('button', 'btn small dk-tick', '✔ Ho gaya');
      tick.onclick = () => {
        ticked[idx] = !ticked[idx];
        tick.className = 'btn small dk-tick' + (ticked[idx] ? ' good' : '');
        tick.textContent = ticked[idx] ? '✅ Ho gaya' : '✔ Ho gaya';
        li.className = 'dk-step' + (ticked[idx] ? ' done' : '');
        maybeAsk();
      };
      li.appendChild(tick);
      list.appendChild(li);
    });
    arena.appendChild(list);
    const askSlot = el('div', 'dk-ask');
    arena.appendChild(askSlot);
    const skip = el('button', 'btn ghost small dk-skip', 'Abhi laptop paas nahi — sawaal pehle dekh lo');
    skip.onclick = () => { skip.remove(); ask(); };
    arena.appendChild(skip);

    function maybeAsk() { if (ticked.every(Boolean)) { skip.remove(); ask(); } }
    function ask() {
      if (asked) return;
      asked = true;
      askSlot.appendChild(askCard(stage.observe, 'dk-opt', '🐳 Docker lab', first => {
        const done = el('button', 'btn big dk-done', 'Aage badho →');
        done.onclick = () => onDone({ firstTry: first ? 1 : 0, total: 1 });
        askSlot.appendChild(done);
      }));
    }
  };
})();
