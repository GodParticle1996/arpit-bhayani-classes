/* =====================================================================
   Video 9 — Microservices banate waqt yaad rakhne wali baatein (team, architecture, business)
   Source concept: Arpit Bhayani — "Things to remember while building microservices" (youtube xbtE9IF4yRc)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'xbtE9IF4yRc', title: 'Things to remember while building microservices' };

  /* ---------------- models ---------------- */
  function decisionModel(k) {
    const edge = Math.min(5, Math.round(k.reviewers * 1.5 + k.data));
    const rework = Math.max(k.escalate ? 5 : 20, 60 - 12 * k.reviewers - 15 * k.data - (k.escalate ? 15 : 0));
    const days = Math.round((1 + k.reviewers * 0.8 + k.data * 2 + k.escalate) * 10) / 10;
    return { edge, rework, days };
  }
  function debtModel(k) {
    let debt = 5, total = 0, qsum = 0;
    const q = [];
    for (let m = 1; m <= 12; m++) {
      debt = Math.max(0, debt + (k.shortcuts ? 4 : 1.5) - k.debtPct * 0.35);
      const v = 10 * (1 - k.debtPct / 100) * Math.max(0.25, 1 - debt * 0.022);
      total += v; qsum += v;
      if (m % 3 === 0) { q.push(Math.round(qsum)); qsum = 0; }
    }
    const featureDays = Math.round(3 / Math.max(0.25, 1 - debt * 0.022) * 10) / 10;
    return { total: Math.round(total), q, featureDays };
  }
  function templateModel(k) {
    const collective = k.process === 1;
    const adoption = Math.min(98, (collective ? 70 : 45) + (k.reasons ? 15 : 0) + (k.optout ? 8 : -5));
    const happy = (collective ? 6 : 3) + (k.reasons ? 1.5 : 0) + (k.optout ? 1 : -1);
    const firstDay = k.features >= 4 ? 0.5 : k.features >= 2 ? 2 : 5;
    const heavy = k.features >= 6 && !k.optout;
    return { adoption: heavy ? adoption - 12 : adoption, happy: Math.max(1, Math.min(10, heavy ? happy - 2 : happy)), firstDay };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-team-conflicts'] = {
    t: 'Conflict se faisle tak',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-bad"><span class="ni">🗣️</span><span class="nl">Opinion vs opinion</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-accent"><span class="ni">📊</span><span class="nl">Data lao</span><span class="ns">benchmark, incidents, cost</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-accent"><span class="ni">👥</span><span class="nl">2-3 logon se review</span><span class="ns">silo nahi</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good"><span class="ni">🤝</span><span class="nl">Faisla + commit</span><span class="ns">asehmat ho tab bhi</span></div>
    </div>
    <div class="dg-cap">One-way door (wapas na aa sako) → seniors ko saaf batao aur consensus lo.</div>`,
  };
  VISUALS['ms-evolving-architecture'] = {
    t: 'Architecture badlega — taiyaar raho',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-accent"><span class="bx-label">🧱 Abstraction: business code interface jaane, DB nahi</span></div>
      <div class="dg-box is-gold"><span class="bx-label">🚪 One-way door: consensus + chhote reversible kadam (dual write, backfill, shadow read)</span></div>
      <div class="dg-box is-good"><span class="bx-label">🧹 Har sprint ~10-15% tech debt ke liye</span></div>
    </div>`,
  };
  VISUALS['ms-templates-business'] = {
    t: 'Template aur business — dono saath',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-pill acc">🧰 Service template</div>
        <div class="dg-box is-accent"><span class="bx-label">boilerplate + breaker + metrics + cache client</span></div>
        <div class="dg-box is-accent"><span class="bx-label">har choice ka "kyun" (ADR)</span></div>
        <div class="dg-box is-accent"><span class="bx-label">badlaav RFC + vote se</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-pill gold">💼 Business pehle</div>
        <div class="dg-box is-gold"><span class="bx-label">project = company goal se juda</span></div>
        <div class="dg-box is-gold"><span class="bx-label">outcome > output</span></div>
      </div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Conflicts
       ================================================================= */
    {
      id: 'ms-team-conflicts',
      icon: '🤝',
      title: 'Conflicts aur Faisle — Data se Baat, Silo mein Nahi',
      badge: 'Faisla Mitra',
      source: Object.assign({ at: 311 }, SRC),
      hook: {
        when: 'KhanaKart · design review',
        title: 'Order team vs delivery team: "gRPC!" "Nahi, REST!" — 3 hafte',
        text: 'Order-service ko delivery-service se rider assignment ke liye naya integration chahiye tha. Order team ke lead ne kaha "gRPC tez hai". Delivery team ke lead ne kaha "REST simple hai, humare paas gRPC tooling nahi". Teen meetings, 40 Slack messages, koi data nahi. Is beech junior engineer Karan ne akele baith kar ek "beech ka raasta" bana diya — jo teesri team ke retry logic ke saath toot gaya, kyunki Karan ne kisi se poochha nahi tha.',
      },
      objectives: [
        'Microservices = <b>growth ka mauka</b>: cross-team problems uthao, ownership dikhao',
        'Conflicts hote hi hain — <b>ek sahi jawab nahi</b>, situation ka trade-off',
        'Faisle <b>data se</b>; senior ko <b>referee</b> banao; <b>disagree and commit</b>; baar-baar ho toh escalate',
        '<b>Silo mein faisla</b> khatarnak; <b>one-way door</b> faislon par consensus',
      ],
      steps: [
        {
          q: 'Microservices mein growth kahan hai?',
          body: 'Bahut saari chhoti services, teams aur technologies = bahut saare <b>beech ke sawaal</b>. "Services ke beech gRPC ya REST?", "yeh service todein ya nahi?" Jo engineer yeh sawaal uthake data ke saath hal karta hai, woh ownership, accountability aur detail par dhyaan dikhata hai — aur us topic ka expert banta hai.',
        },
        {
          q: 'Conflict par kaise sochein?',
          points: [
            '<b>Ek sahi jawab nahi hota.</b> gRPC aur REST dono sahi ho sakte hain — situation par nirbhar.',
            '<b>Data lao</b>: benchmark, incident history, cost, team ki skills. Data nahi hai? Ek kadam peeche, pehle data.',
            'Naye engineer ho? <b>Senior ko referee</b> banao — aur dekho senior ambiguity kaise sambhalte hain.',
            'Cross-team jhagda? Seniors ko converge karne do, tum implementation par dhyaan do.',
          ],
        },
        {
          q: 'Asehmat hoon, phir bhi saath chalun?',
          analogy: 'Family trip: tumhe Goa jaana tha, sab Manali chune. Tum khushi-khushi Manali chalte ho — har baar ladai nahi. Par har trip par tumhari baat na suni jaaye toh baat karni chahiye.',
          body: '<b>Disagree and commit</b>: kabhi-kabhi team ki khushi ke liye faisle ke saath chalo, poore mann se. Agar yeh <b>baar-baar</b> ho raha hai — manager/seniors se baat karo.',
        },
        {
          q: 'Silo mein faisla kyun khatarnak?',
          body: 'Akele liya faisla woh edge cases miss karta hai jo doosre dekh lete: retries, timeouts, auth, migration. <b>2-3 engineers</b> ko shaamil karo — ek chhota design doc, 30 minute review. Bonus: sabki samajh ek jaisi, baad mein "yeh kisne aur kyun kiya?" nahi.',
          example: 'Karan ka "beech ka raasta" 10 minute ke review mein pakda jaata: teesri team ke retries ke saath duplicate rider assignment.',
        },
        {
          q: 'One-way door kya hota hai?',
          body: '<b>Two-way door</b>: galat nikla toh wapas aa sakte ho (feature flag, config, chhota API). Jaldi faisla lo.<br><b>One-way door</b>: wapas aana bahut mehenga (database badalna, public API hatana, data delete). Yahan <b>consensus</b>, seniors ko saaf batao "iske baad wapas nahi", aur data.',
          asli: 'Vision bhi badalta hai (pandemic mein offline dukaanein online aayi). Tumhara code kabhi scrap hoga — theek hai, ladna mat. Faisla us waqt ke data par sahi tha.',
        },
      ],
      myth: [
        { myth: 'Achha engineer apni baat par ada rehta hai jab tak jeet na jaaye.', sach: 'Achha engineer data laata hai, doosre ki baat sunta hai, aur faisle ke baad commit karta hai. Baar-baar asehmati par sahi forum mein baat karta hai.' },
        { myth: 'Chhota faisla hai, poochhne mein time barbaad.', sach: 'Two-way door ho toh jaldi lo, theek. Par "chhota" lagne wala faisla aksar doosri team ke retries, data ya contract ko chhoota hai — 2 logon ka 30 minute review sasta hai.' },
      ],
      playbook: {
        title: 'conflicts aur faisle',
        use: [
          'Design doc + 2-3 reviewers har cross-team integration par',
          'Benchmark/incident data har "X better hai" bahas mein',
          'Senior referee jab team atke',
          'Disagree and commit faisle ke baad',
        ],
        avoid: [
          'Opinion vs opinion meetings bina data',
          'Akele "beech ka raasta" bana dena',
          'One-way door faisle bina seniors ko bataye',
          'Har faisle par dobara bahas',
        ],
        how: [
          'Door pehchano: two-way (jaldi) ya one-way (consensus)',
          'Options + trade-offs + data ek page mein',
          'Reviewers: dono teams + ek neutral senior',
          'Faisla aur "kyun" ADR mein likho',
          'Commit — aur 3 mahine baad data dekh ke review',
        ],
        redflags: [
          'Ek hi bahas 3+ meetings',
          '"Yeh kisne kiya aur kyun?" — koi record nahi',
          'Ek engineer baar-baar asehmat, koi forum nahi',
        ],
        rule: 'Opinion se nahi, data se; akele nahi, 2-3 ke saath; aur faisle ke baad poora saath.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — delivery DB migration ka faisla',
          goal: 'Delivery team Postgres se Cassandra jaana chahti hai (<b>one-way door</b>). Edge cases <b>≥ 4/5</b> pakdo, rework risk <b>≤ 15%</b>, aur faisla <b>≤ 7 din</b> mein.',
          scenario: 'Chhupe edge cases: secondary indexes, transactions, backup, on-call skills, data migration. Har reviewer kuch dekhta hai, data (benchmark + cost) kuch aur.',
          knobs: [
            { id: 'data', label: 'Data', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'opinion ("Cassandra scale karta hai")', 1: 'benchmark + cost + incident data' } },
            { id: 'reviewers', label: 'Reviewers', min: 0, max: 4, step: 1, value: 0 },
            { id: 'escalate', label: 'Seniors ko "one-way door" batake consensus', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi, team hi decide', 1: 'haan' } },
          ],
          nodes: [N('delivery', 170, 260, { label: 'delivery team' }), N('user', 520, 90, { label: 'reviewers', icon: '👥' }), N('analytics', 520, 430, { label: 'data', icon: '📊' }), N('profile', 850, 260, { label: 'seniors', icon: '🧓' })],
          edges: [{ from: 'delivery', to: 'user' }, { from: 'delivery', to: 'analytics' }, { from: 'delivery', to: 'profile' }],
          model: k => {
            const m = decisionModel(k);
            const okE = m.edge >= 4, okR = m.rework <= 15, okD = m.days <= 7;
            return {
              nodes: {
                delivery: { tone: okE && okR && okD ? 'ok' : 'busy', badge: `${m.edge}/5 edge cases` },
                user: { tone: k.reviewers ? 'ok' : 'idle', badge: k.reviewers ? `${k.reviewers} reviewers` : 'silo' },
                analytics: { tone: k.data ? 'ok' : 'idle', badge: k.data ? 'benchmark + cost' : 'sirf opinion' },
                profile: { tone: k.escalate ? 'ok' : 'idle', badge: k.escalate ? 'one-way door — sign-off' : 'pata nahi' },
              },
              flows: [
                k.reviewers ? { from: 'delivery', to: 'user', label: 'design doc', tone: 'ok' } : null,
                k.data ? { from: 'delivery', to: 'analytics', label: 'numbers', tone: 'ok' } : null,
                k.escalate ? { from: 'delivery', to: 'profile', label: 'wapas nahi aa sakte', tone: 'acc' } : null,
              ].filter(Boolean),
              readouts: [
                { label: 'Edge cases pakde', value: `${m.edge} / 5`, tone: okE ? 'ok' : 'bad' },
                { label: 'Rework risk', value: m.rework + '%', tone: okR ? 'ok' : 'bad' },
                { label: 'Faisle mein time', value: m.days + ' din', tone: okD ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Rework risk', pct: m.rework, text: m.rework + '%', tone: okR ? 'ok' : 'bad' }],
              verdict: okE && okR && okD
                ? { ok: true, text: `Data + ${k.reviewers} reviewers + seniors ka sign-off: ${m.edge}/5 edge cases, risk ${m.rework}%, ${m.days} din.` }
                : !k.escalate && okE
                  ? { ok: false, text: 'Achha review, par database migration one-way door hai — seniors ko saaf batao aur consensus lo, warna risk 20% se neeche nahi.' }
                  : !okD
                    ? { ok: false, text: `${m.days} din — itne reviewers ki zaroorat nahi, 2-3 kaafi.` }
                    : { ok: false, text: `${m.edge}/5 edge cases, risk ${m.rework}% — ${k.data ? '' : 'data lao, '}${k.reviewers < 2 ? '2-3 reviewers shaamil karo' : ''}.` },
            };
          },
          check: k => { const m = decisionModel(k); return m.edge >= 4 && m.rework <= 15 && m.days <= 7; },
          lesson: '✅ <b>Achha faisla, sahi raftaar.</b> Data ne bahas chhoti ki, 2-3 reviewers ne edge cases pakde, aur one-way door par seniors ka sign-off mila.',
          quiz: {
            q: 'Agar faisla ek feature flag ke peeche naya UI button hota (two-way door)?',
            choices: [
              '1 reviewer aur jaldi faisla kaafi — galat nikla toh flag band',
              'Wahi 7 din ka process',
              'CTO ka sign-off',
              'Kabhi nahi karna',
            ],
            answer: 0,
            explain: 'Process ka wazan door ke hisaab se.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — gRPC vs REST bahas ko data se sulajhao',
          goal: 'Bahas kaise atki, aur kaunse kadamon ne 3 hafte ki bahas ko 3 din mein band kiya.',
          nodes: [N('order', 170, 110, { label: 'order team' }), N('delivery', 170, 420, { label: 'delivery team' }), N('analytics', 520, 260, { label: 'benchmark', icon: '📊' }), N('profile', 850, 260, { label: 'senior referee', icon: '🧓' })],
          edges: [{ from: 'order', to: 'analytics' }, { from: 'delivery', to: 'analytics' }, { from: 'analytics', to: 'profile' }],
          panels: [{ id: 'state', title: 'Bahas ka haal' }, { id: 'doc', title: 'Design doc' }],
          steps: [
            {
              say: '<b>Hafta 1-3.</b> Order team: "gRPC tez". Delivery team: "REST simple". Teen meetings. Koi numbers nahi. Karan ne akele beech ka raasta bana diya.',
              flows: [{ from: 'order', to: 'delivery', label: 'opinion', tone: 'bad' }],
              nodes: { order: { tone: 'bad', badge: '"gRPC!"' }, delivery: { tone: 'bad', badge: '"REST!"' } },
              panels: { state: ['3 meetings, 0 data', 'Karan ka silo fix'], doc: ['(nahi hai)'] },
              ask: {
                q: 'Sabse pehla sahi kadam?',
                choices: ['Asli workload par benchmark + dono teams ke constraints ek doc mein', 'Vote karo', 'Jiska lead senior uski baat', 'Dono banao'],
                answer: 0,
                explain: 'Data ke bina bahas taste ki ladai hai.',
              },
            },
            {
              say: '<b>Din 1.</b> Tech lead Neha ek page ka design doc banati hai: options, constraints (delivery team ke paas gRPC tooling nahi), aur ek benchmark plan.',
              flows: [{ from: 'order', to: 'analytics', label: 'constraints', tone: 'acc' }, { from: 'delivery', to: 'analytics', label: 'constraints', tone: 'acc' }],
              nodes: { analytics: { tone: 'busy', badge: 'benchmark plan' } },
              panels: { doc: ['Options: REST/JSON, gRPC', 'Constraints: tooling, 4,000 calls/s', 'Benchmark: payload, p50, CPU'] },
            },
            {
              say: '<b>Din 2.</b> Benchmark: payload binary mein ~6× chhota, client CPU kam, par p50 latency lagbhag barabar. Rider search khud 150 ms leta hai — latency farak 1% se kam.',
              flows: [{ from: 'analytics', to: 'order', label: 'latency ≈ same', tone: 'ok', back: true }, { from: 'analytics', to: 'delivery', label: 'payload 6× chhota', tone: 'ok', back: true }],
              nodes: { analytics: { tone: 'ok', badge: 'data ready' }, order: { tone: 'slow', badge: 'hmm' }, delivery: { tone: 'slow', badge: 'hmm' } },
              panels: { state: ['"Tez" ka daava latency par nahi tika', 'Faayda: bandwidth + CPU'] },
              ask: {
                q: 'Is data ke baad kaunsa sawaal faisla karega?',
                choices: ['4,000 calls/s par bandwidth/CPU bill kitna bachega vs delivery team ko gRPC tooling seekhne ka kharcha', 'Kaunsa naam cool hai', 'Kis team ka lead senior', 'Internet par kya trending'],
                answer: 0,
                explain: 'Trade-off ab numbers mein.',
              },
            },
            {
              say: '<b>Din 3.</b> Senior referee Vikram ke saath 30 minute: faisla — abhi REST (volume chhota, tooling nahi), 6 mahine baad calls 20,000/s paar hon toh gRPC RFC. Order team asehmat, par <b>commit</b> karti hai. ADR likha gaya.',
              flows: [{ from: 'analytics', to: 'profile', label: 'doc + data', tone: 'acc' }],
              nodes: { profile: { tone: 'ok', badge: 'faisla: REST abhi' }, order: { tone: 'ok', badge: 'disagree & commit' }, delivery: { tone: 'ok', badge: 'kaam shuru' } },
              panels: { state: ['Faisla 3 din mein', 'Review date: 6 mahine'], doc: ['ADR-0014: REST abhi, trigger 20k calls/s'] },
            },
          ],
          lesson: '<b>Asli baat:</b> doc + data + referee + commit. Aur faisle mein "kab dobara dekhenge" ka trigger likho — taaki haarne wali team ko pata ho raasta khula hai.',
        },
        {
          type: 'bins',
          title: 'Two-way door ya one-way door?',
          instructions: 'Har faisle ko sahi dabbe mein daalo.',
          bins: [{ id: 'two', label: '🚪↔️ Two-way (jaldi lo)' }, { id: 'one', label: '🚪➡️ One-way (consensus)' }],
          items: [
            { text: 'Checkout button ka rang (feature flag ke peeche)', bin: 'two', explain: 'Flag band, wapas.' },
            { text: 'Orders ko Postgres se Cassandra le jaana', bin: 'one', explain: 'Data model aur migration — wapas bahut mehenga.' },
            { text: 'Public API v1 band karna', bin: 'one', explain: 'Purane app users toot jaayenge.' },
            { text: 'Internal service ka timeout 800 ms se 600 ms', bin: 'two', explain: 'Config, wapas.' },
            { text: 'Purane orders ka data delete karna', bin: 'one', explain: 'Delete wapas nahi aata.' },
            { text: 'Naya internal endpoint (koi client nahi abhi)', bin: 'two', explain: 'Hata sakte ho.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Conflicts — quick check',
          questions: [
            {
              q: 'Tum junior ho aur do seniors ke beech design bahas mein atke ho. Sabse achha?',
              choices: ['Ek neutral senior ko referee banao, data jutao, aur dekho seniors ambiguity kaise sambhalte hain', 'Jo zyada bolta hai uski suno', 'Chup-chaap apna tareeka', 'Project chhod do'],
              answer: 0,
              explain: 'Referee + data + seekhna.',
            },
            {
              q: '"Disagree and commit" kab galat hai?',
              choices: ['Jab yeh baar-baar ho aur tumhari baat kabhi na suni jaaye — tab manager se baat', 'Kabhi galat nahi', 'Hamesha galat', 'Jab faisla chhota ho'],
              answer: 0,
              explain: 'Kabhi-kabhi theek, pattern bane toh escalate.',
            },
            {
              q: 'Silo mein faisle ka sabse bada nuksaan?',
              choices: ['Edge cases miss aur team mein shared samajh nahi', 'Time zyada', 'Code lamba', 'Koi nuksaan nahi'],
              answer: 0,
              explain: '2-3 log, 30 minute.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — REST vs binary, data se',
          project: '09-team-practices',
          exercise: 'ex1-data-decision',
          goal: 'Dono protocols ka benchmark chalao — pehle khaali, phir 150 ms rider search ke saath — aur faisle ke liye table banao.',
          steps: [
            { text: 'Install karo aur benchmark.', cmd: 'cd arpitbhayaniclasses/docker-labs/09-team-practices\nnpm install\nnpm start ex1-data-decision\nnpm run bench', expect: 'REST: HTTP/1.1 + JSON     210   45   ~4.8 ms ...\nBinary: HTTP/2 + codec    38    10   ~5.0 ms ...\n• Payload ~6× chhota • Client CPU kam • p50 latency lagbhag barabar' },
            { text: 'Ctrl+C. Asli kaam (150 ms) ke saath.', cmd: 'RIDER_SEARCH_MS=150 npm start ex1-data-decision\nnpm run bench 1000', expect: 'p50 dono ~151 ms — farak 1% se kam' },
          ],
          observe: {
            q: 'Is data ke hisaab se "gRPC hamesha tez" wala daava?',
            choices: [
              'Latency par nahi tika — faayda payload aur CPU mein hai; faisla volume, bill aur tooling dekh ke',
              'Sach nikla, gRPC 10× tez',
              'REST hamesha tez',
              'Benchmark bekaar hai',
            ],
            answer: 0,
            explain: 'tools/bench.js asli requests bhejta hai. Numbers aapki machine par thode alag honge — pattern wahi.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Behavioural + judgement',
        instructions: 'Senior/staff behavioural sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Ek baar batao jab tum team ke technical faisle se asehmat the."',
            choices: [
              'Situation, meri concern ka data, maine options aur trade-offs ek doc mein rakhe, referee/forum, faisla alag hua toh commit kiya aur review trigger rakha, baad mein data se kya seekha',
              '"Main hamesha sahi tha"',
              '"Maine chupchaap apna tareeka use kiya"',
              '"Maine kabhi asehmati nahi ki"',
            ],
            answer: 0,
            explain: 'STAR + data + commit.',
          },
          {
            q: 'Interviewer: "One-way vs two-way door decisions?"',
            choices: [
              'Two-way reversible — jaldi, chhoti team decide; one-way irreversible/mehenga — zyada data, stakeholders, sign-off, aur use chhote reversible kadamon mein todne ki koshish',
              'Sab faisle same process',
              'Sirf CTO decide kare',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'Process ka wazan risk ke hisaab se.',
          },
          {
            q: 'Interviewer: "Cross-team integration par consensus kaise banate ho?"',
            choices: [
              'Design doc with options/trade-offs, dono teams ke reviewers, data (benchmarks/incidents), time-boxed decision, ADR, aur follow-up review date',
              'Email chain',
              'Jiski service upstream uski baat',
              'Manager ko decide karne do hamesha',
            ],
            answer: 0,
            explain: 'Structure bahas ko chhota karta hai.',
          },
        ],
      },
      success: [
        'Main conflict mein data-driven raasta aur referee ka use samjha sakta hoon',
        'Main disagree and commit aur escalate karne ki seema bata sakta hoon',
        'Main silo faislon ke khatre gina sakta hoon',
        'Main one-way aur two-way door faisle pehchaan sakta hoon',
      ],
      homework: '<p>Apni team ki pichhli ek lambi bahas yaad karo. Ek page ka design doc dobara likho: options, constraints, kaunsa data chahiye tha, door type (one-way/two-way), reviewers, aur faisla + review trigger.</p>',
      cards: [
        { front: 'Conflict ka pehla hathiyar?', back: '<b>Data</b> — benchmark, incidents, cost. Data nahi toh pehle data.' },
        { front: 'Disagree and commit?', back: 'Asehmat ho tab bhi faisle ke saath <b>poore mann se</b>; baar-baar ho toh escalate.' },
        { front: 'Silo faisla kyun nahi?', back: 'Edge cases miss + shared samajh nahi. <b>2-3 reviewers</b>.' },
        { front: 'One-way door?', back: 'Wapas aana mehenga (DB migration, API hatana) → <b>consensus + seniors ko saaf batao</b>.' },
      ],
    },

    /* =================================================================
       LEVEL: Evolving architecture + tech debt
       ================================================================= */
    {
      id: 'ms-evolving-architecture',
      icon: '🌱',
      title: 'Badalta Architecture aur Tech Debt — Taiyaar Raho, Karza Chukao',
      badge: 'Karza Mukt',
      source: Object.assign({ at: 674 }, SRC),
      hook: {
        when: 'KhanaKart · Instamart ke 6 mahine baad',
        title: '"3 din ka feature" ab 2 hafte ka kyun hai?',
        text: 'Instamart launch jaldi karne ke liye team ne shortcuts liye: order code mein hardcoded "grocery" if-else, MySQL queries seedha controllers mein, tests baad mein. Launch hit hua. 6 mahine baad "pharmacy delivery" jodna tha — pehle aisa feature 3 din ka hota. Ab har if-else, har query ko chhoona pada: 2 hafte. Upar se business ne kaha orders DynamoDB par le jao (cost) — par MySQL queries poore code mein bikhri thi.',
      },
      objectives: [
        'Architecture <b>badlega</b> — requirements 2-3 mahine mein badal jaati hain',
        '<b>Abstraction</b> se graceful badlaav: business code interface jaane, DB nahi',
        'One-way door (DB migration) ko <b>chhote reversible kadamon</b> mein: contract tests, dual write, backfill, shadow read',
        '<b>Tech debt</b> kahan se aata hai aur har sprint <b>~10-15%</b> kyun',
      ],
      steps: [
        {
          q: 'Architecture kyun badalta hai?',
          body: 'Aaj MySQL chuna — sahi tha. 3 mahine baad traffic 10 guna, ya naya business (pharmacy), ya cost-cutting ka saal. Vision badalta hai, architecture ko saath badalna padta hai. Ladna nahi, taiyaar rehna hai.',
        },
        {
          q: 'Graceful badlaav ke liye design kaise?',
          analogy: 'Ghar mein bijli ka switch board: bulb LED ho ya CFL, switch wahi. Agar har bulb seedha deewar ke taaron mein jodha hota, toh har badlaav par deewar todni padti.',
          body: 'Business code ek <b>interface</b> jaane: <code>orderStore.put / get / listByUser</code>. MySQL ya DynamoDB us interface ke peeche "adapter". Badlaav = naya adapter, business code wahi.',
          asli: 'Abstraction ka matlab 10 layers nahi. Sirf wahan jahan badlaav ki sambhavna saaf hai (storage, external providers).',
        },
        {
          q: 'DB migration jaisa one-way door kaise paar karein?',
          points: [
            '<b>Contract tests</b>: ek test suite dono adapters par — naya store vaada poora kare.',
            '<b>Dual write</b>: dono stores mein likho, purane se padho.',
            '<b>Backfill</b>: purana data copy + checksum verify.',
            '<b>Shadow read</b>: naye store se bhi padho, compare, mismatches 0 hon.',
            '<b>Cutover</b>: naye se padho — purana kuch hafte zinda (wapas aane ka raasta).',
            'Seniors ko saaf: "purana store band karne ke baad wapas nahi."',
          ],
        },
        {
          q: 'Tech debt kahan se aata hai?',
          points: [
            '<b>Jaldi ship</b> karne ke shortcuts: hardcoded if-else, tests baad mein, copy-paste.',
            '<b>Vision beech mein badla</b> aur naya kaam purane architecture par jugaad se chipkaya.',
          ],
          example: 'Aaj ka 3 din ka feature, 6 mahine ke karze ke baad 1 mahine ka. Karza byaaj ke saath badhta hai.',
        },
        {
          q: 'Karza kaise chukayein?',
          body: 'Har sprint ka <b>~10-15%</b> tech debt ke liye pehle se rakho — "time milega tab" kabhi nahi milta. Jis quarter shortcuts zyada liye, us quarter hissa thoda badhao.',
          asli: '0% = pehle 3 mahine tez, phir raftaar girti hai. 30% = raftaar saaf par kam. Beech ka raasta saal bhar mein sabse zyada features deta hai.',
        },
      ],
      myth: [
        { myth: 'Tech debt hamesha buri engineering hai.', sach: 'Soch-samajh ke liya shortcut (launch deadline) sahi faisla ho sakta hai — agar likha ho aur chukane ka plan ho. Bura hai bina hisaab ka karza.' },
        { myth: 'Pehle din se perfect architecture bana lo, phir badlaav nahi.', sach: 'Requirements badalti hain. Perfect architecture ka intezaar launch rokta hai. Badlaav ke liye taiyaar architecture (abstractions, tests) behtar hai.' },
      ],
      playbook: {
        title: 'badalta architecture + tech debt',
        use: [
          'Storage aur external providers ke peeche interfaces',
          'Contract tests har adapter ke liye',
          'Har sprint 10-15% tech debt budget',
          'Debt register: kya shortcut, kyun, kab chukana',
        ],
        avoid: [
          'DB queries controllers mein bikhri',
          'Big-bang DB cutover bina dual write/shadow read',
          '"Time milega tab refactor karenge"',
          'Har jagah abstraction (over-engineering)',
        ],
        how: [
          'Shortcut lete waqt ticket + reason + chukane ki date',
          'Sprint planning mein debt ka hissa pehle',
          'Migration plan: contract tests → dual write → backfill → shadow read → cutover → purana hatao',
          'One-way door par seniors ka sign-off',
        ],
        redflags: [
          'Estimates har quarter lambe',
          '"Is file ko koi nahi chhoota"',
          'Migration ka rollback plan nahi',
        ],
        rule: 'Badlaav aayega — interface se taiyaar raho, aur karza har sprint thoda chukao.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — saal bhar ki raftaar',
          goal: '12 mahine mein <b>≥ 100 features</b>, aur saal ke ant mein "3 din wala feature" <b>≤ 4 din</b> ka.',
          scenario: 'Team har mahine ~10 features ki capacity. Karza (debt) raftaar ghatata hai. Debt budget capacity leta hai par karza chukata hai.',
          knobs: [
            { id: 'shortcuts', label: 'Shortcuts ka mood', min: 0, max: 1, step: 1, value: 1, labels: { 0: 'normal', 1: '"jaldi ship karo" quarter' } },
            { id: 'debtPct', label: 'Sprint ka debt budget', min: 0, max: 30, step: 5, value: 0, unit: '%' },
          ],
          nodes: [N('user', 170, 260, { label: 'team', icon: '👩‍💻' }), N('order', 520, 110, { label: 'features', icon: '🚀' }), N('db', 520, 420, { id: 'debt', icon: '🧾', label: 'tech debt' }), N('analytics', 850, 260, { label: 'saal ka hisaab' })],
          edges: [{ from: 'user', to: 'order' }, { from: 'user', to: 'debt' }, { from: 'order', to: 'analytics' }],
          model: k => {
            const m = debtModel(k);
            const okT = m.total >= 100, okF = m.featureDays <= 4;
            return {
              nodes: {
                user: { tone: 'acc', badge: `${100 - k.debtPct}% features · ${k.debtPct}% debt` },
                order: { tone: okT ? 'ok' : 'slow', badge: `${m.total} features/saal` },
                debt: { tone: okF ? 'ok' : 'bad', badge: `3-din feature → ${m.featureDays} din` },
                analytics: { tone: okT && okF ? 'ok' : 'busy', badge: `Q: ${m.q.join(' · ')}` },
              },
              flows: [
                { from: 'user', to: 'order', label: `${100 - k.debtPct}%`, tone: 'acc', rate: (100 - k.debtPct) / 100 },
                k.debtPct ? { from: 'user', to: 'debt', label: `${k.debtPct}% chukao`, tone: 'ok', rate: k.debtPct / 30 } : null,
                { from: 'order', to: 'analytics', tone: okT ? 'ok' : 'slow' },
              ].filter(Boolean),
              readouts: [
                { label: 'Features (12 mahine)', value: String(m.total), tone: okT ? 'ok' : 'bad' },
                { label: '"3 din" ka feature ab', value: m.featureDays + ' din', tone: okF ? 'ok' : 'bad' },
              ],
              bars: m.q.map((v, i) => ({ label: `Q${i + 1}`, pct: Math.min(100, v * 3.3), text: `${v} features`, tone: v >= 25 ? 'ok' : v >= 18 ? 'warn' : 'bad' })),
              verdict: okT && okF
                ? { ok: true, text: `${k.debtPct}% budget: ${m.total} features, har quarter lagbhag barabar (${m.q.join(', ')}), feature ${m.featureDays} din.` }
                : k.debtPct === 0
                  ? { ok: false, text: `0%: Q1 tez (${m.q[0]}), phir raftaar giri (${m.q.join(' → ')}). Saal ke ant mein 3 din ka kaam ${m.featureDays} din.` }
                  : k.debtPct >= 25
                    ? { ok: false, text: `${k.debtPct}%: karza saaf par capacity kam — ${m.total} features.` }
                    : { ok: false, text: `${k.debtPct}%: shortcuts ke hisaab se kam — karza ab bhi badh raha (${m.featureDays} din).` },
            };
          },
          check: k => { const m = debtModel(k); return m.total >= 100 && m.featureDays <= 4; },
          lesson: '✅ <b>Beech ka raasta sabse tez.</b> Karza na chukao toh raftaar girti hai; zyada chukao toh capacity jaati hai. Shortcuts wale quarter mein budget thoda badhao.',
          quiz: {
            q: 'Normal quarter (shortcuts kam) mein sabse zyada features kis budget par?',
            choices: ['~10%', '0%', '30%', '50%'],
            answer: 0,
            explain: 'Slider se check karo — 5-15% ke beech sabse zyada.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — orders MySQL se DynamoDB (one-way door)',
          goal: 'Har kadam par: wapas aa sakte hain? Kya verify hua?',
          nodes: [N('order', 140, 260, { label: 'orders-service' }), N('coupon', 485, 260, { id: 'iface', icon: '🧱', label: 'orderStore interface' }), N('db', 830, 90, { id: 'mysql', label: 'MySQL (purana)' }), N('db', 830, 430, { id: 'dynamo', label: 'DynamoDB (naya)' })],
          edges: [{ from: 'order', to: 'iface' }, { from: 'iface', to: 'mysql' }, { from: 'iface', to: 'dynamo', dashed: true }],
          panels: [{ id: 'step', title: 'Migration step' }, { id: 'back', title: 'Wapas aa sakte hain?' }],
          steps: [
            {
              say: '<b>Kadam 0.</b> Controllers se saari MySQL queries <b>orderStore</b> interface ke peeche. Business code ab sirf <code>put / get / listByUser</code> jaanta hai.',
              flows: [{ from: 'order', to: 'iface', tone: 'acc' }, { from: 'iface', to: 'mysql', label: 'MySQL adapter', tone: 'ok' }],
              nodes: { iface: { tone: 'ok', badge: 'nayi deewar' } },
              panels: { step: ['Refactor: queries → adapter'], back: ['Haan (sirf refactor)'] },
            },
            {
              say: '<b>Kadam 1.</b> DynamoDB adapter + <b>contract tests</b> (7 tests dono adapters par). Pehli koshish mein "sabse naya pehle" test fail — sort bhool gaye. Fix, 7/7.',
              flows: [{ from: 'iface', to: 'dynamo', label: 'contract tests', tone: 'slow' }],
              nodes: { dynamo: { tone: 'slow', badge: '4/7 → 7/7' } },
              panels: { step: ['Contract tests'], back: ['Haan (production chhua hi nahi)'] },
              ask: {
                q: 'Contract test na hote toh sort ka bug kab pakda jaata?',
                choices: ['Production mein — users ko "My orders" ulta dikhta', 'Kabhi nahi', 'Code review mein pakka', 'Compile time par'],
                answer: 0,
                explain: 'Interface ka vaada test se pakka.',
              },
            },
            {
              say: '<b>Kadam 2.</b> <b>Dual write</b>: har naya order dono mein. Padhna abhi MySQL se. <b>Backfill</b>: purane 4 crore orders copy + checksum — mismatch 0.',
              flows: [{ from: 'iface', to: 'mysql', label: 'write + read', tone: 'ok' }, { from: 'iface', to: 'dynamo', label: 'write + backfill', tone: 'acc' }],
              nodes: { dynamo: { tone: 'busy', badge: 'backfill ✅ checksum' } },
              panels: { step: ['Dual write + backfill'], back: ['Haan (MySQL hi source of truth)'] },
            },
            {
              say: '<b>Kadam 3.</b> <b>Shadow read</b>: har read par DynamoDB se bhi padho, compare, log. 1 hafte: 2 crore reads, 0 mismatch.',
              flows: [{ from: 'iface', to: 'dynamo', label: 'shadow read compare', tone: 'ok' }],
              nodes: { dynamo: { tone: 'ok', badge: 'mismatch 0' } },
              panels: { step: ['Shadow read 1 hafta'], back: ['Haan'] },
            },
            {
              say: '<b>Kadam 4.</b> Cutover: padhna DynamoDB se. MySQL mein dual write <b>2 hafte</b> aur chalta hai — dikkat ho toh config se wapas.',
              flows: [{ from: 'iface', to: 'dynamo', label: 'read + write', tone: 'ok' }, { from: 'iface', to: 'mysql', label: 'write (safety)', tone: 'slow' }],
              nodes: { mysql: { tone: 'slow', badge: 'safety net' }, dynamo: { tone: 'ok', badge: 'primary' } },
              panels: { step: ['Cutover'], back: ['Haan, 2 hafte tak'] },
              ask: {
                q: 'Asli "one-way" pal kaunsa hai?',
                choices: ['MySQL writes band karke MySQL delete karna — isliye seniors ka sign-off isi kadam par', 'Adapter likhna', 'Contract tests', 'Shadow read'],
                answer: 0,
                explain: 'Baaki sab kadam reversible the — door ko chhote kadamon mein toda.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> abstraction ne badlaav ko sambhav banaya, aur kadam-dar-kadam migration ne one-way door ko aakhri pal tak reversible rakha.',
        },
        {
          type: 'order',
          title: 'Migration ka kram',
          instructions: 'Ek store se doosre store tak jaane ke kadam sahi kram mein lagao.',
          steps: [
            { text: 'Business code ki queries ek interface/adapter ke peeche', explain: 'Bina deewar ke badlaav poore code mein.' },
            { text: 'Naya adapter + wahi contract tests dono par', explain: 'Vaada pakka.' },
            { text: 'Dual write (purane se hi padho)', explain: 'Naya data dono jagah.' },
            { text: 'Backfill + checksum verify', explain: 'Purana data bhi.' },
            { text: 'Shadow read compare — mismatches 0', explain: 'Asli traffic par saboot.' },
            { text: 'Cutover: naye se padho, purane mein kuch hafte safety write', explain: 'Wapas aane ka raasta.' },
            { text: 'Seniors ke sign-off ke baad purana store band', explain: 'Asli one-way pal.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Evolving architecture — quick check',
          questions: [
            {
              q: 'Tech debt budget ka sahi tareeka?',
              choices: ['Har sprint ~10-15% pehle se reserve', '"Jab time mile"', 'Saal mein ek refactor sprint', 'Kabhi nahi, sirf features'],
              answer: 0,
              explain: 'Byaaj se pehle chukao.',
            },
            {
              q: 'Abstraction kahan sabse zyada kaam ki?',
              choices: ['Storage aur external providers jahan badlaav ki sambhavna saaf', 'Har function ke upar', 'Sirf UI', 'Kahin nahi'],
              answer: 0,
              explain: 'Zaroorat ke hisaab se, over-engineering nahi.',
            },
            {
              q: 'Shadow read ka maqsad?',
              choices: ['Asli traffic par naye store ke jawab purane se match karte hain, bina users par asar', 'Speed badhana', 'Backup', 'Cache'],
              answer: 0,
              explain: 'Saboot cutover se pehle.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — store badlo, business code nahi',
          project: '09-team-practices',
          exercise: 'ex2-swap-store',
          goal: 'Contract tests se buggy store pakdo, phir dual write + backfill + shadow read se naye store par cutover.',
          steps: [
            { text: 'Contract tests.', cmd: 'npm run contract-test file\nnpm run contract-test kv\nnpm run contract-test kv-buggy', expect: '7/7 pass\n7/7 pass\n4/7 pass — yeh store abhi production ke layak nahi' },
            { text: 'Seed + dual mode.', cmd: "npm run seed\nSTORE=dual npm start ex2-swap-store\ncurl \"localhost:5111/v1/users/u1/orders?limit=5\"\ncurl localhost:5111/migration", expect: '{"mode":"dual","primaryCount":300,"shadowCount":0,...,"mismatches":1}' },
            { text: 'Backfill, counters reset, phir compare.', cmd: 'npm run backfill\ncurl -X POST localhost:5111/migration/reset-counters\ncurl "localhost:5111/v1/users/u2/orders?limit=5"\ncurl localhost:5111/migration', expect: 'Verify: file 300 · kv 300 · checksum mismatch 0 ✅\n{"mode":"dual",...,"mismatches":0}' },
            { text: 'Ctrl+C. Cutover.', cmd: 'STORE=kv npm start ex2-swap-store\ncurl "localhost:5111/v1/users/u2/orders?limit=3"', expect: '{"data":[...newest first...],"store":"kv"}' },
          ],
          observe: {
            q: 'Cutover ke liye services/orders.js mein business code ki kitni lines badli?',
            choices: [
              'Ek bhi nahi — sirf STORE env; routes sirf primary.put/get/listByUser jaante hain',
              'Saare routes',
              'Database queries',
              'Nayi service likhi',
            ],
            answer: 0,
            explain: 'lib/stores/ ke adapters interface ke peeche. Contract tests ne kv-buggy ko production se door rakha.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Evolution aur tech debt',
        instructions: 'Engineering leadership sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Tech debt aur feature pressure ko kaise balance karte ho?"',
            choices: [
              'Debt register (impact + cost), har sprint fixed budget (~10-20%), debt ko business impact (lead time, incidents) se jodna, shortcuts par explicit ticket aur payback date',
              'Pehle features, debt kabhi baad mein',
              'Features rok ke 3 mahine refactor',
              'Debt ignore',
            ],
            answer: 0,
            explain: 'Visible, budgeted, business-linked.',
          },
          {
            q: 'Interviewer: "Live system mein database kaise migrate karoge bina downtime?"',
            choices: [
              'Abstraction layer, contract tests, dual writes (ya CDC), backfill with verification, shadow reads/compare, gradual read cutover with rollback, phir purana decommission',
              'Weekend par downtime',
              'Dump and restore',
              'Naya system, purana band ek din',
            ],
            answer: 0,
            explain: 'Expand → migrate → contract.',
          },
          {
            q: 'Interviewer: "Over-engineering aur future-proofing mein farak?"',
            choices: [
              'Future-proofing wahan jahan badlaav ki sambhavna aur cost saaf (storage, vendors); over-engineering = har jagah abstractions "shayad kabhi" ke liye',
              'Dono same',
              'Future-proofing hamesha bura',
              'Hamesha maximum abstraction',
            ],
            answer: 0,
            explain: 'YAGNI + seams at likely change points.',
          },
        ],
      },
      success: [
        'Main samjha sakta hoon architecture kyun badalta hai aur abstraction kaise madad karta hai',
        'Main DB migration ko reversible kadamon mein plan kar sakta hoon',
        'Main tech debt ke source aur budget ka hisaab bata sakta hoon',
        'Main one-way pal pehchaan kar sign-off le sakta hoon',
      ],
      homework: '<p>Apne codebase mein ek jagah dhoondho jahan DB queries ya external API calls business code mein bikhri hain. Ek interface design karo (3-5 methods) aur us par 5 contract tests likho. Apni team ka ek debt register banao: top 5 items, har ek ka impact aur chukane ki date.</p>',
      cards: [
        { front: 'Graceful badlaav ka tareeka?', back: '<b>Interface/adapter</b> — business code DB nahi, vaada jaane.' },
        { front: 'DB migration kadam?', back: 'Contract tests → <b>dual write</b> → backfill → <b>shadow read</b> → cutover → purana band.' },
        { front: 'Tech debt kahan se?', back: 'Jaldi ship ke shortcuts + vision badalne par jugaad.' },
        { front: 'Debt budget?', back: 'Har sprint <b>~10-15%</b> pehle se.' },
      ],
    },

    /* =================================================================
       LEVEL: Templates + business
       ================================================================= */
    {
      id: 'ms-templates-business',
      icon: '💼',
      title: 'Templates aur Business ka Saath — Zabardasti Nahi, Samjhaake',
      badge: 'Outcome Ustaad',
      source: Object.assign({ at: 999 }, SRC),
      hook: {
        when: 'KhanaKart · cost-cutting ka saal',
        title: 'Template ko sabne "gulaami" kaha — aur ML team ne 50 GPU maange',
        text: 'Platform team ne naya service template banaya aur order diya: "sab isi par, koi sawaal nahi". Template mein 6 cheezein thi, reasons kahin likhe nahi the. Teams ne "strangled" mehsoos kiya; aadhi teams ne chupchaap template ke hisse hata diye. Usi saal CFO ne cost 20% ghataane ka lakshya rakha — aur ML team ne recommendation v3 ke liye 50 GPU cluster ka proposal bheja, jiska koi business number nahi tha.',
      },
      objectives: [
        '<b>Service template</b>: boilerplate server, internal gRPC + external REST, circuit breaker, Prometheus metrics, Redis client, folder structure',
        'Template <b>zabardasti</b> ulta pad sakta hai — <b>har choice ka reason</b>, open forum, <b>collective</b> badlaav',
        '<b>Business > engineering</b>: har project company ke lakshya se juda',
        '<b>Outcome over output</b>: kitna banaya nahi, kya badla',
      ],
      steps: [
        {
          q: 'Service template mein kya hota hai?',
          body: 'Ek template repo jisse nayi service 1 ghante mein chal pade:',
          points: [
            'Boilerplate server — users ke liye REST, services ke beech gRPC',
            'Circuit breaker library pehle se (resilience4j / opossum)',
            'Prometheus metrics, JSON logs, tracing',
            'Redis cache client (pool, timeouts, metrics)',
            'Ek jaisa folder structure — koi bhi engineer kisi bhi service mein raasta dhoondh le',
          ],
          asli: 'Faayda: har team wahi chakka dobara nahi banati. Level "Good Service" ka paved road yahi hai.',
        },
        {
          q: 'Template zabardasti kyun ulta padta hai?',
          analogy: 'School uniform: "kyunki main keh raha hoon" bolo toh bachche tie jeb mein rakh lete hain. "Sports day par sab ek team dikhein aur koi bahar ka andar na aaye" samjhaao toh log pehenna chahte hain.',
          body: 'Bina reason ka order = engineers "strangled" mehsoos karte hain, chupke se hisse hatate hain (drift). Behtar:',
          points: [
            'Har choice ka <b>"kyun"</b> likha ho (ADR): "breaker isliye kyunki Diwali cascade".',
            '<b>Open forum</b>: koi bhi sawaal/objection rakh sake.',
            'Template ke badlaav <b>collective</b>: RFC + vote, sirf central team ka order nahi.',
            '<b>Reason ke saath opt-out</b> allowed: search team Elasticsearch cache use karti hai, Redis nahi.',
          ],
        },
        {
          q: 'Business engineering se upar kyun?',
          body: 'Business hai toh naukriyaan hain. Har project company ke <b>strategic goal</b> se juda ho. Cost-cutting ke saal mein 50 GPU cluster tabhi jab number ho: "recommendation v3 se order conversion 1.5% badhega = ₹12 crore/saal, GPU cost ₹3 crore".',
          example: 'Isi saal achhe projects: chat ko managed DynamoDB (on-call aur cost kam), gateway autoscaling (raat mein 60% instances kam), Instamart 10-minute promise (growth goal).',
        },
        {
          q: 'Outcome over output ka matlab?',
          points: [
            '<b>Output</b>: "humne 14 microservices banayi", "gRPC migration poora".',
            '<b>Outcome</b>: "checkout p99 40% kam, conversion 0.8% upar", "infra bill ₹40 lakh/mahina kam".',
            'Engineering proposal mein pehle outcome, phir technology.',
          ],
        },
      ],
      myth: [
        { myth: 'Achhi technology khud apna business case hai.', sach: 'Business ko technology nahi, outcome chahiye. Achhi technology jo is saal ke lakshya se nahi judi, woh agle saal ka project hai.' },
        { myth: 'Template central team ka hai, teams ka kaam follow karna.', sach: 'Template tab tak chalta hai jab tak teams usse apna maanti hain. Reasons, forum aur collective badlaav se adoption aata hai.' },
      ],
      playbook: {
        title: 'templates + business alignment',
        use: [
          'Template + ADRs (har choice ka kyun)',
          'RFC + guild vote se template badlaav',
          'Reason ke saath opt-out',
          'Har project proposal mein business outcome + number',
        ],
        avoid: [
          'Bina reason "must use" template',
          'Chupke se drift (koi report nahi)',
          'Technology-first proposals bina outcome',
          'Company ke lakshya ke ulat bade projects',
        ],
        how: [
          'Template repo + CHANGELOG + ADR folder',
          'Drift report har mahine (kaun peeche, kya missing, risk)',
          'Mahine mein ek open forum/guild meeting',
          'Proposal template: problem, outcome metric, cost, strategic goal link',
        ],
        redflags: [
          'Teams template ke hisse chupke se hata rahi',
          '"Yeh kyun hai template mein?" — kisi ko nahi pata',
          'Projects jinka koi business metric nahi',
        ],
        rule: 'Template samjhaake apnao, zabardasti nahi — aur har project ka pehla sawaal: business ko kya milega?',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — template rollout',
          goal: 'Template adoption <b>≥ 85%</b>, engineers ki khushi <b>≥ 7/10</b>, aur nayi service ka pehla endpoint <b>≤ 1 din</b> mein.',
          scenario: '40 teams. Template mein jitne zyada features, utna kam setup — par sab zabardasti ho toh bhaari lagta hai.',
          knobs: [
            { id: 'process', label: 'Rollout', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'central team ka order', 1: 'RFC + forum + collective badlaav' } },
            { id: 'reasons', label: 'Har choice ka "kyun" (ADR)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi', 1: 'haan' } },
            { id: 'optout', label: 'Reason ke saath opt-out', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'allowed nahi', 1: 'allowed' } },
            { id: 'features', label: 'Template features', min: 1, max: 6, step: 1, value: 6 },
          ],
          nodes: [N('coupon', 170, 260, { id: 'tpl', icon: '🧰', label: 'template' }), N('order', 560, 80, { label: 'teams (adopt)' }), N('review', 560, 440, { label: 'teams (drift)' }), N('user', 870, 260, { label: 'engineers', icon: '🙂' })],
          edges: [{ from: 'tpl', to: 'order' }, { from: 'tpl', to: 'review' }, { from: 'order', to: 'user' }],
          model: k => {
            const m = templateModel(k);
            const okA = m.adoption >= 85, okH = m.happy >= 7, okF = m.firstDay <= 1;
            return {
              nodes: {
                tpl: { tone: 'acc', badge: `${k.features} features` },
                order: { tone: okA ? 'ok' : 'slow', badge: `${m.adoption}% adopt` },
                review: { tone: okA ? 'idle' : 'bad', badge: `${100 - m.adoption}% chupke se drift` },
                user: { tone: okH ? 'ok' : 'bad', badge: `khushi ${m.happy}/10` },
              },
              flows: [
                { from: 'tpl', to: 'order', label: k.process ? 'RFC + forum' : 'order', tone: okA ? 'ok' : 'slow', rate: m.adoption / 100 },
                { from: 'tpl', to: 'review', tone: 'bad', rate: (100 - m.adoption) / 100 },
              ],
              readouts: [
                { label: 'Adoption', value: m.adoption + '%', tone: okA ? 'ok' : 'bad' },
                { label: 'Engineers ki khushi', value: m.happy + '/10', tone: okH ? 'ok' : 'bad' },
                { label: 'Pehla endpoint', value: m.firstDay + ' din', tone: okF ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Adoption', pct: m.adoption, text: m.adoption + '%', tone: okA ? 'ok' : 'bad' }],
              verdict: okA && okH && okF
                ? { ok: true, text: `Collective + reasons + opt-out: ${m.adoption}% adoption, khushi ${m.happy}/10, pehla endpoint ${m.firstDay} din.` }
                : !okF
                  ? { ok: false, text: `Sirf ${k.features} features — teams ko ${m.firstDay} din setup. Template mein kaam ki cheezein jodo.` }
                  : !k.process
                    ? { ok: false, text: `Order se rollout: ${m.adoption}% adoption, khushi ${m.happy}/10 — teams "strangled", chupke se drift.` }
                    : { ok: false, text: `${m.adoption}% adoption, khushi ${m.happy}/10 — ${k.reasons ? '' : 'har choice ka "kyun" likho; '}${k.optout ? '' : 'reason ke saath opt-out do'}.` },
            };
          },
          check: k => { const m = templateModel(k); return m.adoption >= 85 && m.happy >= 7 && m.firstDay <= 1; },
          lesson: '✅ <b>Template apna laga.</b> Reasons ne samjhaaya, forum ne awaaz di, opt-out ne zabardasti hatayi — aur poore features ne pehle din se kaam chalu karaaya.',
          quiz: {
            q: 'Search team Redis client opt-out karna chahti hai. Sahi jawab?',
            choices: [
              'Manifest mein reason likh ke opt-out (jaise Elasticsearch cache) — drift report mein dikhega, chhupa nahi',
              'Mana karo, template sab ke liye',
              'Chupke se hata do',
              'Template hi band kar do',
            ],
            answer: 0,
            explain: 'Opt-out galat nahi, bina reason ka opt-out galat hai.',
          },
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — cost-cutting saal ka Q3 roadmap',
          instructions: 'Company goal: infra cost 20% kam, Instamart growth jaari. Har slot ke liye project chuno.',
          brief: 'KhanaKart engineering, 4 slots, 40 engineers. CFO: "Har project ka number chahiye."',
          requirements: ['Infra cost 20% kam', 'Instamart ka 10-minute promise', 'Reliability na gire'],
          slots: [
            {
              id: 'ml', label: 'ML team proposal', icon: '🤖',
              options: [
                { id: 'pilot', label: 'Recommendation v3 ka 2-GPU pilot, A/B test se conversion naapo', score: 3, why: 'Chhota kharcha, outcome ka saboot — phir bada investment.' },
                { id: 'gpu50', label: '50 GPU cluster abhi', score: -3, why: 'Cost-cutting saal mein bina number ke bada kharcha.' },
                { id: 'none', label: 'ML ka koi kaam nahi', score: 0, why: 'Cost bachi, par growth ke ek mauke ko data ke bina band kiya.' },
              ],
            },
            {
              id: 'infra', label: 'Infra', icon: '☁️',
              options: [
                { id: 'autoscale', label: 'Gateway + services autoscaling (raat mein 60% kam instances)', score: 3, why: 'Seedha cost goal, reliability same.' },
                { id: 'rust', label: 'Services Rust mein rewrite "performance ke liye"', score: -2, why: 'Mahino ka kaam, outcome unclear, hiring mushkil.' },
              ],
            },
            {
              id: 'data', label: 'Data layer', icon: '🗄️',
              options: [
                { id: 'managed', label: 'Self-hosted Cassandra chat → managed DynamoDB', score: 3, why: 'On-call aur ops cost kam, SRE time bacha.' },
                { id: 'newdb', label: 'Ek aur naya DB try karo (graph)', score: -2, why: 'Naya ops bojh, koi current goal nahi.' },
              ],
            },
            {
              id: 'growth', label: 'Growth', icon: '🛒',
              options: [
                { id: 'instamart', label: 'Instamart saga + dark store stock sync (10-minute promise)', score: 3, why: 'Strategic growth goal se seedha juda.' },
                { id: 'redesign', label: 'Poore app ka naya design system', score: 0, why: 'Achha ho sakta hai, par is quarter ke goals se door.' },
              ],
            },
            {
              id: 'debt', label: 'Har team ka debt budget', icon: '🧹',
              options: [
                { id: 'ten', label: '10-15% har sprint', score: 3, why: 'Raftaar saal bhar bani rahe.' },
                { id: 'zero', label: '0% — sab features par', score: -2, why: 'Q3 tez, Q4 se raftaar giregi.' },
              ],
            },
          ],
          pass: 12,
          verdicts: {
            great: '🌟 Har project company ke lakshya se juda aur numbers ke saath.',
            ok: '👍 Theek — laal slots ka "kyun" padho.',
            bad: '😅 Achhi technology, par is saal ke business se door.',
          },
        },
        {
          type: 'bins',
          title: 'Output ya outcome?',
          instructions: 'Har line ko sahi dabbe mein daalo.',
          bins: [{ id: 'output', label: '📦 Output (kya banaya)' }, { id: 'outcome', label: '🎯 Outcome (kya badla)' }],
          items: [
            { text: '14 microservices launch ki', bin: 'output', explain: 'Ginti, asar nahi.' },
            { text: 'Checkout p99 40% kam, conversion 0.8% upar', bin: 'outcome', explain: 'User + business par asar.' },
            { text: 'gRPC migration 100% poora', bin: 'output', explain: 'Kaam hua — asar kya?' },
            { text: 'Infra bill ₹40 lakh/mahina kam', bin: 'outcome', explain: 'Seedha goal.' },
            { text: 'Naya template v2 release', bin: 'output', explain: 'Asar: nayi service setup 3 din → 1 ghanta ho toh outcome.' },
            { text: 'Incident MTTR 70 min → 12 min', bin: 'outcome', explain: 'Reliability outcome.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Templates + business — quick check',
          questions: [
            {
              q: 'Template adoption badhane ka sabse kaargar tareeka?',
              choices: ['Har choice ka reason, open forum, collective badlaav aur reason ke saath opt-out', 'Kadak order', 'Bonus', 'Template chhupa ke'],
              answer: 0,
              explain: 'Samjhaao, zabardasti nahi.',
            },
            {
              q: 'ML team ka 50 GPU proposal cost-cutting saal mein. Sabse achha jawab?',
              choices: ['Chhota pilot + A/B test se outcome number, phir scale ka faisla', 'Turant haan', 'Turant na, kabhi nahi', 'CFO se chhupa ke'],
              answer: 0,
              explain: 'Business number pehle.',
            },
            {
              q: 'Engineering proposal ki pehli line kya ho?',
              choices: ['Business outcome aur metric (jaise conversion +1%)', 'Technology ka naam', 'Kitni services banengi', 'Team size'],
              answer: 0,
              explain: 'Outcome over output.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — template drift, ADRs aur RFC',
          project: '09-team-practices',
          exercise: 'ex3-template-drift',
          goal: 'Drift report padho, har template choice ka ADR dekho, aur template badlaav ka RFC likho.',
          steps: [
            { text: 'Drift report.', cmd: 'npm start ex3-template-drift\nnpm run drift', expect: 'review    1.0.0  ❌ missing: grpc-internal, circuit-breaker, prometheus-metrics\ndelivery  1.2.0  ❌ missing: circuit-breaker ↳ cascade risk (ADR-0002)\nsearch    1.4.0  ✅ ↳ opt-out redis-client: "Elasticsearch ka request cache..."' },
            { text: 'Reasons aur history.', cmd: 'ls docs/adr\ncat docs/adr/0002-circuit-breaker-in-template.md\ncat templates/CHANGELOG.md', expect: 'ADR-0002: Diwali 2023 tax-service cascade → breaker default\nCHANGELOG: har version ek RFC se' },
            { text: 'RFC likho.', cmd: 'npm run rfc "Template mein OpenTelemetry tracing default"', expect: '✅ docs/rfc/0012-template-mein-opentelemetry-tracing-default.md bana' },
          ],
          observe: {
            q: 'Notification service "missing: redis-client" dikhati hai, search nahi. Farak?',
            choices: [
              'Search ne manifest mein opt-out ka reason likha (RFC-0007); notification ne bina reason chhoda — drift report mein wahi dikhta hai',
              'Search Redis use karti hai',
              'Notification purani hai',
              'Bug',
            ],
            answer: 0,
            explain: 'tools/drift.js optOut entries ko missing mein nahi ginta, reason print karta hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Platform aur business',
        instructions: 'Staff/principal style sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Golden path/template ko teams par kaise apnaoge?"',
            choices: [
              'Template ko product ki tarah: user research (teams), reasons/ADRs, docs, migration help, RFC-based changes, opt-out with reason, drift/adoption metrics; mandate sirf safety-critical cheezon par',
              'Mandate sab par',
              'Optional aur chhod do',
              'Sirf naye hires ke liye',
            ],
            answer: 0,
            explain: 'Platform as a product.',
          },
          {
            q: 'Interviewer: "Tech initiative ko leadership se kaise approve karwaoge?"',
            choices: [
              'Business outcome (revenue/cost/risk) numbers ke saath, pilot se saboot, strategic goal se link, cost aur alternatives, milestones',
              'Technology ki khoobiyan',
              'Competitor bhi kar raha hai',
              'Engineers khush honge',
            ],
            answer: 0,
            explain: 'Business ki bhasha.',
          },
          {
            q: 'Interviewer: "Output vs outcome ka example?"',
            choices: [
              'Output: "caching layer banayi"; outcome: "menu p99 800 → 120 ms, orders +2%"',
              'Dono same',
              'Output zyada important',
              'Outcome sirf sales ka',
            ],
            answer: 0,
            explain: 'Impact bolo.',
          },
        ],
      },
      success: [
        'Main service template ke hisse aur unka faayda bata sakta hoon',
        'Main template ko zabardasti ki jagah samjhaake apnaane ka plan bana sakta hoon',
        'Main engineering projects ko business goals se jod sakta hoon',
        'Main output aur outcome mein farak kar sakta hoon',
      ],
      homework: '<p>Apni team ke agle quarter ke 3 projects lo. Har ek ke liye likho: company ka kaunsa goal, outcome metric aur number, cost, aur "agar na karein toh kya hoga". Ek project jo kisi goal se nahi judta — use kaise badloge?</p>',
      cards: [
        { front: 'Service template mein kya?', back: 'Boilerplate (REST + gRPC), <b>circuit breaker</b>, <b>metrics</b>, cache client, folder structure.' },
        { front: 'Template zabardasti ka nuksaan?', back: 'Engineers strangled → <b>chupke se drift</b>. Reasons + forum + collective badlaav.' },
        { front: 'Business > engineering?', back: 'Har project <b>company goal</b> se juda, numbers ke saath.' },
        { front: 'Outcome vs output?', back: 'Output = kya banaya. <b>Outcome = kya badla</b> (p99, conversion, cost).' },
      ],
    },
  ]);
})();
