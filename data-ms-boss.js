/* =====================================================================
   BOSS — Designing Microservices ka Mahayudh: KhanaKart Diwali Night
   Poori series (10 videos) ek saath: boundaries, timeouts, shared DB, sync/async,
   workflows, DB per service, composition, standards, team, BFF.
   Scenarios aur labs naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;

  function readyModel(k) {
    const checkout = 90 + (k.breaker ? 4 : 0) + (k.async ? 3 : 0) + (k.ration ? 2.5 : 0);
    const p99 = 2400 - (k.breaker ? 900 : 0) - (k.async ? 700 : 0) - (k.ration ? 400 : 0);
    const mobileMs = k.bff ? 270 : 560;
    const notifDelay = k.async ? 20 : 0;
    const drops = k.async ? 0 : 1100;
    return { checkout: Math.round(checkout * 10) / 10, p99, mobileMs, notifDelay, drops };
  }

  VISUALS['boss-microservices'] = {
    t: 'Diwali Night — poori series ek raat mein',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-accent"><span class="bx-label">🧩 Boundaries · 🔗 Coupling · ⏱️ Timeouts + retries</span></div>
      <div class="dg-box is-accent"><span class="bx-label">🗄️ Shared DB vs apna DB · 📨 Sync vs async · 🎼 Orchestration vs choreography</span></div>
      <div class="dg-box is-accent"><span class="bx-label">🧩 Composition + gateway · 📏 Standards + tolerance</span></div>
      <div class="dg-box is-accent"><span class="bx-label">🤝 Team faisle · 🎨 BFF</span></div>
    </div>
    <div class="dg-cap">Har decision ka "kab, kyun, aur kya keemat" — ek hi platform par.</div>`,
  };

  AB.registerLevels('microservices', [
    {
      id: 'boss-microservices',
      icon: '👑',
      title: 'BOSS — KhanaKart Diwali Night: Poora Platform Review',
      badge: 'Microservices Mahaguru',
      source: { video: 'nfkdKHcKxbE', title: 'Designing Microservices — poori series (10 videos)', at: 0 },
      hook: {
        when: 'KhanaKart · Diwali se 2 hafte pehle',
        title: 'CTO: "Pichhli Diwali 3 outages. Is baar ek bhi nahi."',
        text: 'Pichhli Diwali: tax-service hang se cascade, DIWALI coupon bug 70 minute tak nahi mila, aur notification surge mein orders gire. Is saal traffic 3 guna. Tumhe platform architecture review lead karna hai — har team ke decisions check karne hain, readiness lab chalana hai, aur Diwali ki raat ka incident drill karna hai. Poori series ka har sabak aaj kaam aayega.',
      },
      objectives: [
        '10 videos ke decisions ek platform par saath lagao',
        'Har decision ka trade-off aur keemat bolo',
        'Multi-failure incident mein sahi hathiyar chuno',
        'Architecture review mein chhupi galtiyaan pakdo',
      ],
      steps: [
        {
          q: 'Is review mein kya-kya dekhna hai?',
          points: [
            '<b>Boundaries aur coupling</b>: service ek kaam, contract se baat, shared code ka jaal nahi.',
            '<b>Timeouts, retries, idempotency</b>: har call par; retries mein backoff + key.',
            '<b>Data</b>: shared DB ke guardrails ya apna DB; cross-service transactions saga se.',
            '<b>Communication</b>: user ruka hai toh sync, baaki async; core orchestrate, side-effects choreograph.',
          ],
        },
        {
          q: 'Aur platform level par?',
          points: [
            '<b>Composition + gateway</b>: ek darwaaza, fan-out dependency se, memory aur partial responses ka dhyaan.',
            '<b>Standards</b>: good service scorecard, monitoring, interfaces, tolerance switches.',
            '<b>Team</b>: one-way door faisle data aur consensus se, tech debt budget, template reasons ke saath.',
            '<b>BFF</b>: clients alag hon tabhi, niyam shared.',
          ],
          asli: 'Koi decision "hamesha sahi" nahi. Har slot mein poochho: requirement kya hai, keemat kya hai, aur hum woh keemat chuka sakte hain?',
        },
      ],
      playbook: {
        title: 'microservices design review',
        use: [
          'Har service: owner, boundary, contract, runbook, scorecard',
          'Har call: timeout (budget), retries (backoff + idempotency), breaker + fallback',
          'Har data flow: owner DB, copies events se, transactions saga se',
          'Har client: gateway/BFF zaroorat ke hisaab se',
        ],
        avoid: [
          'Shared DB bina guardrails',
          'User-blocking kaam queue ke peeche, ya nice-to-have kaam sync chain mein',
          'Standard se bahar ki "andheri" services',
          'Ek hi pattern sab jagah',
        ],
        how: [
          'Critical user journey (checkout) ka naksha: har hop, latency, owner',
          'Har hop par 10 videos ki checklist',
          'Readiness lab: peak × 3 load test + failure drills',
          'Game day: kill switches aur runbooks ka abhyaas',
        ],
        redflags: [
          'Koi service jiska owner/runbook nahi',
          'Incident ki pehli khabar customer se',
          'Ek downstream hang se login tak band',
        ],
        rule: 'Har decision ka kab, kyun aur keemat — aur Diwali se pehle abhyaas.',
      },
      stages: [
        {
          type: 'design',
          title: '🏗️ Design canvas — KhanaKart ke 10 faisle',
          instructions: 'Har video ke ek faisle ke liye option chuno. Review mein har option ka "kyun" khulega.',
          brief: 'KhanaKart: food + Instamart. Diwali par 3× traffic. 40 teams, 3 SREs. Clients: web, app, Alexa.',
          requirements: ['Checkout ≥ 99.9%', 'Double charge bilkul nahi', 'Incident MTTR ≤ 15 minute', 'Mobile page 4G par tez'],
          slots: [
            {
              id: 'boundary', label: '1. Coupon logic', icon: '🧩',
              options: [
                { id: 'svc', label: 'coupon-service ka versioned API; order-service sirf call kare', score: 3, why: 'Ek owner, contract se baat, alag deploy.' },
                { id: 'lib', label: 'Shared pricing.js library har service mein copy', score: -2, why: 'Shared code ka jaal — ek badlaav, 6 deploys, alag versions alag daam.' },
              ],
            },
            {
              id: 'timeout', label: '2. Payment gateway call', icon: '⏱️',
              options: [
                { id: 'good', label: 'Timeout p99 ke hisaab se + 2 retries backoff + Idempotency-Key', score: 3, why: 'Hang se bachaav, retry safe, double charge nahi.' },
                { id: 'noKey', label: '5 retries bina idempotency key', score: -3, why: 'Retry storm aur double charge.' },
              ],
            },
            {
              id: 'db', label: '3. Analytics ko orders data', icon: '🗄️',
              options: [
                { id: 'replica', label: 'Read replica / warehouse, read-only user, statement timeout', score: 3, why: 'Shared data ke guardrails — checkout safe.' },
                { id: 'primary', label: 'Primary DB par admin user', score: -3, why: 'Diwali par report = checkout dheema; galti se DELETE bhi possible.' },
              ],
            },
            {
              id: 'notif', label: '4. "Order confirmed" push', icon: '📨',
              options: [
                { id: 'async', label: 'Async: event + workers + DLQ', score: 3, why: 'Surge absorb, order nahi girta.' },
                { id: 'sync', label: 'Sync call order ke andar', score: -3, why: 'Push provider down = order fail.' },
              ],
            },
            {
              id: 'flow', label: '5. Instamart: stock + rider + payment', icon: '🎼',
              options: [
                { id: 'saga', label: 'Orchestrated saga + compensations', score: 3, why: 'Sab-ya-kuch-nahi, kram aur undo ek jagah.' },
                { id: 'chain', label: 'Events ki lambi chain, undo har team apna', score: -1, why: 'Chal sakta, par debug aur undo bikhra — 10-minute SLA par risky.' },
              ],
            },
            {
              id: 'search', label: '6. Dish search', icon: '🔍',
              options: [
                { id: 'es', label: 'Elasticsearch, menu events se sync; checkout price menu-service se', score: 3, why: 'Sahi DB kaam ke liye; paisa source of truth se.' },
                { id: 'like', label: 'Menu Postgres par LIKE', score: -2, why: 'Full scan, typo par khaali, Diwali par menu DB dheema.' },
              ],
            },
            {
              id: 'gw', label: '7. Home feed composer', icon: '🚪',
              options: [
                { id: 'page', label: 'Pagination + streaming + alag gateway pool', score: 3, why: 'Memory seemit, login ki kismat alag.' },
                { id: 'all', label: '40 restaurants ke full menus ek response mein', score: -3, why: 'OOMKilled — aur gateway ke saath sab band.' },
              ],
            },
            {
              id: 'std', label: '8. Legacy pricing-service (free-text logs)', icon: '📏',
              options: [
                { id: 'kit', label: 'Diwali se pehle kit par: JSON logs, /metrics, traces, runbook', score: 3, why: 'Andhera kona band — MTTR goal.' },
                { id: 'later', label: 'Diwali ke baad dekhenge', score: -2, why: 'Incident mein blind spot.' },
              ],
            },
            {
              id: 'team', label: '9. Chat ko Cassandra → DynamoDB (2 hafte pehle)', icon: '🤝',
              options: [
                { id: 'wait', label: 'Diwali ke baad; abhi sirf contract tests + dual-write plan, seniors ka sign-off', score: 3, why: 'One-way door, freeze period mein nahi — data aur consensus ke saath.' },
                { id: 'now', label: 'Abhi cutover, team ne decide kar liya', score: -3, why: 'Diwali se pehle silo mein one-way door.' },
              ],
            },
            {
              id: 'bff', label: '10. Web + app + Alexa', icon: '🎨',
              options: [
                { id: 'bff', label: 'Per-client BFFs, niyam shared library mein', score: 3, why: 'Clients sach mein alag; drift nahi.' },
                { id: 'hack', label: '?platform= if-else core mein', score: -2, why: 'Core jungle, har tweak core deploy.' },
              ],
            },
          ],
          pass: 26,
          verdicts: {
            great: '🌟 Mahaguru review — har faisla requirement aur keemat ke saath.',
            ok: '👍 Achha — laal slots phir se padho, har ek pichhli Diwali ka incident ban sakta hai.',
            bad: '😅 Is design ke saath Diwali par war room pakka.',
          },
        },
        {
          type: 'flowlab',
          title: '🎛️ Readiness lab — Diwali × 3 load test',
          goal: 'Load test par checkout <b>≥ 99.5%</b>, checkout p99 <b>≤ 500 ms</b>, mobile page <b>≤ 300 ms</b>, aur <b>0 dropped</b> orders.',
          scenario: 'Load test ke dauraan inject: tax-service hang, recommendation bug (10× calls), push surge. Har knob ek series ka sabak.',
          knobs: [
            { id: 'breaker', label: 'Timeout budget + breaker (tax)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
            { id: 'async', label: 'Notifications async (broker)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'sync', 1: 'async' } },
            { id: 'ration', label: 'Per-caller ration (profile)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
            { id: 'bff', label: 'Mobile BFF', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'generic API', 1: 'BFF' } },
          ],
          nodes: [N('app', 120, 260), N('bff', 380, 260, { label: 'BFF / gateway' }), N('order', 640, 90, { label: 'checkout' }), N('coupon', 900, 90, { id: 'tax', icon: '🧮', label: 'tax' }), N('profile', 640, 430), N('broker', 900, 300, { label: 'push broker' })],
          edges: [{ from: 'app', to: 'bff' }, { from: 'bff', to: 'order' }, { from: 'order', to: 'tax' }, { from: 'bff', to: 'profile' }, { from: 'order', to: 'broker', dashed: true }],
          model: k => {
            const m = readyModel(k);
            const okC = m.checkout >= 99.5, okP = m.p99 <= 500, okM = m.mobileMs <= 300, okD = m.drops === 0;
            return {
              nodes: {
                app: { tone: okM ? 'ok' : 'slow', badge: `page ${m.mobileMs} ms` },
                bff: { tone: k.bff ? 'ok' : 'idle', badge: k.bff ? 'mobile BFF' : 'generic' },
                order: { tone: okC && okP ? 'ok' : 'bad', badge: `${m.checkout}% · p99 ${m.p99} ms` },
                tax: { tone: k.breaker ? 'slow' : 'bad', badge: k.breaker ? 'hang → breaker OPEN' : 'hang → threads full' },
                profile: { tone: k.ration ? 'ok' : 'bad', badge: k.ration ? 'rec rationed' : 'rec 10× hammer' },
                broker: { tone: k.async ? 'ok' : 'bad', badge: k.async ? `delay ~${m.notifDelay} s` : `${m.drops}/s drops` },
              },
              flows: [
                { from: 'app', to: 'bff', tone: 'acc' },
                { from: 'bff', to: 'order', tone: okC ? 'ok' : 'bad' },
                { from: 'order', to: 'tax', label: k.breaker ? 'fallback' : 'wait', tone: k.breaker ? 'ok' : 'bad' },
                { from: 'bff', to: 'profile', tone: k.ration ? 'ok' : 'bad' },
                { from: 'order', to: 'broker', label: k.async ? 'publish' : 'sync push', tone: k.async ? 'ok' : 'bad' },
              ],
              readouts: [
                { label: 'Checkout success', value: m.checkout + '%', tone: okC ? 'ok' : 'bad' },
                { label: 'Checkout p99', value: m.p99 + ' ms', tone: okP ? 'ok' : 'bad' },
                { label: 'Mobile page (4G)', value: m.mobileMs + ' ms', tone: okM ? 'ok' : 'bad' },
                { label: 'Dropped orders', value: m.drops + '/s', tone: okD ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Readiness', pct: [k.breaker, k.async, k.ration, k.bff].filter(Boolean).length * 25, text: `${[k.breaker, k.async, k.ration, k.bff].filter(Boolean).length}/4`, tone: okC && okP && okM && okD ? 'ok' : 'warn' }],
              verdict: okC && okP && okM && okD
                ? { ok: true, text: 'Diwali ready: breaker ne tax cascade roka, async ne surge sokha, ration ne bure caller ko seemit kiya, BFF ne mobile tez kiya.' }
                : { ok: false, text: [!k.breaker ? 'tax hang se cascade' : null, !k.async ? 'push surge se drops' : null, !k.ration ? 'recommendation hammer' : null, !k.bff ? 'mobile page bhaari' : null].filter(Boolean).join(' · ') + ' — sabak lagao.' },
            };
          },
          check: k => { const m = readyModel(k); return m.checkout >= 99.5 && m.p99 <= 500 && m.mobileMs <= 300 && m.drops === 0; },
          lesson: '✅ <b>Readiness lab pass.</b> Chaar alag videos ke sabak ek load test mein — har ek ne alag failure sambhala.',
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — Diwali 8 PM war room',
          goal: 'Ek raat, chaar gadbadiyaan. Har step par sahi hathiyar chuno.',
          nodes: [N('user', 120, 260, { label: 'on-call', icon: '🧑‍🚒' }), N('order', 450, 70, { label: 'checkout' }), N('coupon', 800, 70), N('coupon', 800, 250, { id: 'tax', icon: '🧮', label: 'tax' }), N('profile', 450, 450), N('search', 800, 440)],
          edges: [{ from: 'order', to: 'coupon' }, { from: 'order', to: 'tax' }, { from: 'user', to: 'order', dashed: true }, { from: 'user', to: 'profile', dashed: true }, { from: 'profile', to: 'search', dashed: true }],
          panels: [{ id: 'log', title: 'War room log' }, { id: 'tool', title: 'Hathiyar' }],
          steps: [
            {
              say: '<b>8:02</b> — Alert: checkout 5xx 9%. Dashboard: coupon-service 5xx 30%. Ek fail request ka trace → coupon span 500 → traceId se log: "DIWALI config missing field".',
              flows: [{ from: 'order', to: 'coupon', label: '500', tone: 'bad' }],
              nodes: { coupon: { tone: 'bad', badge: 'config bug' }, order: { tone: 'bad', badge: '5xx 9%' } },
              panels: { log: ['8:02 checkout 5xx', '8:05 wajah: coupon config'], tool: ['Alert → metrics → trace → logs'] },
              ask: {
                q: 'Fix deploy hone tak (10 min) checkout ko kaise bachaoge?',
                choices: ['Coupon call par fallback: coupon apply nahi hua — "coupon abhi kaam nahi kar raha" dikhao, order chalne do', 'Checkout band', 'Coupon ko 5 retries', 'Kuch nahi'],
                answer: 0,
                explain: 'Optional dependency ka graceful degradation — order revenue bachao.',
              },
            },
            {
              say: '<b>8:20</b> — Tax-service ka DB hang. Tax zinda par jawab nahi. Pricing threads bharne lage — par breaker 3 failures par OPEN, tax estimate 5% fallback. Gateway tak kuch nahi pahuncha.',
              flows: [{ from: 'order', to: 'tax', label: 'breaker OPEN', tone: 'slow' }],
              nodes: { tax: { tone: 'bad', badge: 'hang' }, order: { tone: 'ok', badge: 'estimate tax' } },
              panels: { log: ['8:20 tax hang', '8:20 breaker OPEN — cascade nahi'], tool: ['Timeout budget + circuit breaker'] },
            },
            {
              say: '<b>8:41</b> — Profile p99 3 s. "Requests by caller": recommendation 10× (naye deploy ka retry bug). Checkout address lookups atke.',
              flows: [{ from: 'user', to: 'profile', label: 'rec 10×', tone: 'bad' }],
              nodes: { profile: { tone: 'bad', badge: 'p99 3 s' } },
              panels: { log: ['8:41 profile slow — recommendation 10×'] },
              ask: {
                q: 'Sabse tez sahi kadam?',
                choices: ['Config se recommendation ka ration (50 req/s) — deploy nahi', 'Profile ke servers 10×', 'Recommendation deploy revert ka intezaar (30 min)', 'Checkout ko block'],
                answer: 0,
                explain: 'Tolerance switch pehle se bana tha — 1 second.',
              },
            },
            {
              say: '<b>9:10</b> — Support: "search mein Paneer Tikka ₹240, cart mein ₹260". Search index lag 90 s (menu events ka backlog, sab restaurants Diwali prices badal rahe).',
              flows: [{ from: 'profile', to: 'search', label: 'index lag 90 s', tone: 'slow' }],
              nodes: { search: { tone: 'slow', badge: 'purana price' } },
              panels: { log: ['9:10 search price purana'] },
              ask: {
                q: 'User ko galat charge hoga?',
                choices: ['Nahi — checkout price menu-service (source of truth) se leta hai aur "price update hua" dikhata hai; search consumers scale karo', 'Haan, ₹240 charge', 'Search band karo', 'Menu DB rollback'],
                answer: 0,
                explain: 'Eventual consistency ko design ne sambhala — faisla source of truth se.',
              },
            },
            {
              say: '<b>11:30</b> — Raat saaf. Postmortem draft: 4 gadbadiyaan, 0 outage. Action items: coupon config ka schema validation CI mein, recommendation retry fix, search consumer autoscaling on lag.',
              flows: [],
              nodes: { coupon: { tone: 'ok', badge: 'fixed' }, tax: { tone: 'ok', badge: 'recovered' }, profile: { tone: 'ok', badge: 'normal' }, search: { tone: 'ok', badge: 'lag 2 s' }, order: { tone: 'ok', badge: '99.8%' } },
              panels: { log: ['11:30 sab normal', 'Checkout Diwali: 99.8%'], tool: ['Postmortem + action items'] },
            },
          ],
          lesson: '<b>Asli baat:</b> Diwali ki raat gadbadiyaan aayengi hi. Series ke sabak unhe outage banne se rokte hain — pehle se bane tools, switches aur designs ke saath.',
        },
        {
          type: 'archdiff',
          title: '🕵️ Architecture review — 5 chhupi galtiyaan',
          brief: 'Instamart team ka Diwali architecture review ke liye aaya hai.',
          goal: 'Is design mein <b>5</b> galtiyaan hain (alag-alag videos ke sabak). Har galat box par click karo.',
          nodes: [
            { id: 'gw', label: '🚪 API gateway', sub: 'auth + rate limit + trace id', row: 0 },
            { id: 'bff', label: '🎨 mobile BFF', sub: '"₹199 free delivery" rule yahin likha', row: 0 },
            { id: 'order', label: '🧾 order-service', sub: 'SMS provider ko sync call, timeout 30 s', row: 1 },
            { id: 'pay', label: '💳 payment client', sub: 'Idempotency-Key + 2 retries backoff', row: 1 },
            { id: 'stock', label: '📦 stock reserve', sub: 'inventory DB mein reserve, rider fail par kuch nahi', row: 1 },
            { id: 'events', label: '📣 order_placed event', sub: 'traceId + versioned schema', row: 2 },
            { id: 'report', label: '📈 daily report', sub: 'orders primary DB par admin user se, 6 PM', row: 2 },
            { id: 'rider', label: '🛵 rider-location', sub: 'Redis geo, apna DB', row: 2 },
            { id: 'legacy', label: '🏷️ offers-service', sub: 'free-text logs, /metrics nahi, owner "?"', row: 3 },
          ],
          flaws: [
            { id: 'bff', why: 'Business rule BFF mein — web/voice BFF mein alag copy = drift. Rule shared library/pricing service mein.' },
            { id: 'order', why: 'Nice-to-have SMS user ki sync chain mein, aur 30 s timeout — provider down = orders fail aur threads full. Async + DLQ.' },
            { id: 'stock', why: 'Rider fail par stock reserved hi reh jaata hai — saga compensation (release) chahiye.' },
            { id: 'report', why: 'Diwali 6 PM primary par report + admin user — checkout dheema aur galti ka khatra. Replica/warehouse, read-only.' },
            { id: 'legacy', why: 'Standard se bahar ki service: incident mein andhera kona, koi owner nahi. Kit + runbook + owner.' },
          ],
          fine: {
            gw: 'Common concerns gateway par — sahi.',
            pay: 'Idempotency + backoff — double charge se bachaav.',
            events: 'Trace aur versioned schema — choreography ki observability.',
            rider: 'Kaam ke hisaab se DB, apni ownership.',
          },
          lesson: '<b>Asli baat:</b> galtiyaan aksar "chhoti" dikhti hain — ek rule ki copy, ek sync SMS, ek report. Diwali par yahi incidents bante hain.',
        },
        {
          type: 'quiz',
          title: 'Final exam — poori series',
          questions: [
            {
              q: 'Service boundary ka sabse achha sanket?',
              choices: ['Ek business capability, ek owner team, apna data, contract se baat', 'Har table ki ek service', 'Har developer ki ek service', 'Har endpoint ki ek service'],
              answer: 0,
              explain: 'Video 1.',
            },
            {
              q: 'Retry ke saath hamesha kya?',
              choices: ['Exponential backoff + jitter aur non-idempotent calls par idempotency key', 'Zyada retries', 'Retry turant', 'Timeout hatao'],
              answer: 0,
              explain: 'Video 2.',
            },
            {
              q: 'Shared DB kab theek?',
              choices: ['Chhoti team, stable schema, guardrails (per-service users, replicas, timeouts, views)', 'Hamesha', 'Kabhi nahi', 'Jab 20 teams hon'],
              answer: 0,
              explain: 'Video 3.',
            },
            {
              q: 'OTP kaise bhejein?',
              choices: ['Sync call + retry (user screen par ruka hai)', 'Queue ke peeche', 'Batch job', 'Email se'],
              answer: 0,
              explain: 'Videos 4-5.',
            },
            {
              q: 'Alag DBs ke paar "dono ya koi nahi" ka practical tareeka?',
              choices: ['Saga + compensations (reservation, release)', 'Ek bada shared DB', 'Retry jab tak chale', 'Manual fix'],
              answer: 0,
              explain: 'Video 6.',
            },
            {
              q: 'Composer ki memory kis par nirbhar?',
              choices: ['Ek saath requests × jodha hua response size', 'CPU cores', 'Services ki ginti sirf', 'Disk'],
              answer: 0,
              explain: 'Video 7.',
            },
            {
              q: 'Kill switch config se kyun?',
              choices: ['Incident mein 1 second, bina deploy aur turant wapas', 'Sasta', 'Security', 'Kyunki deploy allowed nahi'],
              answer: 0,
              explain: 'Video 8.',
            },
            {
              q: 'BFF ka trigger?',
              choices: ['Clients ki UI ya format bahut alag', 'Microservices hain', 'Team badi hai', 'Naya framework'],
              answer: 0,
              explain: 'Video 10.',
            },
          ],
        },
      ],
      interview: {
        title: 'Final Interview — Staff engineer loop',
        instructions: 'Poori series ke sawaal ek saath. 🎤',
        questions: [
          {
            q: 'Interviewer: "Food delivery platform ki checkout flow microservices mein design karo — reliability ke saath."',
            choices: [
              'Gateway/BFF → checkout orchestrator: payment (sync, idempotency, timeout budget, breaker), restaurant accept (sync), stock saga; order_placed event → notifications/loyalty/analytics (async, DLQ); har service apna DB; observability standard; tolerance switches; partial responses',
              'Ek monolith',
              'Sab sync, sab ek DB',
              'Sab async including payment',
            ],
            answer: 0,
            explain: 'Series ka nichod.',
          },
          {
            q: 'Interviewer: "Microservices kab NAHI?"',
            choices: [
              'Chhoti team, unclear boundaries, ops maturity kam (monitoring, CI/CD, on-call) — modular monolith se shuru, boundaries saaf hone par todo',
              'Kabhi nahi, hamesha microservices',
              'Jab traffic kam ho, bas',
              'Jab cloud na ho',
            ],
            answer: 0,
            explain: 'Keemat samajhna bhi design hai.',
          },
          {
            q: 'Interviewer: "Tumhare design ka sabse bada risk kya hai aur kaise monitor karoge?"',
            choices: [
              'Distributed failure modes (cascades, eventual consistency lag, drift) — SLO alerts, tracing, queue lag, consistency checks, game days',
              'Koi risk nahi',
              'Sirf cost',
              'Sirf security',
            ],
            answer: 0,
            explain: 'Senior jawab risk khud bolta hai.',
          },
        ],
      },
      success: [
        'Main poori series ke decisions ek platform par laga sakta hoon',
        'Main har decision ka trade-off aur keemat bata sakta hoon',
        'Main multi-failure incident mein sahi hathiyar chun sakta hoon',
        'Main architecture review mein chhupi galtiyaan pakad sakta hoon',
      ],
      homework: '<p>Apne product ki sabse important user journey (checkout/signup) lo. Har hop ke liye series ki 10-point checklist bharo: boundary, contract, timeout/retry, data ownership, sync/async, workflow pattern, composition, observability, tolerance, client shape. Top 3 risks aur unke fixes likho — yahi tumhara "Diwali readiness" plan hai.</p>',
      cards: [
        { front: 'Checkout reliability ke 5 hathiyar?', back: 'Timeout budget, <b>breaker + fallback</b>, idempotency, async side-effects, per-caller ration.' },
        { front: 'Incident chain?', back: 'Alert → metrics → trace → logs → switch/fallback → fix → postmortem.' },
        { front: 'Design review ka sawaal?', back: 'Requirement kya, <b>keemat kya</b>, hum chuka sakte hain?' },
      ],
    },
  ]);
})();
