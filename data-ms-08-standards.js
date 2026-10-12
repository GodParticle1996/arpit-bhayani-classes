/* =====================================================================
   Video 8 — Microservices ko standardize kyun aur kaise karein
   Source concept: Arpit Bhayani — "Why standardise how microservices are built" (youtube 0q61wIUmVDY)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: '0q61wIUmVDY', title: 'Why standardise how microservices are built' };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

  /* ---------------- models ---------------- */
  function stackModel(k) {
    const langs = k.whitelist ? k.langs : 11;
    const debug = Math.min(100, 100 - (langs - 1) * 9 + (k.template ? 8 : 0));
    const onboard = 1 + (langs - 1) * 0.5 + (k.template ? 0 : 2);
    const rightTool = langs >= 2;
    return { langs, debug, onboard, rightTool };
  }
  function mttrModel(k) {
    const detect = k.alerts ? 2 : 25;
    const find = k.tracing ? 3 : k.metrics ? 10 : 45;
    const cause = k.logs ? 5 : 40;
    const total = detect + find + cause;
    const loss = total * 640000 * 0.12;
    return { detect, find, cause, total, loss };
  }
  function pageModel(k) {
    const cursor = k.style === 1;
    const rows = cursor ? 20 : k.depth * 20 + 20;
    const ms = Math.round(3 + rows * 0.02);
    const dups = cursor ? 0 : Math.round(k.fresh / 6 * 10);
    return { cursor, rows, ms, dups };
  }
  function tolModel(k) {
    if (!k.killOut) return { checkoutOk: 3, p50: 3000, recRps: 0, load: 0, hang: true };
    const rec = k.block ? 0 : k.ration ? 50 : 2000;
    const load = rec + 60;
    const cap = 200;
    const checkoutOk = load <= cap ? 99.9 : Math.max(5, Math.round(100 * cap / load));
    const p50 = load <= cap ? 65 : Math.round(65 * load / cap);
    const recRps = k.block ? 0 : k.ration ? 50 : Math.round(cap * rec / load);
    return { checkoutOk, p50, recRps, load, hang: false };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-good-service'] = {
    t: 'Good service ke teen gun',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-good"><span class="ni">🧰</span><span class="nl">Manageable</span><span class="ns">aaj aur kal ke engineers chala sakein</span></div>
      <div class="dg-node is-good"><span class="ni">🔭</span><span class="nl">Observable</span><span class="ns">ek jaisa tareeka dekhne ka</span></div>
      <div class="dg-node is-good"><span class="ni">🐞</span><span class="nl">Debuggable</span><span class="ns">sirf 2 log nahi, sab debug kar sakein</span></div>
    </div>
    <div class="dg-cap">Team ki azaadi = 3-5 approved options mein se chunna. "Kuch bhi" nahi.</div>`,
  };
  VISUALS['ms-monitoring-standard'] = {
    t: 'Har service ko muft milne wali monitoring',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-accent"><span class="bx-label">🖥️ Server: CPU, memory, disk, network</span></div>
      <div class="dg-box is-accent"><span class="bx-label">🩺 Service: health check, requests by 2xx/4xx/5xx, p50/p99, servers</span></div>
      <div class="dg-box is-accent"><span class="bx-label">📜 Logs: app logs (JSON + traceId), critical process, auth/SSH/OS</span></div>
      <div class="dg-box is-accent"><span class="bx-label">🧵 Ek tracing tool: request ka poora safar</span></div>
    </div>
    <div class="dg-cap">Sab ek metrics system mein (Prometheus/Datadog) — ek query language, ek dashboard.</div>`,
  };
  VISUALS['ms-interface-standard'] = {
    t: 'Interface standard — har team ki API ek jaisi',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-pill bad">❌ Har team apna</div>
        <div class="dg-box is-bad"><span class="bx-label">/getOrdersForUser?page=2&size=20</span></div>
        <div class="dg-box is-bad"><span class="bx-label">/v2/orderDetails/:id</span></div>
        <div class="dg-box is-bad"><span class="bx-label">/api/order-status/:id/v1 (text)</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-pill good">✅ KhanaKart standard</div>
        <div class="dg-box is-good"><span class="bx-label">/v1/users/:userId/orders?limit=20&cursor=…</span></div>
        <div class="dg-box is-good"><span class="bx-label">/v1/orders/:orderId</span></div>
        <div class="dg-box is-good"><span class="bx-label">JSON · timeout range · backoff retries</span></div>
      </div>
    </div>`,
  };
  VISUALS['ms-tolerance'] = {
    t: 'Tolerance — chaar hathiyaar',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-gold"><span class="bx-label">🍚 Ration: har caller ki seema (recommendation max 50 req/s)</span></div>
      <div class="dg-box is-gold"><span class="bx-label">🤝 Good citizen: neeche wali service par bomb mat giraao</span></div>
      <div class="dg-box is-gold"><span class="bx-label">🚫 Incoming kill switch: ek caller ki calls config se band</span></div>
      <div class="dg-box is-gold"><span class="bx-label">✂️ Outgoing kill switch: mari dependency ko call band, default jawab</span></div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Good service
       ================================================================= */
    {
      id: 'ms-good-service',
      icon: '🧰',
      title: 'Good Service kya hai? — Azaadi aur Standard ka Balance',
      badge: 'Standard Setu',
      source: Object.assign({ at: 158 }, SRC),
      hook: {
        when: 'KhanaKart · raat 3 baje',
        title: 'Rewards service Scala mein thi — aur Scala jaanne wala 2 saal pehle chala gaya',
        text: 'KhanaKart mein 40 teams ko "apni pasand ki technology" ki azaadi thi. Aaj 11 languages hain: Go, Python, Node, Java, Kotlin, Scala, Elixir, Rust, Ruby, PHP, C#. Raat 3 baje rewards-service (Scala) ki memory bhar gayi. On-call engineer Go jaanta tha. Logs free text mein the, /metrics nahi tha, JVM flags kisi ko nahi pata. Service 2 ghante down rahi. Jisne service banayi thi, woh company chhod chuka tha.',
      },
      objectives: [
        'Poori azaadi kyun chaos banti hai — hiring, debugging, on-call',
        '<b>Good service</b> ki paribhasha: <b>manageable</b>, <b>observable</b>, <b>debuggable</b>',
        'Autonomy ≠ "kuch bhi": <b>3-5 approved options</b> + nayi technology ke liye mazboot wajah',
        'Faayde: team badalna aasaan, poora system ek jaisa samajh aata hai',
      ],
      steps: [
        {
          q: 'Poori azaadi mein kya galat hai?',
          points: [
            '<b>Hiring</b>: Elixir aur Scala ke engineers kam — ek chala gaya toh replacement mahino mein.',
            '<b>Debugging</b>: on-call engineer har language ka debugger, profiler aur memory model nahi jaanta.',
            '<b>Incidents</b>: har service alag format mein log kare → central logging parse nahi kar pati → firefighting dheema.',
            '<b>Maintenance</b>: jisne banaya woh gaya, service "anath".',
          ],
          asli: 'Technology chunne mein non-technical baatein bhi utni hi important hain: hiring pool, long-term support, kaun chalayega.',
        },
        {
          q: 'Good service ki paribhasha kya hai?',
          body: 'Har company apni paribhasha likhe. KhanaKart ki:',
          points: [
            '<b>Manageable</b>: aaj ke aur aane wale engineers chala sakein. SRE ko pata ho scale kaise karna hai aur incident mein kya karna hai (runbook).',
            '<b>Observable</b>: ek standard tareeka jisse dikhe service mein kya ho raha hai (health, metrics, logs).',
            '<b>Debuggable</b>: sirf 2 log nahi, koi bhi on-call engineer debug kar sake. Chhupi aadatein (jaise lambi HTTP/2 connections) likhi hon.',
          ],
        },
        {
          q: 'Toh teams ki azaadi kahan hai?',
          analogy: 'Canteen menu: roz 4-5 dishes mein se chuno. Har koi apni kitchen nahi lagata — par roz ek hi dal bhi nahi.',
          body: 'Teams <b>approved list</b> se chunti hain: jaise backend ke liye Go, Python, Node; DB ke liye Postgres, DynamoDB; messaging ke liye Kafka. Nayi technology chahiye? Ek chhota RFC: kyun, kaun chalayega, hiring, support, exit plan.',
          example: 'Image resizing ke liye Rust ka RFC approve — CPU cost 70% kam, 3 engineers Rust jaante hain, library stable. "Rust seekhna hai" wala RFC reject.',
        },
        {
          q: 'Service template kya karta hai?',
          body: 'Ek <b>starter template + shared library</b> (jaise khanakart-kit): nayi service banate hi JSON logs, trace id, /health, /metrics, standard HTTP client, config — sab pehle se. Team sirf business logic likhe.',
          asli: 'Standard tab chalte hain jab sahi raasta sabse aasaan raasta ho. Template wahi karta hai.',
        },
        {
          q: 'Standard ka faayda kise?',
          points: [
            'Engineer <b>team badle</b> toh logs, metrics, debugging wahi — pehle hafte se kaam.',
            'On-call ko <b>har service ek jaisi</b> dikhe.',
            'Poora system <b>coherent</b> — naye log bhi samajh sakein.',
          ],
        },
      ],
      myth: [
        { myth: 'Standards innovation maar dete hain.', sach: 'Standards "kaise chalaayein" ko ek jaisa karte hain, "kya banayein" ko nahi. Aur RFC raasta khula rakhta hai jab wajah mazboot ho.' },
        { myth: 'Microservices ka matlab hi hai har team apni technology chune.', sach: 'Independent deploy aur ownership core hai. Polyglot ki kimat on-call aur hiring mein aati hai — isliye seemit list.' },
      ],
      playbook: {
        title: 'good service standard',
        use: [
          'Teams 10+ hon aur on-call rotation shared ho',
          'Engineers teams ke beech move karte hon',
          'Incidents mein "yeh service kaise debug karein" ka jawab kisi ko na pata ho',
        ],
        avoid: [
          '"Kuch bhi chalega" technology policy',
          'Standard jo sirf document mein ho, template/library mein nahi',
          'Bina exception process ke kadak ban',
        ],
        how: [
          'Good service ki paribhasha likho (manageable, observable, debuggable + checklist)',
          'Approved list: languages, DBs, messaging (3-5 har category)',
          'Service template + shared kit (logs, metrics, health, client)',
          'Scorecard: har service ka checklist score dashboard par',
          'RFC process nayi technology ke liye: kyun, kaun chalayega, hiring, exit',
        ],
        redflags: [
          'Service jiska koi owner ya runbook nahi',
          '"Sirf X hi yeh service samajhta hai"',
          'Central logging mein kuch services ke logs parse nahi hote',
        ],
        rule: 'Azaadi approved options ke andar — aur sahi raasta sabse aasaan raasta banao.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — KhanaKart ki tech policy',
          goal: 'On-call engineers mein se <b>≥ 80%</b> kisi bhi service ko debug kar sakein, team badalne par onboarding <b>≤ 2 hafte</b>, aur <b>≥ 2</b> languages (sahi kaam ke liye sahi tool).',
          scenario: 'Aaj "kuch bhi chalega" policy se 11 languages hain aur har service apna logging/metrics tareeka rakhti hai.',
          knobs: [
            { id: 'whitelist', label: 'Technology policy', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'kuch bhi chalega', 1: 'approved list + RFC' } },
            { id: 'langs', label: 'Approved languages', min: 1, max: 8, step: 1, value: 5 },
            { id: 'template', label: 'Service template + shared kit', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi', 1: 'haan' } },
          ],
          nodes: [N('user', 190, 260, { label: 'on-call engineer', icon: '🧑‍🚒' }), N('order', 560, 70, { label: 'Go services' }), N('search', 820, 190, { label: 'Python services' }), N('payment', 820, 340, { label: 'Node services' }), N('review', 560, 450, { label: 'baaki languages' })],
          edges: [{ from: 'user', to: 'order' }, { from: 'user', to: 'search' }, { from: 'user', to: 'payment' }, { from: 'user', to: 'review' }],
          model: k => {
            const m = stackModel(k);
            const okD = m.debug >= 80, okO = m.onboard <= 2, okT = m.rightTool;
            const others = Math.max(0, m.langs - 3);
            return {
              nodes: {
                user: { tone: okD ? 'ok' : 'bad', badge: `${m.debug}% debug kar sakte` },
                review: { tone: others ? (others > 2 ? 'bad' : 'slow') : 'idle', badge: others ? `${others} aur languages` : 'koi nahi' },
                search: { tone: m.langs >= 2 ? 'ok' : 'idle', badge: m.langs >= 2 ? 'approved' : 'band' },
                payment: { tone: m.langs >= 3 ? 'ok' : 'idle', badge: m.langs >= 3 ? 'approved' : 'band' },
                order: { tone: 'ok', badge: 'approved' },
              },
              flows: [
                { from: 'user', to: 'order', tone: 'ok', rate: 0.4 },
                m.langs >= 2 ? { from: 'user', to: 'search', tone: 'ok', rate: 0.4 } : null,
                m.langs >= 3 ? { from: 'user', to: 'payment', tone: 'ok', rate: 0.4 } : null,
                others ? { from: 'user', to: 'review', label: '??', tone: others > 2 ? 'bad' : 'slow', rate: 0.4 } : null,
              ].filter(Boolean),
              readouts: [
                { label: 'Languages asal mein', value: String(m.langs), tone: m.langs <= 4 ? 'ok' : 'bad' },
                { label: 'On-call debug kar sake', value: m.debug + '%', tone: okD ? 'ok' : 'bad' },
                { label: 'Team badalne par onboarding', value: m.onboard + ' hafte', tone: okO ? 'ok' : 'bad' },
                { label: 'Sahi kaam, sahi tool', value: okT ? 'haan' : 'nahi (sirf 1 language)', tone: okT ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Debug coverage', pct: m.debug, text: m.debug + '%', tone: okD ? 'ok' : 'bad' }],
              verdict: !k.whitelist
                ? { ok: false, text: `"Kuch bhi chalega" = asal mein ${m.langs} languages. Slider approved list par koi asar nahi jab tak policy na ho.` }
                : !okT
                  ? { ok: false, text: 'Sirf 1 language — ML ke liye Python ya high-throughput ke liye Go jaisa sahi tool nahi le sakte.' }
                  : !okD
                    ? { ok: false, text: `${m.langs} languages mein on-call sirf ${m.debug}% services debug kar pata hai. List chhoti karo ya template lao.` }
                    : !okO
                      ? { ok: false, text: `Onboarding ${m.onboard} hafte — har team ka apna logging/metrics tareeka. Shared template lao.` }
                      : { ok: true, text: `${m.langs} approved languages + template: ${m.debug}% debug, ${m.onboard} hafte onboarding.` },
            };
          },
          check: k => { const m = stackModel(k); return k.whitelist === 1 && m.debug >= 80 && m.onboard <= 2 && m.rightTool; },
          lesson: '✅ <b>Azaadi seema ke andar.</b> Chhoti approved list + template ne on-call aur onboarding dono sudhaare, aur 2-3 languages se sahi tool chunne ki gunjaaish bhi rahi.',
          quiz: {
            q: 'Ek team Elixir chahti hai kyunki "chat ke liye best hai". RFC mein sabse zaroori sawaal?',
            choices: [
              'On-call kaun karega, kitne engineers jaante hain, hiring pool, aur agar team chali gayi toh exit plan kya',
              'Elixir kitni tez hai',
              'GitHub stars',
              'Koi sawaal nahi, allow karo',
            ],
            answer: 0,
            explain: 'Technology ka asli kharcha chalane mein hai.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — raat 3 baje, rewards-service',
          goal: 'Standard ke bina incident kaise chalta hai, aur KhanaKart ne kya badla.',
          nodes: [N('user', 150, 260, { label: 'on-call (Go)', icon: '🧑‍🚒' }), N('coupon', 520, 110, { id: 'rewards', icon: '🏅', label: 'rewards (Scala)' }), N('db', 850, 110, { id: 'logs', label: 'central logs' }), N('analytics', 850, 400, { label: 'dashboards' })],
          edges: [{ from: 'user', to: 'rewards' }, { from: 'rewards', to: 'logs' }, { from: 'user', to: 'analytics' }],
          panels: [{ id: 'clock', title: 'Ghadi' }, { id: 'note', title: 'On-call ki diary' }],
          steps: [
            {
              clock: '3:04 AM',
              say: 'Alert: "orders mein loyalty points nahi jud rahe". On-call Anjali Go developer hai. Service list mein rewards — language Scala, owner: "(khaali)".',
              flows: [{ from: 'user', to: 'rewards', label: 'kya hua?', tone: 'acc' }],
              nodes: { rewards: { tone: 'bad', badge: 'memory 98%' } },
              panels: { clock: ['3:04'], note: ['Scala? owner kaun?'] },
            },
            {
              clock: '3:20 AM',
              say: 'Anjali central logs kholti hai. Rewards ke logs free text mein: "got req for u1 ok". Koi traceId nahi, level nahi. Search mein kuch nahi milta.',
              flows: [{ from: 'rewards', to: 'logs', label: 'free text', tone: 'bad' }],
              nodes: { logs: { tone: 'bad', badge: 'parse nahi hua' } },
              panels: { clock: ['3:20'], note: ['Logs bekaar', 'Kaunsa user fail?'] },
              ask: {
                q: 'Standard JSON logs + traceId hote toh?',
                choices: ['Fail hue order ka traceId se seedha rewards ki error line mil jaati', 'Kuch farak nahi', 'Memory kam hoti', 'Alert nahi aata'],
                answer: 0,
                explain: 'Debuggable = koi bhi on-call ek tareeke se dhoondh sake.',
              },
            },
            {
              clock: '3:45 AM',
              say: 'Dashboard par rewards ka koi panel nahi — /metrics hi nahi. Anjali JVM heap flags Google karti hai. Restart karti hai; 20 minute baad phir memory full.',
              flows: [{ from: 'user', to: 'analytics', label: 'rewards panel?', tone: 'bad' }],
              nodes: { analytics: { tone: 'bad', badge: 'rewards: no data' }, rewards: { tone: 'bad', badge: 'restart → phir 98%' } },
              panels: { clock: ['3:45'], note: ['Restart fail', 'JVM flags??'] },
            },
            {
              clock: '5:10 AM',
              say: 'Ek purane Scala engineer ko phone karke jagaaya. Unhe yaad tha: rewards har request par ek naya HTTP/2 client banati hai jo band nahi hota. Fix mein 10 minute. Kul downtime: <b>2 ghante 6 minute</b>.',
              flows: [],
              nodes: { rewards: { tone: 'ok', badge: 'fixed' } },
              panels: { clock: ['5:10'], note: ['Chhupi aadat: HTTP/2 client leak', 'Sirf 1 insaan jaanta tha'] },
              ask: {
                q: '"Sirf ek insaan jaanta tha" — good service ke kis gun ki kami?',
                choices: ['Debuggable aur manageable — chhupi aadat runbook mein nahi, aur service approved stack mein nahi', 'Observable', 'Scalable', 'Secure'],
                answer: 0,
                explain: 'Teeno gun saath chalte hain.',
              },
            },
            {
              clock: 'Agle mahine',
              say: 'Faisla: approved languages Go, Python, Node. Rewards Node mein dobara likhi gayi template se — JSON logs, /metrics, runbook pehle din se. Scorecard 7/7. Agla incident 12 minute mein band.',
              flows: [{ from: 'rewards', to: 'logs', label: 'JSON + traceId', tone: 'ok' }, { from: 'user', to: 'analytics', label: 'rewards panel ✅', tone: 'ok' }],
              nodes: { rewards: { tone: 'ok', badge: 'Node · kit · 7/7' }, logs: { tone: 'ok', badge: 'searchable' }, analytics: { tone: 'ok', badge: 'rewards: p99, 5xx' } },
              panels: { note: ['Approved: Go, Python, Node', 'Template + scorecard'] },
            },
          ],
          lesson: '<b>Asli baat:</b> incident mein standard ki kami sabse zyada chubhti hai. Good service = koi bhi on-call, ek jaise tools, pehle din se.',
        },
        {
          type: 'bins',
          title: 'Standard karo ya team par chhodo?',
          instructions: 'Har cheez ko sahi dabbe mein daalo.',
          bins: [{ id: 'std', label: '📏 Org-wide standard' }, { id: 'team', label: '🎨 Team ki marzi' }],
          items: [
            { text: 'Log format (JSON, traceId, level)', bin: 'std', explain: 'Central logging ko ek format chahiye.' },
            { text: 'Service ke andar folder structure', bin: 'team', explain: 'Bahar kisi ko farak nahi padta.' },
            { text: 'Backend language (approved list mein se)', bin: 'std', explain: 'On-call aur hiring.' },
            { text: 'Metrics naam aur /metrics endpoint', bin: 'std', explain: 'Dashboards aur alerts ek jaise.' },
            { text: 'Kaunsa sorting algorithm', bin: 'team', explain: 'Implementation detail.' },
            { text: 'API versioning style', bin: 'std', explain: 'Clients ke liye ek niyam.' },
            { text: 'Unit test likhne ka style', bin: 'team', explain: 'Team ki suvidha (coverage gate standard ho sakta hai).' },
          ],
        },
        {
          type: 'quiz',
          title: 'Good service — quick check',
          questions: [
            {
              q: 'Good service ke teen gun?',
              choices: ['Manageable, observable, debuggable', 'Fast, cheap, new', 'Secure, stateless, small', 'Async, cached, sharded'],
              answer: 0,
              explain: 'Aaj aur kal ke engineers chala sakein, dekh sakein, theek kar sakein.',
            },
            {
              q: 'Standard sach mein kab follow hota hai?',
              choices: ['Jab template/library mein pehle se ho — sahi raasta sabse aasaan', 'Jab wiki par likha ho', 'Jab manager bole', 'Jab audit ho'],
              answer: 0,
              explain: 'Paved road.',
            },
            {
              q: 'Nayi technology ke RFC mein sabse bada sawaal?',
              choices: ['Kaun chalayega aur kaise hire/support karenge', 'Benchmark', 'Logo', 'Conference talk'],
              answer: 0,
              explain: 'Operating cost.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — scorecard aur service template',
          project: '08-standards',
          exercise: 'ex1-template',
          goal: 'Purani haath-bani service ka scorecard dekho, phir template se nayi service banao aur score compare karo.',
          steps: [
            { text: 'Install karo, legacy service chalao aur scorecard.', cmd: 'cd arpitbhayaniclasses/docker-labs/08-standards\nnpm install\nnpm start ex1-template\ncurl localhost:5031/rewards/u1\nnpm run scorecard rewards-legacy 5031', expect: 'MANAGEABLE ❌ Runbook ❌ Standard kit\nOBSERVABLE ❌ /health ❌ /metrics\nDEBUGGABLE ❌ x-trace-id ❌ JSON logs ❌ traceId\nScore: 0/7' },
            { text: 'Doosre terminal: template se nayi service.', cmd: 'npm run new-service reviews 5032\nnode services/reviews.js', expect: '✅ services/reviews.js aur services/reviews.runbook.md bane.' },
            { text: 'Teesre terminal: scorecard.', cmd: 'npm run scorecard reviews 5032', expect: 'Score: 7/7 🌟 good service' },
          ],
          observe: {
            q: 'services/reviews.js mein sirf ~10 lines hain. Phir 7/7 kaise?',
            choices: [
              'require("../kit") se createService() ne logs, traceId, /health, /metrics sab pehle se jod diye; runbook template ne banaya',
              'Scorecard galat hai',
              'Reviews service mein chhupa code hai',
              'Legacy service ki files copy hui',
            ],
            answer: 0,
            explain: 'kit/index.js — ek library, har service ko standard muft.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Engineering standards',
        instructions: 'Platform/staff engineer style sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "100 microservices, 30 teams. Consistency kaise laoge bina autonomy maare?"',
            choices: [
              'Good service definition + scorecard, approved tech list with RFC exceptions, paved-road templates/shared libraries (logging, metrics, tracing, clients), platform team support; teams business logic mein azaad',
              'Sab ek hi team likhe',
              'Har team jo chahe kare',
              'Code review sirf architect kare',
            ],
            answer: 0,
            explain: 'Paved road + guardrails.',
          },
          {
            q: 'Interviewer: "Polyglot microservices ka hidden cost?"',
            choices: [
              'On-call/debugging skills, hiring pool, har language ke liye libraries (auth, tracing, clients) dobara, security patching, knowledge silos',
              'Koi cost nahi',
              'Sirf compile time',
              'Cloud bill',
            ],
            answer: 0,
            explain: 'Har language ek chhota platform hai.',
          },
          {
            q: 'Interviewer: "Standard follow hua ya nahi, kaise pata?"',
            choices: [
              'Automated scorecard/linting CI mein aur dashboard par (health, metrics, log format, runbook, owner), exceptions tracked',
              'Survey',
              'Kabhi-kabhi audit',
              'Bharosa',
            ],
            answer: 0,
            explain: 'Jo naapa nahi, woh hua nahi.',
          },
        ],
      },
      success: [
        'Main poori tech azaadi ke nuksaan bata sakta hoon',
        'Main good service ke teen gun KhanaKart example se samjha sakta hoon',
        'Main approved list + RFC + template ka plan bana sakta hoon',
        'Main scorecard se standard naap sakta hoon',
      ],
      homework: '<p>Apni company ke liye "good service" checklist likho (7-10 points: owner, runbook, health, metrics, JSON logs, traceId, timeouts, alerts...). Apni 3 services ko is checklist par score karo. Sabse kam score wali service ka pehla sudhaar kya hoga?</p>',
      cards: [
        { front: 'Good service ke 3 gun?', back: '<b>Manageable</b>, <b>observable</b>, <b>debuggable</b>.' },
        { front: 'Autonomy ka sahi matlab?', back: '<b>3-5 approved options</b> mein se chunna; nayi technology RFC se.' },
        { front: 'Standard follow kaise ho?', back: '<b>Template + shared library</b> — sahi raasta sabse aasaan.' },
        { front: 'Polyglot ka chhupa kharcha?', back: 'On-call skills, hiring, har language mein libraries, knowledge silos.' },
      ],
    },

    /* =================================================================
       LEVEL: Monitoring standard
       ================================================================= */
    {
      id: 'ms-monitoring-standard',
      icon: '🔭',
      title: 'Monitoring ka Standard — Har Service ko Muft Dikhne Wali Aankhein',
      badge: 'Trace Tantrik',
      source: Object.assign({ at: 582 }, SRC),
      hook: {
        when: 'KhanaKart · Diwali · 8:52 PM',
        title: '"DIWALI" coupon par checkout fail — aur 40 minute tak kisi ko pata nahi chala kahan',
        text: 'Diwali sale shuru hui. DIWALI coupon lagate hi 20% checkouts fail hone lage. Pehli khabar customer support se aayi — 25 minute baad. Checkout team ne apne logs dekhe: "downstream error". Coupon team ke logs alag format mein the, pricing team ke free text mein. Teen teams teen tools mein dhoondh rahi thi. Asli wajah — coupon config mein ek missing field — 70 minute baad mili. ₹3.2 crore ke orders gaye.',
      },
      objectives: [
        '<b>End-to-end view</b>: ek distributed tracing tool (Zipkin, Jaeger, AWS X-Ray) — sab ek jagah dekhein',
        'Har server ke metrics: <b>CPU, memory, disk, network</b>',
        'Har service: <b>health check</b>, requests by <b>2xx/3xx/4xx/5xx</b>, <b>p50/p99</b>, servers count',
        'Logs: app logs (JSON + traceId), critical process logs, auth/SSH/OS logs; <b>ek metrics system</b> (Prometheus, Datadog)',
      ],
      steps: [
        {
          q: 'End-to-end view kyun chahiye?',
          body: 'Ek checkout request 5 services se guzarti hai. Har team apna tool dekhe toh koi poori kahani nahi dekhta. <b>Ek tracing tool</b> (Zipkin, Jaeger, AWS X-Ray, Datadog APM) mein har request ka safar: kis service mein kitna time, kahan error.',
          asli: 'Tool kaunsa, farak kam padta hai. Sab <b>ek hi</b> tool use karein, yeh zaroori hai — incident mein sab ko pata ho kahan dekhna hai.',
        },
        {
          q: 'Har service ko kya "muft" milna chahiye?',
          body: '<table><tr><th>Layer</th><th>Kya</th></tr>' +
            '<tr><td>Server</td><td>CPU, memory, disk, network</td></tr>' +
            '<tr><td>Service</td><td>Health check; requests by 2xx/3xx/4xx/5xx; response time avg, p50, p99; request count; kitne servers</td></tr>' +
            '<tr><td>Logs</td><td>Application logs (JSON + traceId), critical process logs, user/auth/SSH/OS logs</td></tr>' +
            '<tr><td>Traces</td><td>Har request ke spans, trace id har hop par</td></tr></table>',
          example: 'Yeh sab infrastructure config (node exporter, log agent) aur shared library (khanakart-kit) se aata hai — team ko ek line nahi likhni.',
        },
        {
          q: 'Ek metrics system kyun?',
          body: 'Prometheus/Graphite (khud chalao) ya Datadog/New Relic (paid) — koi bhi, par <b>ek</b>. Ek query language, ek dashboard style, ek alerting. Warna ek team PromQL, doosri Datadog, teesri Excel.',
        },
        {
          q: 'Alerts kin par?',
          points: [
            '<b>Symptoms</b> par jo user ko chubhein: 5xx rate, p99 latency, checkout success rate.',
            'Har alert ka <b>runbook link</b>.',
            'CPU 80% jaise causes par sirf dashboard/warning — raat 3 baje jagaane layak nahi jab tak user par asar na ho.',
          ],
        },
        {
          q: 'Standard hone se incident kaise badalta hai?',
          body: 'Alert 2 minute mein (5xx badha) → dashboard par coupon-service ka 5xx laal → ek fail request ka traceId → trace mein coupon span laal → traceId se log: "Cannot read properties of undefined (reading \'max\') code=DIWALI" → config fix. <b>~10 minute.</b>',
        },
      ],
      myth: [
        { myth: 'Logs bahut hain toh monitoring ho gayi.', sach: 'Free-text logs jinmein traceId nahi, search nahi ho sakte. Metrics batate hain "kya" aur "kahan", traces batate hain "kis raaste", logs batate hain "kyun".' },
        { myth: 'Har team apna observability tool chune — flexibility.', sach: 'Incident mein teams ke beech ki request ka pura safar ek tool mein chahiye. Alag tools = andhere kone.' },
      ],
      playbook: {
        title: 'monitoring standard',
        use: [
          'Har service: health, RED metrics (rate, errors, duration), JSON logs + traceId',
          'Ek tracing tool, ek metrics system, ek log system',
          'Symptom-based alerts + runbook link',
        ],
        avoid: [
          'Team-wise alag tools aur formats',
          'Cause-based noisy alerts (CPU 70%) raat mein',
          'Monitoring jo har team ko khud jodni pade',
        ],
        how: [
          'Infra: node exporter / agent har server par (CPU, mem, disk, network)',
          'Kit/library: request metrics, JSON logger, trace propagation',
          'Default dashboard template har service ke liye',
          'Default alerts: 5xx rate, p99, health; SLO ke hisaab se',
          'Scorecard mein "observable" checks',
        ],
        redflags: [
          'Incident ki pehli khabar customer support se',
          '"Kaunsi service?" dhoondhne mein 30+ minute',
          'Dashboard par kuch services ka data hi nahi',
        ],
        rule: 'Har service ko pehle din se aankhein milein — metrics kya, traces kahan, logs kyun.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Diwali incident ka MTTR',
          goal: 'Incident pata chalne mein <b>≤ 5 minute</b> aur theek hone tak kul <b>≤ 15 minute</b>.',
          scenario: 'Checkout ke 12% orders fail. Har minute ~₹6.4 lakh ke orders aate hain. Kul time = pata chalna + service dhoondhna + wajah dhoondhna.',
          knobs: [
            { id: 'alerts', label: 'Alerts (5xx, p99)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi (support batata hai)', 1: 'haan' } },
            { id: 'metrics', label: 'Har service ke standard metrics', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'kuch services', 1: 'sab (kit se)' } },
            { id: 'tracing', label: 'Ek tracing tool', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi', 1: 'haan' } },
            { id: 'logs', label: 'Logs', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'team-wise format', 1: 'JSON + traceId' } },
          ],
          nodes: [N('user', 120, 260, { label: 'on-call', icon: '🧑‍🚒' }), N('order', 420, 90, { label: 'checkout' }), N('coupon', 720, 90), N('payment', 720, 430, { id: 'pricing', icon: '💰', label: 'pricing' }), N('analytics', 420, 430, { label: 'dashboards' })],
          edges: [{ from: 'order', to: 'coupon' }, { from: 'order', to: 'pricing' }, { from: 'user', to: 'analytics' }, { from: 'user', to: 'order', dashed: true }],
          model: k => {
            const m = mttrModel(k);
            const okD = m.detect <= 5, okT = m.total <= 15;
            return {
              nodes: {
                user: { tone: okT ? 'ok' : 'bad', badge: `${m.total} min` },
                coupon: { tone: 'bad', badge: k.tracing || k.metrics ? '5xx 🔴 (dikh raha)' : '5xx (andhera)' },
                analytics: { tone: k.metrics ? 'ok' : 'slow', badge: k.metrics ? 'sab services' : 'aadhi services' },
                pricing: { tone: 'ok', badge: k.logs ? 'JSON logs' : 'free text' },
                order: { tone: 'bad', badge: '12% fail' },
              },
              flows: [
                { from: 'order', to: 'coupon', label: 'DIWALI → 500', tone: 'bad' },
                { from: 'order', to: 'pricing', tone: 'ok', rate: 0.3 },
                { from: 'user', to: 'analytics', label: k.alerts ? 'alert 2 min' : 'support ticket 25 min', tone: k.alerts ? 'ok' : 'slow' },
              ],
              readouts: [
                { label: 'Pata chala', value: m.detect + ' min', tone: okD ? 'ok' : 'bad' },
                { label: 'Service dhoondhi', value: m.find + ' min', tone: m.find <= 5 ? 'ok' : 'bad' },
                { label: 'Wajah dhoondhi', value: m.cause + ' min', tone: m.cause <= 5 ? 'ok' : 'bad' },
                { label: 'Nuksaan', value: inr(m.loss), tone: okT ? 'ok' : 'bad' },
              ],
              bars: [
                { label: 'Kul MTTR', pct: Math.min(100, m.total), text: m.total + ' min', tone: okT ? 'ok' : 'bad' },
              ],
              verdict: okD && okT
                ? { ok: true, text: `Alert 2 min → trace se coupon 3 min → traceId log se wajah 5 min. Kul ${m.total} min, nuksaan ${inr(m.loss)}.` }
                : !okD
                  ? { ok: false, text: 'Customer support se pata chalna = 25 minute ka andhera. 5xx aur p99 par alerts lagao.' }
                  : m.find > 5
                    ? { ok: false, text: `Kaunsi service? ${m.find} minute dhoondhne mein — ${k.metrics ? 'metrics se andaaza lagta hai, par request ka raasta trace batata hai' : 'aadhi services dashboard par hi nahi'}.` }
                    : { ok: false, text: 'Service mil gayi, par logs alag format mein — traceId se error line nahi milti. JSON + traceId standard karo.' },
            };
          },
          check: k => { const m = mttrModel(k); return m.detect <= 5 && m.total <= 15; },
          lesson: '✅ <b>Aankhein standard, incident chhota.</b> Alerts ne pata chalaya, trace ne service dikhayi, JSON logs ne wajah batayi.',
          quiz: {
            q: 'Metrics on aur tracing off — "service dhoondhi" 10 minute kyun?',
            choices: [
              'Metrics se dikhta hai checkout aur coupon dono mein 5xx badhe, par kaunsi service ki wajah se doosri fail hui, woh request ka raasta (trace) batata hai',
              'Metrics galat hain',
              'Dashboard slow hai',
              'Coupon service ke metrics nahi the',
            ],
            answer: 0,
            explain: 'Metrics = kahan dard, traces = dard kahan se shuru.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — 8:52 PM, standard tools ke saath',
          goal: 'Alert se fix tak har kadam — kaunsa tool kya bata raha hai.',
          nodes: [N('user', 120, 260, { label: 'on-call', icon: '🧑‍🚒' }), N('order', 440, 80, { label: 'checkout' }), N('cart', 760, 80, { icon: '🛒', label: 'cart' }), N('coupon', 760, 260), N('payment', 760, 440, { id: 'pricing', icon: '💰', label: 'pricing-legacy' }), N('analytics', 440, 440, { label: 'tracing + logs' })],
          edges: [{ from: 'order', to: 'cart' }, { from: 'order', to: 'coupon' }, { from: 'order', to: 'pricing' }, { from: 'user', to: 'analytics' }, { from: 'user', to: 'order', dashed: true }],
          panels: [{ id: 'tool', title: 'Tool kya dikha raha hai' }, { id: 'clock', title: 'Minute' }],
          steps: [
            {
              say: '<b>8:54</b> — Alert: "checkout 5xx rate 12% (limit 1%)". Alert mein runbook link aur checkout dashboard.',
              flows: [{ from: 'user', to: 'order', label: 'alert', tone: 'bad' }],
              nodes: { order: { tone: 'bad', badge: '5xx 12%' } },
              panels: { tool: ['Alert: checkout 5xx 12%'], clock: ['2 min'] },
            },
            {
              say: '<b>8:55</b> — Metrics dashboard (sab services ke same panels): cart 5xx 0, coupon 5xx 33%, pricing-legacy — <b>koi data nahi</b>.',
              flows: [{ from: 'order', to: 'coupon', label: '5xx 33%', tone: 'bad' }, { from: 'order', to: 'cart', label: '0', tone: 'ok' }],
              nodes: { coupon: { tone: 'bad', badge: '5xx 33%' }, cart: { tone: 'ok', badge: '5xx 0' }, pricing: { tone: 'idle', badge: 'no data' } },
              panels: { tool: ['Metrics: coupon laal', 'pricing-legacy: andhera'], clock: ['3 min'] },
              ask: {
                q: 'Pricing-legacy ka "no data" — abhi ka sabse bada khatra?',
                choices: ['Agar wajah pricing mein hoti toh hum dekh hi nahi paate — andhera kona', 'Koi khatra nahi', 'Pricing down hai', 'Dashboard toota'],
                answer: 0,
                explain: 'Standard se bahar ki service incident mein blind spot.',
              },
            },
            {
              say: '<b>8:57</b> — Ek fail checkout ka trace: checkout (72 ms) → cart ✅ (31 ms) → coupon ❌ 500 (23 ms). Pricing tak request pahunchi hi nahi.',
              flows: [{ from: 'user', to: 'analytics', label: 'trace tr-xxxx', tone: 'acc' }, { from: 'order', to: 'coupon', label: 'span: 500', tone: 'bad' }],
              nodes: { analytics: { tone: 'ok', badge: 'trace mila' } },
              panels: { tool: ['Trace: coupon span 500'], clock: ['5 min'] },
            },
            {
              say: '<b>8:59</b> — Log search <code>traceId=tr-xxxx</code>: coupon ki line — <code>coupon validate crash code=DIWALI error=Cannot read properties of undefined (reading \'max\')</code>. DIWALI coupon ka config entry adhoora deploy hua tha.',
              flows: [{ from: 'user', to: 'analytics', label: 'logs by traceId', tone: 'ok' }],
              nodes: { coupon: { tone: 'slow', badge: 'config bug' } },
              panels: { tool: ['Log: DIWALI config missing'], clock: ['7 min'] },
              ask: {
                q: 'Is line tak pahunchne mein kaunsi do cheezein zaroori thi?',
                choices: ['Log JSON format + har line mein traceId', 'CPU graph', 'Load balancer logs', 'Database backup'],
                answer: 0,
                explain: 'Trace ne request diya, traceId ne log line.',
              },
            },
            {
              say: '<b>9:04</b> — Coupon config fix deploy. 5xx 12% → 0.2%. Alert khud band. Postmortem action: pricing-legacy ko kit par laana.',
              flows: [{ from: 'order', to: 'coupon', label: '200', tone: 'ok' }, { from: 'order', to: 'pricing', tone: 'ok' }],
              nodes: { coupon: { tone: 'ok', badge: 'fixed' }, order: { tone: 'ok', badge: '5xx 0.2%' } },
              panels: { tool: ['Recovered'], clock: ['12 min'] },
            },
          ],
          lesson: '<b>Asli baat:</b> alert → metrics (kahan) → trace (kis raaste) → logs (kyun). Standard hone par yeh chain har service ke liye ek jaisi chalti hai.',
        },
        {
          type: 'bins',
          title: 'Kaunsi layer?',
          instructions: 'Har signal ko sahi layer mein daalo.',
          bins: [{ id: 'server', label: '🖥️ Server metrics' }, { id: 'service', label: '🩺 Service metrics' }, { id: 'logs', label: '📜 Logs' }, { id: 'trace', label: '🧵 Traces' }],
          items: [
            { text: 'Disk 91% bhar gayi', bin: 'server', explain: 'Machine level.' },
            { text: 'coupon-service 5xx per minute', bin: 'service', explain: 'Request counts by status class.' },
            { text: '"Cannot read properties of undefined" traceId ke saath', bin: 'logs', explain: 'Application log.' },
            { text: 'Checkout request ka coupon span 23 ms, status 500', bin: 'trace', explain: 'Request ka safar.' },
            { text: 'SSH login attempts raat 2 baje', bin: 'logs', explain: 'Auth/OS logs.' },
            { text: 'p99 latency 480 ms', bin: 'service', explain: 'Response time distribution.' },
            { text: 'Network out 900 Mbps', bin: 'server', explain: 'Machine level.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Monitoring — quick check',
          questions: [
            {
              q: 'Tracing tool ka sabse bada faayda?',
              choices: ['Ek request ka kai services mein poora safar aur har hop ka time/error ek view mein', 'CPU kam', 'Logs chhote', 'Alerts band'],
              answer: 0,
              explain: 'End-to-end view.',
            },
            {
              q: 'Raat 3 baje jagaane wala alert kis par?',
              choices: ['User-facing symptom: checkout success rate gira / 5xx badha', 'CPU 70%', 'Ek pod restart', 'Disk 60%'],
              answer: 0,
              explain: 'Symptoms page karo, causes dashboard par.',
            },
            {
              q: 'Monitoring har service tak kaise pahunche bina teams ki mehnat?',
              choices: ['Infra agents + shared library/template mein pehle se', 'Har team khud likhe', 'Quarterly audit', 'Wiki page'],
              answer: 0,
              explain: 'Out of the box.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — ek traceId se incident sulajhao',
          project: '08-standards',
          exercise: 'ex2-observability',
          goal: 'DIWALI bug ke saath traffic chalao, fail traceId se logs ki kahani padho, aur metrics table mein andhera kona dekho.',
          steps: [
            { text: 'Bug ke saath chalao aur traffic.', cmd: 'COUPON_BUG=1 npm start ex2-observability\nnpm run traffic 40', expect: '40 checkouts → 200: 32, 502: 8\nEk fail hua checkout ka traceId: tr-xxxx' },
            { text: 'Trace ki kahani.', cmd: 'npm run logs tr-xxxx', expect: 'cart     request status=200\ncoupon   coupon validate crash  code=DIWALI error=Cannot read properties of undefined (reading \'max\')\ncheckout checkout fail\n⚠️ Andhere kone: pricing-legacy.log: .../... lines JSON nahi' },
            { text: 'Metrics table.', cmd: 'npm run metrics', expect: 'checkout  2xx 32  5xx 8\ncoupon    2xx 24  5xx 8\npricing-legacy  ❌ /metrics nahi — dashboard par yeh service andhera hai' },
          ],
          observe: {
            q: 'Coupon ke 2xx 24 kyun, 40 nahi?',
            choices: [
              '40 checkouts mein se 8 bina coupon the (coupon call hi nahi hui) aur 8 DIWALI par 500 — 40 − 8 − 8 = 24',
              'Metrics galat',
              'Coupon slow tha',
              'Cache se jawab mila',
            ],
            answer: 0,
            explain: 'tools/traffic.js ka coupon cycle: KHANA50, FREEDEL, DIWALI, "", KHANA50. Metrics padhna bhi skill hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Observability',
        instructions: 'SRE/observability sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Microservices mein observability kaise standardize karoge?"',
            choices: [
              'Teen pillars ek-ek tool mein: metrics (Prometheus/Datadog, RED + USE), logs (structured JSON, traceId, central), traces (OpenTelemetry → Jaeger/X-Ray); shared library + infra agents se default; default dashboards + SLO alerts',
              'Har team apna tool',
              'Sirf logs',
              'Sirf APM vendor',
            ],
            answer: 0,
            explain: 'Pillars + standard delivery.',
          },
          {
            q: 'Interviewer: "RED aur USE metrics?"',
            choices: [
              'RED (services): Rate, Errors, Duration. USE (resources): Utilization, Saturation, Errors',
              'Read, Edit, Delete',
              'Retry, Error, Drop',
              'Usage, Speed, Energy',
            ],
            answer: 0,
            explain: 'Service vs resource view.',
          },
          {
            q: 'Interviewer: "Trace context services ke beech kaise jaata hai?"',
            choices: [
              'Headers (W3C traceparent / x-trace-id) har outgoing call aur message metadata mein; library automatically propagate kare',
              'Database mein',
              'Cookie mein',
              'Nahi jaata',
            ],
            answer: 0,
            explain: 'Propagation library ka kaam.',
          },
        ],
      },
      success: [
        'Main har service ke default metrics, logs aur traces gina sakta hoon',
        'Main incident chain (alert → metrics → trace → logs) chala sakta hoon',
        'Main symptom vs cause alerts ka farak bata sakta hoon',
        'Main bata sakta hoon standard monitoring teams tak kaise pahunchti hai',
      ],
      homework: '<p>Apne pichhle incident ki timeline likho: pata chalna, service dhoondhna, wajah dhoondhna — har hisse mein kitne minute. Har hisse ke liye ek standard sudhaar likho (alert, dashboard, trace, log format).</p>',
      cards: [
        { front: 'Har service ke default service metrics?', back: 'Health, requests by <b>2xx/3xx/4xx/5xx</b>, <b>p50/p99</b>, request count, servers.' },
        { front: 'Server metrics?', back: '<b>CPU, memory, disk, network</b>.' },
        { front: 'Tracing tool kitne?', back: '<b>Ek</b> — sab ko pata ho kahan dekhna hai.' },
        { front: 'Incident chain?', back: 'Alert → metrics (kahan) → trace (raasta) → logs (kyun).' },
      ],
    },

    /* =================================================================
       LEVEL: Interface standard
       ================================================================= */
    {
      id: 'ms-interface-standard',
      icon: '🔌',
      title: 'Interface ka Standard — Har Team ki API Ek Jaisi',
      badge: 'API Acharya',
      source: Object.assign({ at: 861 }, SRC),
      hook: {
        when: 'KhanaKart · naya "My orders" page',
        title: 'Teen teams, teen pagination styles, aur ek order do baar',
        text: 'Web team "My orders" page bana rahi thi. Orders API <code>?page=2&size=20</code> leti thi, payments API <code>?offset=20&limit=20</code>, aur refunds API <code>?cursor=</code>. Versioning: ek mein <code>/v2/orderDetails</code>, doosre mein <code>/api/order-status/:id/v1</code>. Web team ne teen alag client wrappers likhe. Launch ke din users ne shikaayat ki: scroll karte hue ek hi order do baar dikh raha hai.',
      },
      objectives: [
        '<b>Allowed protocols</b> ki list (REST, gRPC) — har koi apna nahi',
        'REST niyam: <b>plural nouns</b>, verbs aur "and" nahi, ek <b>versioning style</b>',
        'Ek <b>pagination style</b> — aur badalte data par <b>cursor</b> kyun behtar',
        '<b>Timeouts</b> ek range mein, <b>retry policy</b> (exponential backoff), <b>JSON</b> — shared client library',
      ],
      steps: [
        {
          q: 'Protocol ka standard kyun?',
          body: 'Org mein <b>allowed protocols</b> ki list: jaise external/public ke liye REST + JSON, internal high-throughput ke liye gRPC. SOAP, Thrift, custom TCP — sirf RFC se. Har naya protocol = naye clients, naye debugging tools, naye gateways.',
        },
        {
          q: 'REST routes ke niyam kya hon?',
          points: [
            '<b>Plural nouns</b>: <code>/v1/orders</code>, <code>/v1/orders/:orderId</code> — <code>/getOrders</code> nahi (verb HTTP method mein hai).',
            'Ek path = ek resource: <code>/orders_and_payments</code> nahi; <code>/v1/orders/:orderId/payments</code>.',
            'Lowercase, kebab-case: <code>/v1/delivery-slots</code>.',
            '<b>Versioning ek hi tareeke se</b>: KhanaKart mein prefix <code>/v1/</code>. Suffix ya subdomain bhi theek hote — par poori org mein ek.',
          ],
        },
        {
          q: 'Pagination ek style kyun, aur cursor kyun?',
          analogy: 'Kitaab mein bookmark (cursor) vs "page 12 se padhna" (offset). Kisi ne beech mein 3 naye page jod diye toh "page 12" par tumhe purana hi content dobara milega — bookmark wahi rehta hai jahan tum the.',
          body: '<b>Offset/page</b> (<code>?page=3&size=20</code>): database pehle 40 rows chhodta hai phir 20 deta hai. Naye orders upar aaye toh purane neeche khiske → <b>duplicate</b>. Page 500 par 10,000 rows padh ke chhodna → <b>dheema</b>.<br><b>Cursor</b> (<code>?limit=20&cursor=abc</code>): "is order ke baad ke 20" — index se seedha, naye orders se farak nahi.',
          asli: 'Admin tables jahan "page 7 par jao" chahiye wahan offset theek hai. Infinite scroll feeds ke liye cursor. Org standard mein dono ka niyam likho — par har team apna naya mat banaye.',
        },
        {
          q: 'Timeouts, retries aur payload ka standard?',
          points: [
            '<b>Timeout</b>: default 1 s, allowed range 100 ms – 5 s. Isse bahar = review.',
            '<b>Retry</b>: sirf idempotent/retryable errors par, <b>exponential backoff + jitter</b>, max 2-3.',
            '<b>Payload</b>: JSON, error shape ek jaisa (<code>{"error": {"code", "message"}}</code>), fields camelCase.',
          ],
          asli: 'Jab sab ek jaisa ho, ek <b>shared client library</b> parsing, retries, timeouts, tracing sab sambhal leti hai.',
        },
      ],
      myth: [
        { myth: 'API style taste ki baat hai, standard ki zaroorat nahi.', sach: 'Har client har API ke liye naya wrapper likhta hai, aur galtiyaan (duplicate orders, galat timeouts) har team alag karti hai. Standard ek baar ki bahas bachata hai.' },
        { myth: 'Offset pagination hamesha galat hai.', sach: 'Chhote, kam badalne wale data aur "page number" UI ke liye offset theek hai. Badalte feeds aur gehre scroll ke liye cursor.' },
      ],
      playbook: {
        title: 'interface standard',
        use: [
          'Allowed protocols list (REST external, gRPC internal)',
          'REST style guide: plural nouns, /v1 prefix, kebab-case',
          'Cursor pagination feeds ke liye; limit max 100',
          'Timeout range, retry policy, JSON error shape',
        ],
        avoid: [
          'Verbs route mein (/getOrders, /createNew)',
          'Har team ka apna versioning',
          'Badalte data par offset pagination',
          'Bina limit ke list endpoints',
        ],
        how: [
          'Style guide + OpenAPI template',
          'CI mein API linter (Spectral jaisa)',
          'Shared client library: timeouts, retries, tracing, error parsing',
          'API review checklist naye endpoints ke liye',
        ],
        redflags: [
          'Frontend teams har API ke liye alag wrapper',
          'Infinite scroll mein duplicate items',
          'Timeout 30 s wale internal calls',
        ],
        rule: 'Ek org, ek API bhasha — taaki ek client library sab samjhe.',
      },
      stages: [
        {
          type: 'archdiff',
          title: '🕵️ API review — standard todne wale endpoints',
          brief: 'Payments team ka naya API review ke liye aaya hai. KhanaKart standard: <code>/v1/</code> prefix, plural nouns, verbs nahi, cursor pagination, JSON, timeout range 100 ms – 5 s.',
          goal: 'Is design mein <b>4</b> endpoints standard todte hain. Har galat box par click karo.',
          nodes: [
            { id: 'list', label: 'GET /v1/users/:userId/payments?limit=20&cursor=…', sub: 'JSON, newest first', row: 0 },
            { id: 'verb', label: 'POST /v1/payments/createRefund', sub: 'refund banata hai', row: 0 },
            { id: 'one', label: 'GET /v1/payments/:paymentId', sub: 'JSON', row: 1 },
            { id: 'offset', label: 'GET /v1/merchants/:merchantId/settlements?page=40&size=50', sub: 'har minute naye settlements', row: 1 },
            { id: 'ver', label: 'GET /payments/:paymentId/receipt/v2', sub: 'PDF link JSON mein', row: 2 },
            { id: 'timeout', label: 'bank-gateway client', sub: 'timeout 30,000 ms, retries 5 bina backoff', row: 2 },
            { id: 'refund', label: 'POST /v1/payments/:paymentId/refunds', sub: 'Idempotency-Key header, JSON', row: 3 },
          ],
          flaws: [
            { id: 'verb', why: 'Route mein verb. Refund ek resource hai: POST /v1/payments/:paymentId/refunds (jo neeche sahi bana hai).' },
            { id: 'offset', why: 'Badalte settlements par page/size offset → duplicate/chhoote rows aur page 40 par 2,000 rows skip. Standard: limit + cursor.' },
            { id: 'ver', why: 'Version suffix mein aur /v1 prefix gayab. Org standard: /v2/payments/:paymentId/receipt.' },
            { id: 'timeout', why: '30 s timeout range (100 ms – 5 s) se bahar aur 5 retries bina backoff = retry storm. Standard client use karo.' },
          ],
          fine: {
            list: 'Plural nouns, /v1, cursor pagination — standard.',
            one: 'Single resource by id — standard.',
            refund: 'Nested resource + idempotency key — bilkul sahi.',
          },
          lesson: '<b>Asli baat:</b> linter aur review checklist yeh chaaron galtiyaan merge se pehle pakad sakte hain. Standard likha ho toh review "taste" nahi, checklist banta hai.',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — "My orders" ka infinite scroll',
          goal: 'Gehra scroll (<b>page ≥ 200</b>) aur <b>≥ 20 naye orders/minute</b> par: page response <b>≤ 20 ms</b> aur <b>0 duplicate</b>.',
          scenario: 'Har page 20 orders. User har page par ~10 second rukta hai. Offset mein DB pehle ke saare rows padh ke chhodta hai.',
          knobs: [
            { id: 'style', label: 'Pagination', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'offset (?page=&size=)', 1: 'cursor (?limit=&cursor=)' } },
            { id: 'depth', label: 'Page number', min: 1, max: 500, step: 1, value: 3 },
            { id: 'fresh', label: 'Naye orders / minute', min: 0, max: 60, step: 5, value: 0 },
          ],
          nodes: [N('app', 130, 260, { label: 'My orders' }), N('order', 450, 260, { label: 'orders API' }), N('db', 800, 260, { label: 'orders DB' })],
          edges: [{ from: 'app', to: 'order' }, { from: 'order', to: 'db' }],
          model: k => {
            const m = pageModel(k);
            const okMs = m.ms <= 20, okD = m.dups === 0, okDeep = k.depth >= 200 && k.fresh >= 20;
            return {
              nodes: {
                app: { tone: okD ? 'ok' : 'bad', badge: okD ? 'saaf list' : `${m.dups} duplicate / 10 pages` },
                order: { tone: okMs ? 'ok' : 'slow', badge: `${m.ms} ms` },
                db: { tone: m.rows > 1000 ? 'bad' : 'ok', badge: `${m.rows.toLocaleString('en-IN')} rows padhi` },
              },
              flows: [
                { from: 'app', to: 'order', label: m.cursor ? `?limit=20&cursor=…` : `?page=${k.depth}&size=20`, tone: 'acc' },
                { from: 'order', to: 'db', label: m.cursor ? 'WHERE created < cursor LIMIT 20' : `OFFSET ${((k.depth - 1) * 20).toLocaleString('en-IN')} LIMIT 20`, tone: m.rows > 1000 ? 'bad' : 'ok' },
              ],
              readouts: [
                { label: 'Response', value: m.ms + ' ms', tone: okMs ? 'ok' : 'bad' },
                { label: 'DB rows padhi', value: m.rows.toLocaleString('en-IN'), tone: m.rows <= 100 ? 'ok' : 'warn' },
                { label: 'Duplicate orders (10 pages)', value: String(m.dups), tone: okD ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'DB kaam', pct: Math.min(100, m.rows / 100), text: m.rows.toLocaleString('en-IN') + ' rows', tone: m.rows <= 100 ? 'ok' : 'bad' }],
              verdict: !okDeep
                ? { ok: false, text: 'Asli test: gehra scroll (page 200+) jab naye orders aate rahein (20+/min). Sliders badhao.' }
                : !m.cursor
                  ? { ok: false, text: `Offset: page ${k.depth} par ${m.rows.toLocaleString('en-IN')} rows padh ke chhodi (${m.ms} ms), aur naye orders ne purane khiskaaye → ${m.dups} duplicate.` }
                  : { ok: true, text: `Cursor: har page sirf 20 rows (${m.ms} ms), naye orders se koi duplicate nahi.` },
            };
          },
          check: k => { const m = pageModel(k); return k.depth >= 200 && k.fresh >= 20 && m.ms <= 20 && m.dups === 0; },
          lesson: '✅ <b>Cursor jeeta.</b> Badalte data aur gehre scroll dono par cursor stable aur sasta hai — isliye KhanaKart standard mein feeds ke liye cursor.',
          quiz: {
            q: 'Cursor pagination ki ek kami?',
            choices: [
              '"Seedha page 37 par jao" nahi ho sakta — sirf aage/peeche',
              'Duplicate aate hain',
              'Har page par saari rows padhta hai',
              'JSON nahi chalta',
            ],
            answer: 0,
            explain: 'Isliye admin tables mein offset kabhi-kabhi theek hai.',
          },
        },
        {
          type: 'match',
          title: 'Standard → kyun',
          pairs: [
            { left: 'Sab APIs /v1/ prefix', right: 'Client ko har service ke liye versioning ka naya niyam nahi seekhna', explain: 'Ek tareeka.' },
            { left: 'Timeout range 100 ms – 5 s', right: 'Koi service 30 s tak thread pakad ke cascade na laaye', explain: 'Level "Timeouts" ka sabak.' },
            { left: 'Retry: exponential backoff + jitter, max 3', right: 'Retry storm se bachaav', explain: 'Sab ek jaise, sab surakshit.' },
            { left: 'JSON + ek error shape', right: 'Shared client library parsing aur errors ek jagah sambhale', explain: 'Ek library, sab clients.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Interfaces — quick check',
          questions: [
            {
              q: 'Kaunsa route KhanaKart standard par sahi hai?',
              choices: ['GET /v1/restaurants/:restaurantId/menu-items', 'GET /getMenuItems?rid=4', 'GET /restaurant/menuItems/v1', 'POST /v1/menu/listAll'],
              answer: 0,
              explain: 'Prefix version, plural nouns, kebab-case, verb nahi.',
            },
            {
              q: 'Offset pagination par naya order upar aaya. Page 2 par kya hoga?',
              choices: ['Page 1 ka aakhri order page 2 par dobara dikhega', 'Kuch nahi', 'Naya order page 2 par', 'Error'],
              answer: 0,
              explain: 'Sab ek position neeche khiske.',
            },
            {
              q: 'Protocols ki allowed list ka faayda?',
              choices: ['Gateways, clients, debugging tools, security reviews seemit protocols ke liye — har naye protocol ka kharcha bachta hai', 'Speed', 'Kam code', 'Sasta cloud'],
              answer: 0,
              explain: 'Tooling ek baar.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — API lint aur pagination test',
          project: '08-standards',
          exercise: 'ex3-interfaces',
          goal: 'Messy aur standard APIs ko lint karo, phir dono par scroll karte hue duplicates gino.',
          steps: [
            { text: 'Chalao aur lint.', cmd: 'npm start ex3-interfaces\nnpm run lint-api 5011\nnpm run lint-api 5012', expect: '❌ GET /getOrdersForUser?userId&page&size ← R1, R2, R4, R5\n... 14 violations\n\n✅ GET /v1/users/:userId/orders?limit&cursor\n🌟 0 violations' },
            { text: 'Pagination test (har 40 ms naya order).', cmd: 'npm run paginate 5011\nnpm run paginate 5012', expect: 'messy: duplicate (do baar dikhe): ~68 ❌\nstandard: duplicate (do baar dikhe): 0 ✅' },
          ],
          observe: {
            q: 'Messy API mein ~68 duplicates kyun?',
            choices: [
              '3 second ke scroll mein ~70 naye orders upar aaye; offset pagination mein har naya order purane orders ko neeche khiskaata hai, jo agle page par dobara aa jaate hain',
              'Messy API mein bug hai',
              'Paginate tool galat hai',
              'Cursor mein bhi duplicate hote hain',
            ],
            answer: 0,
            explain: 'services/orders-api.js: setInterval(add, 40) + orders.slice((page-1)*size, ...). Cursor mein filter(o => o.createdAt < after).',
          },
        },
      ],
      interview: {
        title: 'Interview Round — API standards',
        instructions: 'API design standard ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Org-wide REST guidelines mein kya hoga?"',
            choices: [
              'Resource naming (plural nouns, kebab-case, no verbs), versioning strategy, pagination (cursor default, limits), filtering/sorting params, error format, idempotency keys, timeouts/retries for clients, auth headers, OpenAPI + linting in CI',
              'Sirf naming',
              'Kuch nahi, har team apna',
              'Sirf JSON',
            ],
            answer: 0,
            explain: 'Complete style guide.',
          },
          {
            q: 'Interviewer: "Cursor vs offset pagination?"',
            choices: [
              'Offset: random page access, par deep pages mein slow (rows skip) aur inserts/deletes se duplicates/misses. Cursor: stable aur index-friendly, par random page jump nahi',
              'Dono same',
              'Offset hamesha tez',
              'Cursor sirf GraphQL mein',
            ],
            answer: 0,
            explain: 'Trade-off saaf bolo.',
          },
          {
            q: 'Interviewer: "API versioning strategies?"',
            choices: [
              'URL path (/v1), header (Accept-Version / media type), subdomain, query param — koi bhi, par org mein ek; breaking changes par hi naya version, additive changes bina version',
              'Har release par naya version',
              'Versioning ki zaroorat nahi',
              'Sirf git tags',
            ],
            answer: 0,
            explain: 'Consistency > choice.',
          },
        ],
      },
      success: [
        'Main REST route standard (plural nouns, versioning, no verbs) laga sakta hoon',
        'Main offset vs cursor pagination ka farak numbers se samjha sakta hoon',
        'Main timeouts, retries aur JSON ke standard aur shared client ka faayda bata sakta hoon',
        'Main API review mein standard violations pakad sakta hoon',
      ],
      homework: '<p>Apne product ki 10 APIs lo aur is level ke 6 niyamon (R1-R6) par lint karo — kaagaz par ya Spectral jaisa linter. Sabse zyada tootne wala niyam kaunsa hai? Uske liye style guide ka ek paragraph likho.</p>',
      cards: [
        { front: 'REST route niyam?', back: '<b>Plural nouns</b>, verbs nahi, "and" nahi, kebab-case, <b>ek versioning style</b>.' },
        { front: 'Offset pagination ki dikkat?', back: 'Gehre pages <b>dheeme</b>, badalte data par <b>duplicates/misses</b>.' },
        { front: 'Cursor pagination?', back: '"Is item ke baad ke N" — stable, index-friendly; page jump nahi.' },
        { front: 'Interface standard ka bada faayda?', back: '<b>Ek shared client library</b> — parsing, timeouts, retries, tracing.' },
      ],
    },

    /* =================================================================
       LEVEL: Tolerance
       ================================================================= */
    {
      id: 'ms-tolerance',
      icon: '🛡️',
      title: 'Tolerance — Khud Bacho, Doosron ko Bachao',
      badge: 'Kill Switch King',
      source: Object.assign({ at: 1119 }, SRC),
      hook: {
        when: 'KhanaKart · Saturday · 9:02 PM',
        title: 'Recommendation ke ek bug ne checkout ko dooba diya',
        text: 'Recommendation team ne 9 baje naya version deploy kiya. Ek retry loop mein bug — har user ke liye profile-service ko 60 baar call. Profile-service ek saath sirf kuch requests sambhal sakti thi. Checkout ko bhi address ke liye profile chahiye tha — checkout ki calls line mein phans gayi. 9:15 par avatar-service bhi hang ho gayi aur profile ke saare slots avatar ka intezaar karne lage. Sabse bura: profile team ke paas recommendation ko "rukne" ka koi tareeka nahi tha bina naya deploy kiye.',
      },
      objectives: [
        '<b>Ration</b>: har caller ki seema (recommendation max 50 req/s) — ek bura caller sab ko na dubaaye',
        '<b>Good citizen</b>: neeche wali services par bomb mat giraao',
        '<b>Incoming kill switch</b>: ek caller ki calls config se band — deploy nahi',
        '<b>Outgoing kill switch</b>: mari dependency ko call band, default jawab (circuit breaker jaisa)',
      ],
      steps: [
        {
          q: 'Rationing kya hai?',
          analogy: 'Shaadi ke buffet par ek mehmaan 15 plate le jaaye toh baaki bhookhe. Isliye "ek baar mein ek plate" ka niyam — sabko milega.',
          body: 'Profile-service har caller ki <b>alag seema</b> rakhe: checkout 500 req/s, recommendation 50 req/s, search 300 req/s. Seema paar → <b>429</b> turant. Bura caller apne hisse mein fail hota hai, doosre bache rehte hain.',
          asli: 'Caller pehchaan: service identity header ya mTLS certificate — "unknown" caller ki sabse chhoti seema.',
        },
        {
          q: 'Good citizen ka matlab?',
          body: 'Tolerance sirf khud ko bachana nahi. Tum bhi kisi ke caller ho. Notification-service ek marketing campaign mein 20 lakh push ek minute mein SMS gateway par nahi phenke — <b>batching</b>, <b>outgoing rate limit</b>, aur retries mein backoff.',
          example: 'KhanaKart campaign: 20 lakh push → 5,000/s ki raftaar se 7 minute mein; SMS provider khush, koi throttle nahi.',
        },
        {
          q: 'Incoming kill switch kya hai?',
          body: 'Config mein ek list: <code>blockIncoming: ["recommendation"]</code>. Service har second config padhti hai. On-call ek command se recommendation ki saari calls <b>403</b> — bina deploy, 1 second mein. Recommendation ka feature band, par checkout, search, orders chalte rahe.',
          asli: 'Kill switch aakhri hathiyar hai: pehle ration, zaroorat pade toh block. Aur kill switch ka use alert + incident note ke saath.',
        },
        {
          q: 'Outgoing kill switch kya hai?',
          body: 'Avatar-service hang. Profile har request par 3 s (timeout) intezaar karti hai, slot pakde hue → profile ki poori capacity avatar ke intezaar mein. <b>Outgoing kill switch</b>: <code>killOutgoing: { avatar: { default: "/img/default-avatar.png" } }</code> — profile avatar ko call hi nahi karti, <b>default avatar</b> turant.',
          example: 'Level "Sync ke Dard" ka circuit breaker yahi kaam automatically karta hai. Kill switch us ka manual, config-based bhai hai — jab breaker na ho ya turant control chahiye.',
        },
      ],
      myth: [
        { myth: 'Rate limiting sirf gateway par public users ke liye hota hai.', sach: 'Internal services bhi ek doosre ko gira sakti hain. Har service apne callers ka ration rakhe — andar ka traffic bhi traffic hai.' },
        { myth: 'Kill switch ke liye naya deploy kar denge, 10 minute hi toh lagte hain.', sach: 'Incident mein deploy pipeline 20-40 minute, aur deploy khud risk hai. Config switch 1 second mein — pehle se bana ho tabhi.' },
      ],
      playbook: {
        title: 'tolerance',
        use: [
          'Har service: per-caller ration (identity se)',
          'Incoming kill switch har caller ke liye',
          'Outgoing kill switch + default har non-critical dependency ke liye',
          'Outgoing batching/rate limit bade jobs aur campaigns ke liye',
        ],
        avoid: [
          'Anonymous internal calls (caller pata hi nahi)',
          'Kill switch jo deploy maange',
          'Default response jo galat data dikhaye (price ka default 0)',
        ],
        how: [
          'Kit mein: caller identity header/mTLS, ration middleware, kill switch config reload',
          'Config store (file/Consul/feature flag service) — audit log ke saath',
          'Har dependency ke liye default/fallback tay karo (avatar → default image)',
          'Runbook mein switches ke commands',
          'Game day: saal mein 2 baar switches ka abhyaas',
        ],
        redflags: [
          'Ek caller ka traffic spike = service down for all',
          'Incident mein "revert deploy ka intezaar"',
          'Dependency down par threads/slots timeout ka intezaar karte hue',
        ],
        rule: 'Har darwaaze par seema, har bahar ke raaste par switch — config se, deploy se nahi.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — 9:15 PM, dono aafat ek saath',
          goal: 'Recommendation bug <b>aur</b> avatar hang dono chal rahe hain. Checkout success <b>≥ 99%</b>, checkout p50 <b>≤ 120 ms</b>, aur recommendation ko bhi <b>≥ 40 req/s</b> milte rahein (feature poora band nahi).',
          scenario: 'Profile-service capacity ~200 req/s. Checkout 60 req/s bhejta hai. Recommendation bug se 2,000 req/s. Avatar hang — timeout 3 s.',
          knobs: [
            { id: 'ration', label: 'Ration (recommendation 50 req/s)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
            { id: 'block', label: 'Incoming kill switch: recommendation', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'block' } },
            { id: 'killOut', label: 'Outgoing kill switch: avatar', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off (3 s intezaar)', 1: 'on (default avatar)' } },
          ],
          nodes: [N('search', 170, 90, { label: 'recommendation', icon: '✨' }), N('order', 170, 430, { label: 'checkout' }), N('profile', 500, 260), N('coupon', 860, 260, { id: 'avatar', icon: '🖼️', label: 'avatar' })],
          edges: [{ from: 'search', to: 'profile' }, { from: 'order', to: 'profile' }, { from: 'profile', to: 'avatar' }],
          model: k => {
            const m = tolModel(k);
            const okC = m.checkoutOk >= 99, okP = m.p50 <= 120, okR = m.recRps >= 40;
            return {
              nodes: {
                search: { tone: k.block ? 'idle' : k.ration ? 'slow' : 'bad', badge: k.block ? 'blocked (403)' : k.ration ? '50 ok, baaki 429' : '2,000 req/s bug' },
                order: { tone: okC && okP ? 'ok' : 'bad', badge: `${m.checkoutOk}% · p50 ${m.p50} ms` },
                profile: { tone: m.hang ? 'bad' : m.load > 200 ? 'slow' : 'ok', badge: m.hang ? 'slots avatar ka intezaar' : `load ${m.load}/200 req/s` },
                avatar: { tone: k.killOut ? 'idle' : 'bad', badge: k.killOut ? 'call band · default' : '💀 hang 3 s' },
              },
              flows: [
                k.block ? null : { from: 'search', to: 'profile', label: k.ration ? '50/s' : '2,000/s', tone: k.ration ? 'slow' : 'bad', rate: k.ration ? 0.3 : 1 },
                { from: 'order', to: 'profile', label: '60/s', tone: okC ? 'ok' : 'bad' },
                k.killOut ? null : { from: 'profile', to: 'avatar', label: 'wait 3 s', tone: 'bad' },
              ].filter(Boolean),
              readouts: [
                { label: 'Checkout success', value: m.checkoutOk + '%', tone: okC ? 'ok' : 'bad' },
                { label: 'Checkout p50', value: m.p50.toLocaleString('en-IN') + ' ms', tone: okP ? 'ok' : 'bad' },
                { label: 'Recommendation ko mila', value: m.recRps + ' req/s', tone: okR ? 'ok' : 'warn' },
              ],
              bars: [{ label: 'Profile load', pct: m.hang ? 100 : Math.min(100, m.load / 2), text: m.hang ? 'phansi' : `${m.load}/200`, tone: m.hang ? 'bad' : m.load > 200 ? 'bad' : 'ok' }],
              verdict: m.hang
                ? { ok: false, text: 'Avatar hang: profile ke saare slots 3 s ka intezaar — kisi ko kuch nahi mil raha. Outgoing kill switch se default avatar do.' }
                : !okC || !okP
                  ? { ok: false, text: `Avatar sambhala, par recommendation ${k.ration ? '' : '2,000 req/s '}se profile par ${m.load} req/s (capacity 200). Checkout ${m.checkoutOk}%, p50 ${m.p50} ms.` }
                  : !okR
                    ? { ok: false, text: 'Checkout bach gaya, par recommendation poori band — ration kaafi tha, block zaroori nahi.' }
                    : { ok: true, text: 'Ration ne recommendation ko 50 req/s tak roka, kill switch ne avatar ka intezaar hataya. Checkout 99.9%, recommendation bhi chal rahi.' },
            };
          },
          check: k => { const m = tolModel(k); return m.checkoutOk >= 99 && m.p50 <= 120 && m.recRps >= 40; },
          lesson: '✅ <b>Sahi hathiyar, sahi matra.</b> Ration ne bure caller ko uske hisse tak seemit kiya (block zaroori nahi tha), aur outgoing kill switch ne mari dependency ka intezaar khatam kiya.',
          quiz: {
            q: 'Block kab ration se behtar hai?',
            choices: [
              'Jab caller ki calls nuksaan kar rahi hon (galat data likh rahi, security issue) ya ration par bhi service na sambhle',
              'Hamesha',
              'Kabhi nahi',
              'Jab caller naya ho',
            ],
            answer: 0,
            explain: 'Ration pehle, block aakhri.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — config se incident sambhalo',
          goal: 'Profile-service on-call ke teen commands — aur har command ke 1 second baad kya badla.',
          nodes: [N('search', 170, 90, { label: 'recommendation', icon: '✨' }), N('order', 170, 430, { label: 'checkout' }), N('profile', 500, 260), N('coupon', 860, 260, { id: 'avatar', icon: '🖼️', label: 'avatar' })],
          edges: [{ from: 'search', to: 'profile' }, { from: 'order', to: 'profile' }, { from: 'profile', to: 'avatar' }],
          panels: [{ id: 'cfg', title: 'config/tolerance.json' }, { id: 'dash', title: 'Dashboard' }],
          steps: [
            {
              say: '<b>9:04</b> — Alert: profile p99 2.4 s. Dashboard "requests by caller": recommendation 2,000/s (kal 40/s), checkout 60/s. Checkout p50 330 ms.',
              flows: [{ from: 'search', to: 'profile', label: '2,000/s', tone: 'bad' }, { from: 'order', to: 'profile', label: '60/s', tone: 'slow' }],
              nodes: { profile: { tone: 'bad', badge: 'p99 2.4 s' }, search: { tone: 'bad', badge: 'bug' }, order: { tone: 'slow', badge: 'p50 330 ms' } },
              panels: { cfg: ['ration: {}', 'blockIncoming: []', 'killOutgoing: {}'], dash: ['recommendation 2,000/s', 'checkout p50 330 ms'] },
              ask: {
                q: 'Dashboard par "requests by caller" kyun zaroori tha?',
                choices: ['Bina caller identity ke pata hi nahi chalta kaun bomb gira raha hai', 'Sundar dikhta hai', 'CPU kam hota', 'Zaroori nahi tha'],
                answer: 0,
                explain: 'Ration aur kill switch dono caller pehchaan par chalte hain.',
              },
            },
            {
              say: '<b>9:06</b> — On-call: <code>killswitch ration recommendation 50</code>. Profile 1 second mein config padhti hai. Recommendation ki 1,950/s calls turant 429. Checkout p50 90 ms.',
              flows: [{ from: 'search', to: 'profile', label: '50 ok · baaki 429', tone: 'slow' }, { from: 'order', to: 'profile', label: '60/s', tone: 'ok' }],
              nodes: { profile: { tone: 'ok', badge: 'load 110/s' }, order: { tone: 'ok', badge: 'p50 90 ms' }, search: { tone: 'slow', badge: 'rationed' } },
              panels: { cfg: ['ration: { recommendation: 50 }'], dash: ['checkout p50 90 ms ✅'] },
            },
            {
              say: '<b>9:15</b> — Naya alert: profile 504s. Avatar-service hang. Profile ke slots 3 s timeout tak phanse. Checkout phir se dooba.',
              flows: [{ from: 'profile', to: 'avatar', label: 'wait 3 s', tone: 'bad' }],
              nodes: { avatar: { tone: 'bad', badge: 'hang' }, profile: { tone: 'bad', badge: 'slots phanse' }, order: { tone: 'bad', badge: 'timeouts' } },
              panels: { dash: ['profile 504 60%', 'avatar: no response'] },
              ask: {
                q: 'Sabse tez sahi kadam?',
                choices: ['Outgoing kill switch: avatar ko call band, default avatar', 'Profile restart', 'Timeout 3 s se 30 s', 'Checkout ko block'],
                answer: 0,
                explain: 'Avatar non-critical hai — default image se kaam chalega.',
              },
            },
            {
              say: '<b>9:16</b> — <code>killswitch kill-out avatar</code>. Profile avatar ko call nahi karti, har profile mein default avatar. Checkout p50 65 ms. Users ko sirf gol grey photo dikhi.',
              flows: [{ from: 'order', to: 'profile', label: '60/s', tone: 'ok' }, { from: 'search', to: 'profile', label: '50/s', tone: 'slow' }],
              nodes: { avatar: { tone: 'idle', badge: 'call band' }, profile: { tone: 'ok', badge: 'default avatar' }, order: { tone: 'ok', badge: 'p50 65 ms' } },
              panels: { cfg: ['ration: { recommendation: 50 }', 'killOutgoing: { avatar: default }'], dash: ['checkout ✅', 'avatar: switched off'] },
            },
            {
              say: '<b>9:48</b> — Recommendation ka fix deploy, avatar team ne hang theek kiya. On-call <code>killswitch reset</code>. Postmortem: kill switch commands runbook mein pehle se the — isliye 2 minute.',
              flows: [{ from: 'search', to: 'profile', label: '40/s', tone: 'ok' }, { from: 'order', to: 'profile', tone: 'ok' }, { from: 'profile', to: 'avatar', label: '10 ms', tone: 'ok' }],
              nodes: { avatar: { tone: 'ok', badge: 'healthy' }, search: { tone: 'ok', badge: 'fixed' }, profile: { tone: 'ok', badge: 'normal' } },
              panels: { cfg: ['ration: {}', 'blockIncoming: []', 'killOutgoing: {}'], dash: ['sab normal'] },
            },
          ],
          lesson: '<b>Asli baat:</b> tolerance ke switches incident se pehle bante hain — kit mein, config mein, runbook mein. Incident mein sirf command chalani hai.',
        },
        {
          type: 'bins',
          title: 'Kaunsa hathiyar?',
          instructions: 'Har situation ke liye sahi tolerance tool chuno.',
          bins: [{ id: 'ration', label: '🍚 Ration' }, { id: 'citizen', label: '🤝 Good citizen' }, { id: 'in', label: '🚫 Incoming kill switch' }, { id: 'out', label: '✂️ Outgoing kill switch' }],
          items: [
            { text: 'Search ki reindex job profile ko 3 guna traffic bhej rahi hai', bin: 'ration', explain: 'Seema lagao, band nahi.' },
            { text: 'Marketing campaign 20 lakh SMS ek minute mein bhejna chahti hai', bin: 'citizen', explain: 'Batching + outgoing rate.' },
            { text: 'Ek buggy caller galat data likh raha hai', bin: 'in', explain: 'Nuksaan — turant band.' },
            { text: 'Ratings-service hang, restaurant page intezaar kar raha', bin: 'out', explain: 'Call band, rating chhupao.' },
            { text: 'Analytics service ek saath 500 queries order-service ko', bin: 'ration', explain: 'Per-caller seema.' },
            { text: 'Payment retry job gateway ko bina backoff hammer kar raha', bin: 'citizen', explain: 'Khud ki retries sudhaaro.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Tolerance — quick check',
          questions: [
            {
              q: 'Outgoing kill switch aur circuit breaker mein farak?',
              choices: ['Breaker automatic (failures se), kill switch manual config se — dono dependency ko call band karke default dete hain', 'Koi farak nahi', 'Kill switch incoming ke liye', 'Breaker sirf DB ke liye'],
              answer: 0,
              explain: 'Automatic vs manual control.',
            },
            {
              q: 'Kill switch config se kyun, deploy se kyun nahi?',
              choices: ['Incident mein deploy dheema aur risky; config 1 second mein, turant wapas', 'Config sasta', 'Deploy allowed nahi', 'Koi wajah nahi'],
              answer: 0,
              explain: 'Speed + reversibility.',
            },
            {
              q: 'Default response chunne mein galti?',
              choices: ['Pricing dependency down par price 0 dikhana', 'Avatar down par default photo', 'Ratings down par ratings chhupana', 'Offers down par "offers abhi nahi"'],
              answer: 0,
              explain: 'Default aisa jo galat faisla na karwaaye.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — ration aur kill switches, bina restart',
          project: '08-standards',
          exercise: 'ex4-tolerance',
          goal: 'Buggy recommendation ke saath checkout dekho, ration lagao; phir avatar hang aur outgoing kill switch.',
          steps: [
            { text: 'Chalao aur callers.', cmd: 'npm start ex4-tolerance\nnpm run callers 4', expect: 'recommendation  200: ~740   p50 ~325 ms\ncheckout        200: ~44    p50 ~325 ms' },
            { text: 'Ration lagao (service chalti rahe).', cmd: 'npm run killswitch ration recommendation 50\nnpm run callers 4\nnpm run killswitch reset', expect: 'recommendation  200: 200  429: ~18000\ncheckout        200: ~81    p50 ~90 ms' },
            { text: 'Ctrl+C. Avatar hang.', cmd: 'AVATAR_DOWN=1 npm start ex4-tolerance\nnpm run callers 4', expect: 'recommendation  504/timeout ...\ncheckout        timeout ...' },
            { text: 'Outgoing kill switch.', cmd: 'npm run killswitch kill-out avatar\nnpm run callers 4\nnpm run killswitch reset', expect: 'recommendation  200: ~3700\ncheckout        200: ~130   p50 ~65 ms' },
          ],
          observe: {
            q: 'Ration lagane ke liye profile-service restart kyun nahi karni padi?',
            choices: [
              'kit/index.js config/tolerance.json har 1 second padhta hai; badla hua ration agli request se lagta hai',
              'Node khud reload karta hai',
              'killswitch tool ne service restart ki',
              'Ration client side laga',
            ],
            answer: 0,
            explain: 'setInterval(load, 1000) + ration middleware. Kill switch pehle se bana ho, tabhi incident mein kaam aata hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Fault tolerance',
        instructions: 'Resilience ke practical sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Ek internal caller tumhari service ko overload kar raha hai. Design?"',
            choices: [
              'Caller identity (mTLS/service token), per-caller quotas/rate limits with 429, bulkheads (alag pools), priority for critical callers, load shedding; incident ke liye config kill switch',
              'Service ke servers badhao',
              'Caller team ko email',
              'Global rate limit sab par',
            ],
            answer: 0,
            explain: 'Fair share + control.',
          },
          {
            q: 'Interviewer: "Dependency down hone par graceful degradation?"',
            choices: [
              'Timeouts, circuit breaker/outgoing kill switch, safe defaults ya cached data, feature flag se non-critical feature band, degraded state metrics mein',
              'Error lautao',
              'Retry jab tak na chale',
              'Dependency ke bina start hi mat karo',
            ],
            answer: 0,
            explain: 'Graceful, visible degradation.',
          },
          {
            q: 'Interviewer: "Good citizen client kaise banoge?"',
            choices: [
              'Client-side rate limiting/batching, exponential backoff + jitter, retry budgets, Retry-After ka respect, concurrency limits per dependency',
              'Jitni tez ho sake bhejo',
              'Kabhi retry nahi',
              'Sab async kar do',
            ],
            answer: 0,
            explain: 'Khud bhi kisi ka caller ho.',
          },
        ],
      },
      success: [
        'Main ration, good citizen, incoming aur outgoing kill switch mein farak bata sakta hoon',
        'Main incident mein sahi tolerance hathiyar chun sakta hoon',
        'Main safe default response design kar sakta hoon',
        'Main bata sakta hoon kill switch config-based kyun hona chahiye',
      ],
      homework: '<p>Apni ek service lo. Uske callers ki list banao aur har caller ka ration likho. Uski dependencies ki list banao aur har ek ke liye: critical ya nahi, timeout, default response. Runbook mein kill switch commands ka section jodo.</p>',
      cards: [
        { front: 'Ration?', back: '<b>Har caller ki alag seema</b> (429) — ek bura caller sab ko na dubaaye.' },
        { front: 'Good citizen?', back: 'Neeche wali services par <b>batching, rate limit, backoff</b>.' },
        { front: 'Incoming kill switch?', back: 'Ek caller ki calls <b>config se band</b> (403), bina deploy.' },
        { front: 'Outgoing kill switch?', back: 'Mari dependency ko call band, <b>default jawab</b> — manual circuit breaker.' },
      ],
    },
  ]);
})();
