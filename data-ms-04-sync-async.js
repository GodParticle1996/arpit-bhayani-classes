/* =====================================================================
   Video 4 — Microservices ke beech synchronous aur asynchronous communication
   Source concept: Arpit Bhayani — "Synchronous and Asynchronous Communication
   between Microservices" (youtube ewUw0sUxHI4)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'ewUw0sUxHI4', title: 'Synchronous and Asynchronous Communication between Microservices' };

  /* ---------------- models ---------------- */
  const HOPS = [
    { id: 'restaurant', ms: 300, up: 0.999 },
    { id: 'delivery', ms: 600, up: 0.998 },
    { id: 'coupon', ms: 150, up: 0.999, knob: 'coupon' },
    { id: 'notification', ms: 400, up: 0.99, knob: 'notif' },
    { id: 'loyalty', ms: 200, up: 0.995, knob: 'loyalty' },
  ];
  function chainModel(k) {
    let wait = 50, success = 1;
    const syncIds = [];
    HOPS.forEach(h => {
      const isAsync = h.knob && k[h.knob] === 1;
      if (!isAsync) { wait += h.ms; success *= h.up; syncIds.push(h.id); }
    });
    return { wait, success: success * 100, syncIds, couponAsync: k.coupon === 1 };
  }
  function cascadeModel(k) {
    const T = k.timeout === 1 ? 1 : 4;
    const rps = 30, pool = 50;
    let hold = 0.05, success = 100, fallback = false;
    if (k.taxDown === 1) {
      if (k.breaker === 1) { hold = 0.01; fallback = true; success = 100; }
      else { hold = T; success = 0; }
    }
    const busy = Math.round(rps * hold);
    const pricingSat = busy > pool;
    const orderBusy = pricingSat ? pool + Math.round((busy - pool) * 0.9) : Math.round(rps * (hold + 0.01));
    const orderSat = orderBusy > pool;
    const gwBusy = orderSat ? pool + 5 : Math.round(rps * (hold + 0.02));
    const gwSat = gwBusy > pool;
    const preOpenStuck = k.breaker === 1 && k.taxDown === 1 ? 3 * T : 0;
    return { T, busy, orderBusy, gwBusy, pricingSat, orderSat, gwSat, success, fallback, preOpenStuck, pool };
  }
  function surgeModel(k) {
    const rps = k.surge, c = k.consumers, async = k.mode === 1;
    const cap = c * 100;
    if (!async) {
      const dropped = Math.max(0, rps - cap);
      const p99 = rps <= cap ? 480 : Math.min(30000, Math.round(480 * rps / cap));
      return { async, cap, dropped, p99, delay: 0, backlog: 0 };
    }
    const backlog = Math.max(0, (rps - cap) * 60);
    const delay = backlog ? Math.round(backlog / cap) : 1;
    return { async, cap, dropped: 0, p99: 45, delay, backlog };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-sync-call'] = {
    t: 'Sync call — user poori chain ka intezaar karta hai',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">📱</span><span class="nl">app</span><span class="ns">⏳ blocked</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">order</span><span class="ns">⏳ blocked</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node"><span class="ni">🍳</span><span class="nl">restaurant</span><span class="ns">300 ms</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node"><span class="ni">🛵</span><span class="nl">delivery</span><span class="ns">600 ms</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node"><span class="ni">🔔</span><span class="nl">notification</span><span class="ns">400 ms</span></div>
    </div>
    <div class="dg-cap">User ka intezaar = saare hops ka jod. Ek hop gira = poora order gira.</div>`,
  };
  VISUALS['ms-sync-pain'] = {
    t: 'Cascading failure aur circuit breaker',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-bad"><span class="ni">🚪</span><span class="nl">gateway</span><span class="ns">threads full</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-bad"><span class="ni">🧾</span><span class="nl">order</span><span class="ns">threads full</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold"><span class="ni">💰</span><span class="nl">pricing</span><span class="ns">⚡ breaker</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-bad"><span class="ni">🧮</span><span class="nl">tax</span><span class="ns">💀 down</span></div>
    </div>
    <div class="dg-flow" style="margin-top:10px">
      <div class="dg-pill good">CLOSED: calls chalti hain</div>
      <div class="dg-pill bad">OPEN: call hi nahi, turant fallback</div>
      <div class="dg-pill gold">HALF-OPEN: ek trial call</div>
    </div>`,
  };
  VISUALS['ms-async'] = {
    t: 'Async — broker ek buffer hai',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">order</span><span class="ns">publish + ack</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold"><span class="ni">📨</span><span class="nl">broker</span><span class="ns">queue · retries · DLQ</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good"><span class="ni">🔔</span><span class="nl">notification workers</span><span class="ns">apni raftaar se</span></div>
    </div>
    <div class="dg-cap">User ko jawab publish ke ack par. Bhaari kaam baad mein — surge par queue lambi hoti hai, requests girti nahi.</div>`,
  };
  VISUALS['ms-sync-or-async'] = {
    t: 'Sync ya async — chaar sawaal',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-pill acc">🔗 Sync chuno jab</div>
        <div class="dg-box is-accent"><span class="bx-label">jawab ke bina aage nahi badh sakte</span></div>
        <div class="dg-box is-accent"><span class="bx-label">real-time chahiye (payment, OTP, chat)</span></div>
        <div class="dg-box is-accent"><span class="bx-label">kaam chhota aur tez hai</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-pill good">📨 Async chuno jab</div>
        <div class="dg-box is-good"><span class="bx-label">thodi der chalegi (notifications, reports)</span></div>
        <div class="dg-box is-good"><span class="bx-label">kaam lamba hai (minutes/ghante)</span></div>
        <div class="dg-box is-good"><span class="bx-label">ek event par kai services react karein</span></div>
        <div class="dg-box is-good"><span class="bx-label">fail hone par chupchaap retry chahiye</span></div>
      </div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Sync call ka safar
       ================================================================= */
    {
      id: 'ms-sync-call',
      icon: '🔗',
      title: 'Sync Call ka Safar — User Poori Chain ka Intezaar Karta Hai',
      badge: 'Chain Samajhne Wala',
      source: Object.assign({ at: 188 }, SRC),
      hook: {
        when: 'KhanaKart · Saturday lunch',
        title: 'Order button ke baad 1.7 second spinner — aur SMS service down hote hi orders fail',
        text: 'KhanaKart ka order-service "Place order" par ek ke baad ek restaurant, delivery, coupon, notification aur loyalty services ko call karta hai — sab ka jawab aane par hi user ko "Order placed" dikhta hai. Normal din mein spinner 1.7 second chalta hai. Saturday ko SMS provider down hua — notification-service jawab nahi de payi, aur orders fail hone lage. Khana, restaurant, rider — sab taiyaar the. Sirf ek SMS nahi gaya.',
      },
      objectives: [
        'Monolith mein function call vs microservices mein network call — kya-kya naya toot sakta hai',
        '<b>Synchronous communication</b> = blocking call; user ka intezaar saari chain ka jod',
        'Sync ke faayde: <b>real-time</b>, <b>simple</b>, aur "sab hua ya kuch nahi" jaisa pakkapan',
        'Chain se kaunse hops bahar nikaale ja sakte hain',
      ],
      steps: [
        {
          q: 'Monolith mein sab aasaan kyun tha?',
          body: 'Monolith mein "notification bhejo" ek <b>function call</b> hai — same process, same memory. Function call network par nahi jaata, isliye function call ka tez aur lagbhag pakka chalna tay hai.',
          example: 'Microservices mein wahi kaam network call hai. Network call mein naye khatre aate hain: network fail, notification-service down, notification-service overload, ya network partition (service zinda hai par pahunch nahi sakte).',
        },
        {
          q: 'Synchronous communication kya hai?',
          analogy: 'Bank ke counter par tum cheque dete ho aur <b>counter par hi khade rehte ho</b> jab tak cashier paisa na de. Tum beech mein kuch aur nahi kar sakte.',
          body: 'Service A, service B ko request bhejti hai aur <b>jawab aane tak ruki rehti hai</b> (blocking). Aam taur par HTTP par — REST, GraphQL ya gRPC — jo andar se TCP use karte hain.',
          example: 'User "Place order" → order-service → restaurant (300 ms) → delivery (600 ms) → coupon (150 ms) → notification (400 ms) → loyalty (200 ms) → phir user ko "Order placed". User ka intezaar ~1,700 ms.',
        },
        {
          q: 'Sync ke faayde kya hain?',
          points: [
            '<b>Real-time</b> — jawab turant, "abhi" ka.',
            '<b>Simple aur samajhne mein aasaan</b> — call karo, jawab lo, code seedha padhta hai.',
            '<b>Pakkapan</b> — "order placed" tabhi dikha jab har step ho gaya.',
          ],
          asli: 'Pakkapan ki keemat: har step ka fail hona poore kaam ka fail hona hai. Isliye sochna padta hai kaunsa step sach mein "jawab ke bina aage nahi badh sakte" wala hai.',
        },
        {
          q: 'Chain mein latency aur failure kaise judte hain?',
          body: '<table><tr><th>Hop</th><th>Latency</th><th>Theek chalne ka chance</th></tr>' +
            '<tr><td>restaurant</td><td>300 ms</td><td>99.9%</td></tr><tr><td>delivery</td><td>600 ms</td><td>99.8%</td></tr>' +
            '<tr><td>coupon</td><td>150 ms</td><td>99.9%</td></tr><tr><td>notification</td><td>400 ms</td><td>99.0%</td></tr>' +
            '<tr><td>loyalty</td><td>200 ms</td><td>99.5%</td></tr>' +
            '<tr><td><b>Kul (sab sync)</b></td><td><b>~1,700 ms</b></td><td><b>~98.1%</b></td></tr></table>',
          asli: 'Latency <b>jud-ti</b> hai, success <b>multiply</b> hota hai. Har 100 orders mein ~2 fail — aur sabse kamzor hop (notification, 99%) sabse zyada nuksaan karta hai.',
        },
        {
          q: 'Toh kaunsa hop chain se bahar ja sakta hai?',
          body: 'Har hop se poochho: <b>"kya order place karne ke liye is jawab ka intezaar zaroori hai?"</b>',
          points: [
            'Restaurant accept — haan, zaroori (restaurant band ho toh order hi nahi).',
            'Coupon — haan, zaroori (discount se final price badalta hai).',
            'SMS/notification — nahi (thodi der se bhi chalega).',
            'Loyalty points — nahi (points baad mein judein toh koi farak nahi).',
          ],
          asli: 'Agla level sync ke dard gina-yega. Us level ke baad async level batayega ki "baad mein" wale hops ko kaise bheja jaata hai.',
        },
      ],
      myth: [
        { myth: 'Sync matlab purana tareeka, async matlab modern — sab async karo.', sach: 'Payment, OTP, restaurant accept jaise kaam jawab ke bina aage nahi badh sakte — wahan sync hi sahi hai. Faisla kaam se hota hai, fashion se nahi.' },
        { myth: 'Har service 99%+ reliable hai, toh chain bhi 99%+.', sach: 'Success multiply hota hai. Paanch 99%-ish hops = ~98%. Hop jitne zyada, chain utni kamzor.' },
      ],
      playbook: {
        title: 'sync call',
        use: [
          'Jawab ke bina aage nahi badh sakte (restaurant accept, stock check)',
          'Real-time zaroorat (payment confirm, OTP, chat)',
          'Kaam chhota aur tez (kuch milliseconds)',
        ],
        avoid: [
          '"Nice to have" kaam user ke main flow ki chain mein (SMS, loyalty points)',
          'Minutes/ghanton ka kaam (report, onboarding verification) HTTP request mein',
          'Lambi chains bina timeout ke',
        ],
        how: [
          'User flow ka har hop likho: latency, reliability, "zaroori hai?"',
          'Zaroori na ho toh hop ko async bhejo (agla levels)',
          'Bache hue sync hops par timeout + retry policy',
          'Kul latency aur success ka hisaab dashboard par',
        ],
        redflags: [
          'User ka spinner downstream hops ki ginti ke saath badhta hai',
          'Kisi "chhoti" service (SMS) ke down hone se main flow fail',
          'Ek request 5+ sync hops',
        ],
        rule: 'Sync tabhi jab jawab ke bina aage nahi badh sakte — baaki sab chain se bahar.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — "Place order" ke andar blocking chain',
          goal: 'Har step par dekho user kis cheez ka intezaar kar raha hai — aur SMS down hone par kya hota hai.',
          nodes: [
            N('app', 110, 250), N('order', 360, 250),
            N('restaurant', 660, 70), N('delivery', 850, 200), N('coupon', 850, 330), N('notification', 640, 440),
          ],
          edges: [{ from: 'app', to: 'order' }, { from: 'order', to: 'restaurant' }, { from: 'order', to: 'delivery' }, { from: 'order', to: 'coupon' }, { from: 'order', to: 'notification' }],
          panels: [{ id: 'user', title: 'User ki screen' }, { id: 'clock', title: 'Intezaar ka hisaab' }],
          steps: [
            {
              clock: '0 ms',
              say: 'User "Place order" dabaata hai. App order-service ko request bhejta hai aur <b>spinner</b> dikhata hai. App ab order-service ke jawab ka intezaar karega.',
              flows: [{ from: 'app', to: 'order', label: 'POST /orders', tone: 'acc' }],
              nodes: { app: { tone: 'busy', badge: '⏳ spinner' }, order: { tone: 'acc' } },
              panels: { user: ['⏳ Placing your order...'], clock: ['0 ms'] },
            },
            {
              clock: '300 ms',
              say: 'order-service restaurant-service ko call karti hai: "order accept?" Restaurant ka jawab 300 ms mein aata hai. Tab tak order-service ruki rehti hai — aur app bhi.',
              flows: [{ from: 'order', to: 'restaurant', label: 'accept? (300 ms)', tone: 'ok' }],
              nodes: { order: { tone: 'busy', badge: 'restaurant ka intezaar' }, restaurant: { tone: 'ok', badge: 'accepted' } },
              panels: { clock: ['restaurant 300 ms', 'kul: 300 ms'] },
            },
            {
              clock: '1,050 ms',
              say: 'Phir delivery-service (rider assign, 600 ms), phir coupon-service (discount check, 150 ms). Har call ke dauraan order-service ek thread pakde baithi hai.',
              flows: [{ from: 'order', to: 'delivery', label: 'rider (600 ms)', tone: 'ok' }, { from: 'order', to: 'coupon', label: 'KHANA50 (150 ms)', tone: 'ok' }],
              nodes: { delivery: { tone: 'ok', badge: 'rider Ramesh' }, coupon: { tone: 'ok', badge: '-₹50' } },
              panels: { clock: ['restaurant 300 ms', 'delivery 600 ms', 'coupon 150 ms', 'kul: 1,050 ms'] },
              ask: {
                q: 'Is waqt tak user kitni der se spinner dekh raha hai?',
                choices: ['~1,050 ms — har sync hop ka jod', '150 ms — sirf aakhri hop', '600 ms — sabse lamba hop', '0 ms — calls background mein hain'],
                answer: 0,
                explain: 'Blocking chain mein latency jud-ti hai: 300 + 600 + 150.',
              },
            },
            {
              clock: '1,450 ms',
              say: 'Aakhir mein notification-service: "Order confirmed" SMS (400 ms). Sab ho gaya → order-service app ko jawab bhejti hai. User ne <b>~1.5 second</b> intezaar kiya.',
              flows: [{ from: 'order', to: 'notification', label: 'SMS (400 ms)', tone: 'ok' }, { from: 'order', to: 'app', label: 'Order placed ✅', tone: 'ok', back: true }],
              nodes: { notification: { tone: 'ok', badge: 'SMS sent' }, order: { tone: 'ok', badge: 'done' }, app: { tone: 'ok', badge: 'Order placed' } },
              panels: { user: ['✅ Order placed!'], clock: ['kul: 1,450 ms (+ network ~50)'] },
            },
            {
              clock: 'Saturday 1:10 PM',
              say: 'SMS provider down. notification-service jawab nahi deti. order-service 3 second timeout tak rukti hai, phir <b>poora order fail</b> — jabki restaurant ne accept kiya, rider assign hua, coupon laga.',
              flows: [{ from: 'order', to: 'notification', label: 'SMS... timeout 3 s', tone: 'bad' }, { from: 'order', to: 'app', label: 'Order failed ❌', tone: 'bad', back: true }],
              nodes: { notification: { tone: 'bad', badge: 'SMS provider down' }, order: { tone: 'bad', badge: 'FAILED' }, app: { tone: 'bad', badge: 'Order failed' } },
              panels: { user: ['❌ Order failed, try again'], clock: ['1,050 ms + 3,000 ms timeout', 'kul: ~4 s aur phir bhi fail'] },
              ask: {
                q: 'Is failure ka sabse seedha design fix kya hai?',
                choices: [
                  'Notification ko sync chain se nikaalo — order place ho, SMS baad mein bheja jaaye',
                  'Timeout 3 s se 30 s karo',
                  'SMS provider ko dobara call karte raho jab tak jawab na aaye',
                  'Restaurant accept ko async kar do',
                ],
                answer: 0,
                explain: 'Order place karne ke liye SMS ka intezaar zaroori nahi. "Nice to have" hop chain mein ho toh uska down hona main kaam gira deta hai.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> sync chain mein user har hop ka intezaar karta hai, aur sabse kamzor hop poore kaam ki kismat tay karta hai. Pehla sawaal hamesha: yeh hop chain mein zaroori hai?',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — chain chhoti karo',
          goal: 'Order flow ka user wait <b>≤ 1,200 ms</b> aur success <b>≥ 99.5%</b> karo — par coupon ko sync hi rakhna hai (coupon se price badalta hai).',
          scenario: 'Chain: restaurant (300 ms, 99.9%) → delivery (600 ms, 99.8%) → coupon (150 ms, 99.9%) → notification (400 ms, 99.0%) → loyalty (200 ms, 99.5%). Jo hop async karoge woh chain se nikal jaayega.',
          knobs: [
            { id: 'notif', label: 'Notification (SMS)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'sync (chain mein)', 1: 'async (baad mein)' } },
            { id: 'loyalty', label: 'Loyalty points', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'sync', 1: 'async' } },
            { id: 'coupon', label: 'Coupon validation', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'sync', 1: 'async (?)' } },
          ],
          nodes: [
            N('app', 110, 250), N('order', 360, 250),
            N('restaurant', 640, 60), N('delivery', 830, 170), N('coupon', 830, 330), N('notification', 640, 450), N('coupon', 330, 450, { id: 'loyalty', icon: '🏅', label: 'loyalty' }),
          ],
          edges: [{ from: 'app', to: 'order' }, { from: 'order', to: 'restaurant' }, { from: 'order', to: 'delivery' }, { from: 'order', to: 'coupon' }, { from: 'order', to: 'notification' }, { from: 'order', to: 'loyalty' }],
          model: k => {
            const m = chainModel(k);
            const okWait = m.wait <= 1200, okSucc = m.success >= 99.5;
            const nodes = {};
            HOPS.forEach(h => {
              const sync = m.syncIds.includes(h.id);
              nodes[h.id] = { tone: sync ? 'acc' : 'ok', badge: sync ? `sync ${h.ms} ms` : 'async ✉️' };
            });
            if (m.couponAsync) nodes.coupon = { tone: 'bad', badge: '⚠️ price galat' };
            nodes.app = { tone: okWait && okSucc ? 'ok' : 'slow', badge: `wait ${m.wait} ms` };
            return {
              nodes,
              flows: HOPS.map(h => ({ from: 'order', to: h.id, tone: m.syncIds.includes(h.id) ? 'acc' : 'ok', rate: m.syncIds.includes(h.id) ? 0.7 : 0.2 }))
                .concat([{ from: 'app', to: 'order', label: `${m.success.toFixed(2)}% success`, tone: okSucc ? 'ok' : 'bad', rate: 0.6 }]),
              readouts: [
                { label: 'User ka intezaar', value: m.wait + ' ms', tone: okWait ? 'ok' : 'bad' },
                { label: 'Order success', value: m.success.toFixed(2) + '%', tone: okSucc ? 'ok' : 'bad' },
                { label: 'Sync hops', value: String(m.syncIds.length), tone: m.syncIds.length <= 3 ? 'ok' : 'warn' },
              ],
              bars: [
                { label: 'Wait', pct: Math.min(100, m.wait / 20), text: m.wait + ' ms', tone: okWait ? 'ok' : 'bad' },
                { label: 'Failed orders / 1000', pct: Math.min(100, (100 - m.success) * 5), text: String(Math.round((100 - m.success) * 10)), tone: okSucc ? 'ok' : 'bad' },
              ],
              verdict: m.couponAsync
                ? { ok: false, text: 'Coupon async hua toh user ne jo price dekha, payment ke baad badal sakta hai. Coupon ka jawab ke bina aage nahi badh sakte — sync rakho.' }
                : okWait && okSucc
                  ? { ok: true, text: `Sirf zaroori hops sync (${m.syncIds.join(', ')}). ${m.wait} ms, ${m.success.toFixed(2)}%.` }
                  : { ok: false, text: !okSucc ? `Success ${m.success.toFixed(2)}% — kamzor, "nice to have" hops abhi bhi chain mein hain.` : `Wait ${m.wait} ms — chain abhi lambi hai.` },
            };
          },
          check: k => { const m = chainModel(k); return !m.couponAsync && m.wait <= 1200 && m.success >= 99.5; },
          lesson: '✅ <b>Chain chhoti hui.</b> Notification aur loyalty "baad mein" ho sakte hain — chain se bahar karte hi wait aur failure dono kam. Coupon aur restaurant accept "jawab ke bina aage nahi badh sakte" wale hain.',
          quiz: {
            q: 'Delivery (rider assign, 600 ms) bhi async ho sakta hai?',
            choices: [
              'Ho sakta hai — order "placed" dikhao aur rider baad mein assign karo, app mein "rider dhoondh rahe hain" status; product decision hai, par sabse bada latency hop chain se nikal jaata hai',
              'Kabhi nahi, rider ke bina order illegal hai',
              'Haan, aur restaurant accept bhi async karo bina soche',
              'Delivery ko sync hi rehna chahiye kyunki 600 ms kam hai',
            ],
            answer: 0,
            explain: 'Kai delivery apps rider baad mein assign karti hain. "Zaroori hai?" ka jawab product se aata hai — technology se nahi.',
          },
        },
        {
          type: 'quiz',
          title: 'Sync call — quick check',
          questions: [
            {
              q: 'Monolith ka function call aur microservice ka HTTP call — sabse bada farak?',
              choices: ['HTTP call network par jaata hai — fail, slow, ya pahunch se bahar ho sakta hai', 'HTTP call hamesha tez hota hai', 'Function call async hota hai', 'Koi farak nahi'],
              answer: 0,
              explain: 'Network ke saare naye failure modes — isliye timeout, retries, fallback ki zaroorat.',
            },
            {
              q: 'Chain: 200 ms + 300 ms + 100 ms (sab sync). User ka intezaar lagbhag?',
              choices: ['~600 ms', '~300 ms', '~200 ms', '~100 ms'],
              answer: 0,
              explain: 'Blocking chain mein latency jud-ti hai.',
            },
            {
              q: 'Teen hops, har ek 99% reliable. Chain ka success?',
              choices: ['~97%', '99%', '~99.9%', '~90%'],
              answer: 0,
              explain: '0.99 × 0.99 × 0.99 ≈ 0.970.',
            },
            {
              q: 'KhanaKart mein kaunsa kaam sync chain mein rehna chahiye?',
              choices: ['Payment gateway se "paisa kata?" confirm', '"Order placed" SMS', 'Loyalty points jodna', 'Analytics event'],
              answer: 0,
              explain: 'Payment confirm ke bina order aage nahi badh sakta. Baaki teeno baad mein ho sakte hain.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — sync chain ka intezaar aur ek dead hop',
          project: '04-sync-async',
          exercise: 'ex1-sync-chain',
          goal: 'Order place karo aur har hop ka time dekho. Phir notification ko hang karke order fail hote dekho.',
          steps: [
            { text: 'Install karo aur chain chalao.', cmd: 'cd arpitbhayaniclasses/docker-labs/04-sync-async\nnpm install\nnpm start ex1-sync-chain' },
            { text: 'Order place karo.', cmd: 'curl -X POST localhost:4601/orders', expect: '{"status":"placed","userWaitedMs":~1400,"steps":["restaurant ~300ms","delivery ~600ms","notification ~400ms"]}' },
            { text: 'Ctrl+C. Notification ko hang karke chalao aur dobara order karo.', cmd: 'NOTIF_DOWN=1 npm start ex1-sync-chain\ncurl -X POST localhost:4601/orders', expect: '{"status":"FAILED","reason":"timeout after 3000 ms","userWaitedMs":~3900,"stepsDone":["restaurant ...","delivery ..."]}' },
          ],
          observe: {
            q: 'NOTIF_DOWN=1 wale order mein stepsDone mein kya tha aur result kya aaya?',
            choices: [
              'Restaurant aur delivery ho chuke the, phir bhi order FAILED — sirf notification ki wajah se',
              'Kuch step nahi hua',
              'Order placed aa gaya',
              'Sirf restaurant hua',
            ],
            answer: 0,
            explain: 'services/order-sync.js teeno ko sync await karti hai. Notification chain mein hai, isliye notification ka timeout poore order ka fail hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Sync communication',
        instructions: 'Communication patterns ka pehla sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Synchronous communication kya hai aur kab use karoge?"',
            choices: [
              'Caller jawab aane tak block rehta hai (REST/gRPC over HTTP/TCP); jab jawab ke bina aage nahi badh sakte, real-time chahiye, ya kaam chhota-tez hai',
              'Jab do services same time zone mein hon',
              'Jab data bahut bada ho',
              'Hamesha, kyunki simple hai',
            ],
            answer: 0,
            explain: 'Definition + teen use-cases = poora jawab.',
          },
          {
            q: 'Interviewer: "Checkout flow ka p99 2 second hai. Kahan se shuru karoge?"',
            choices: [
              'Trace se har sync hop ki latency dekhunga, phir poochhunga kaunse hops ke jawab ke bina aage badh sakte hain — unhe async/parallel karunga',
              'Sab services ke servers double',
              'Frontend par loading animation badal dunga',
              'Database index lagaunga, bina dekhe',
            ],
            answer: 0,
            explain: 'Measure → classify (zaroori/nahi) → chain chhoti.',
          },
          {
            q: 'Interviewer: "Chain ka reliability kaise nikaaloge?"',
            choices: ['Har sync hop ki success probability multiply karke', 'Sabse achhi service ki reliability', 'Average le kar', 'Sabse kharab service ki reliability'],
            answer: 0,
            explain: 'Series mein judi cheezon ka success multiply hota hai.',
          },
        ],
      },
      success: [
        'Main blocking sync call ko sequence ke saath samjha sakta hoon',
        'Main chain ki kul latency aur success nikaal sakta hoon',
        'Main pehchaan sakta hoon kaunse hops chain mein zaroori hain',
        'Main sync ke faayde (real-time, simple, pakka) bata sakta hoon',
      ],
      homework: '<p>Apne app ka sabse important user action (jaise checkout) lo aur trace/log se har sync hop ki latency likho. Har hop ke aage "zaroori / baad mein chalega" likho. "Baad mein" wale hops hata do toh p99 kitna girega — hisaab lagao.</p>',
      cards: [
        { front: 'Synchronous call?', back: 'Caller <b>jawab aane tak block</b>. REST/GraphQL/gRPC over HTTP over TCP.' },
        { front: 'Sync chain ki latency aur success?', back: 'Latency <b>jud-ti</b> hai, success <b>multiply</b> hota hai (0.99³ ≈ 97%).' },
        { front: 'Sync ke 3 faayde?', back: '<b>Real-time</b>, <b>simple</b>, aur pakkapan (sab hua tabhi success).' },
        { front: 'Kaunsa hop chain mein rahe?', back: 'Jiske <b>jawab ke bina aage nahi badh sakte</b> — restaurant accept, coupon price, payment confirm.' },
      ],
    },

    /* =================================================================
       LEVEL: Sync ke dard
       ================================================================= */
    {
      id: 'ms-sync-pain',
      icon: '⚡',
      title: 'Sync ke Dard — Peak Capacity, Cascading Failure, Circuit Breaker',
      badge: 'Breaker Bhairav',
      source: Object.assign({ at: 553 }, SRC),
      hook: {
        when: 'KhanaKart · Diwali · 8:30 PM',
        title: 'Tax service mari, aur gateway tak sab doob gaye',
        text: 'Checkout chain: gateway → order → pricing → tax. Diwali ki raat tax-service ka database hang hua. Tax-service jawab nahi de rahi thi — par zinda thi, isliye pricing-service har request par 4 second intezaar kar rahi thi. Pricing ke threads bhare, phir order ke, phir gateway ke. 10 minute mein KhanaKart app par <b>login bhi nahi</b> ho raha tha — kyunki gateway ke saare threads tax ka intezaar kar rahe the.',
      },
      objectives: [
        'Dard 1: <b>caller block</b> rehta hai — intezaar har level par jud-ta hai',
        'Dard 2: callee ko <b>peak ke liye pehle se</b> scale karna padta hai',
        'Dard 3: <b>cascading failure</b> — ek service ka hang poori chain girata hai; <b>circuit breaker</b> se bachaav',
        'Dard 4: <b>strong coupling</b> — contract change, versioning, planned downtime',
      ],
      steps: [
        {
          q: 'Caller block rehne ka dard kya hai?',
          body: 'Sync call mein caller ka thread jawab tak ruka rehta hai. Callee 50 ms se 2 second ho gayi → caller ka har thread 2 second ruka → caller ka user bhi. Lambi chain mein har level ka intezaar user tak jud-ta hai, aur kahin na kahin network timeout lag jaata hai.',
        },
        {
          q: 'Peak ke liye pehle se scale kyun karna padta hai?',
          analogy: 'Shaadi mein agar khana counter par hi turant banega (sync), toh 500 mehmaanon ke liye 500 ke hisaab se cook pehle se chahiye. Agar khana pehle ban ke buffet mein rakh diya (async), toh cook apni raftaar se bana sakte hain.',
          body: 'Sync mein notification-service ke paas <b>har pal</b> utni capacity chahiye jitni requests aa rahi hain. IPL final ke toss par 10 second mein 50,000 orders → notification-service ke paas 50,000 ki capacity nahi → requests drop, latency spike, database overload.',
          asli: 'Sync = callee ko <b>peak</b> ke liye size karo (average ke liye nahi). Peak rare hai, bill roz ka.',
        },
        {
          q: 'Cascading failure kaise hota hai?',
          body: 'Chain A → B → C → D. D hang (zinda par jawab nahi). C ka har call D ke timeout tak rukta hai → C ke threads bhar jaate hain → C slow → B ke threads C ka intezaar karte hain → B bhar jaata hai → A. Aane wala traffic kam nahi hota, isliye har level doob-ta hai.',
          example: 'Pricing ke 50 threads, 30 requests/second, har request tax ke liye 4 s ruki → 120 threads chahiye → pricing full → order full → gateway full → login, menu, sab band.',
          asli: '"Dead" service se khatarnak "hang" service hai. Dead service turant connection refuse karti hai; hang service caller ke threads chura leti hai.',
        },
        {
          q: 'Circuit breaker kaise bachata hai?',
          analogy: 'Ghar ka MCB (circuit breaker): short circuit hua toh MCB trip ho jaata hai aur current rok deta hai — taaki poora ghar na jale. Thodi der baad tum MCB phir on karke check karte ho.',
          body: '<table><tr><th>State</th><th>Kya hota hai</th></tr>' +
            '<tr><td><b>CLOSED</b></td><td>Normal — calls tax tak jaati hain. Failures gine jaate hain.</td></tr>' +
            '<tr><td><b>OPEN</b></td><td>Lagataar failures (jaise 3) ke baad — tax ko call hi nahi, <b>turant fallback</b> (jaise "tax estimate 5%").</td></tr>' +
            '<tr><td><b>HALF-OPEN</b></td><td>Kuch der (jaise 10 s) baad ek trial call. Chali toh CLOSED, fail toh phir OPEN.</td></tr></table>',
          asli: 'Breaker khulte hi pricing ke threads 4 s ki jagah ~10 ms mein free. Cascade wahin ruk jaata hai.',
        },
        {
          q: 'Strong coupling ka dard kya hai?',
          body: 'Sync mein A, B ke contract aur uptime se bandha hai: B ne response shape badla → A tootega (isliye versioning, backward compatibility). B ka planned downtime (DB upgrade) → A ko pata hona chahiye aur A bhi degraded. Yeh Level "Loose Coupling" ka dard hai — sync call usse aur tez karta hai.',
        },
      ],
      myth: [
        { myth: 'Timeout laga diya toh cascade nahi hoga.', sach: 'Timeout nuksaan ko seemit karta hai (4 s → 1 s), par har request abhi bhi 1 s thread pakadti hai aur fail hoti hai. Breaker hang service ko call karna hi band karta hai aur fallback deta hai.' },
        { myth: 'Circuit breaker hamesha OPEN rahe toh safe hai.', sach: 'OPEN mein asli data nahi milta (sirf fallback). HALF-OPEN trial se breaker dependency ke theek hote hi wapas normal par aata hai.' },
      ],
      playbook: {
        title: 'sync ke dard se bachaav',
        use: [
          'Har sync dependency par circuit breaker + fallback',
          'Timeout budget: chain mein neeche jaate hue timeout chhote (gateway 8 s > order 7 s > tax call 1 s)',
          'Critical path ke callees ka peak capacity plan / autoscaling',
        ],
        avoid: [
          'Upar aur neeche sab jagah same timeout (upar wala pehle haar maan leta hai)',
          'Hang dependency ko baar-baar call karna',
          'Breaker jiska koi fallback nahi (OPEN = seedha error)',
        ],
        how: [
          'Breaker config: failure threshold (jaise 50% ya 3 lagataar), open window (10-30 s), half-open trials',
          'Fallback tay karo: default, cache, estimate, ya "feature abhi band" message',
          'Thread/connection pool per dependency (bulkhead) — ek dependency sab threads na khaaye',
          'Breaker state ko metrics/alerts mein daalo',
        ],
        redflags: [
          'Ek downstream incident ke saath upstream services ke thread pools full',
          'CPU kam, latency bahut zyada, sab services "slow"',
          'Login jaise unrelated features bhi down',
        ],
        rule: 'Hang dependency ko call karte rehna apne threads daan karna hai — breaker lagao, fallback do.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — cascade roko',
          goal: 'Tax service ko <b>down</b> karo. Phir gateway, order aur pricing — teeno ke thread pools <b>50 se kam</b> rakho aur users ko <b>99%+ jawab</b> (fallback samet) do.',
          scenario: 'Chain: gateway → order → pricing → tax. Har service ke 50 threads. 30 requests/second. Tax ka normal jawab 50 ms.',
          knobs: [
            { id: 'taxDown', label: 'Tax service', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'healthy', 1: '💀 hang (jawab nahi)' } },
            { id: 'timeout', label: 'Pricing → tax timeout', min: 0, max: 1, step: 1, value: 0, labels: { 0: '4 s', 1: '1 s' } },
            { id: 'breaker', label: 'Circuit breaker (pricing mein)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on + fallback' } },
          ],
          nodes: [N('gateway', 120, 250), N('order', 380, 250), N('coupon', 640, 250, { id: 'pricing', icon: '💰', label: 'pricing' }), N('coupon', 880, 250, { id: 'tax', icon: '🧮', label: 'tax' })],
          edges: [{ from: 'gateway', to: 'order' }, { from: 'order', to: 'pricing' }, { from: 'pricing', to: 'tax' }],
          model: k => {
            const m = cascadeModel(k);
            const tone = sat => sat ? 'bad' : 'ok';
            const allOk = !m.pricingSat && !m.orderSat && !m.gwSat;
            return {
              nodes: {
                tax: { tone: k.taxDown ? 'bad' : 'ok', badge: k.taxDown ? '💀 hang' : '50 ms' },
                pricing: { tone: tone(m.pricingSat), badge: `threads ${Math.min(m.busy, 999)}/50${k.breaker && k.taxDown ? ' · OPEN' : ''}` },
                order: { tone: tone(m.orderSat), badge: `threads ${Math.min(m.orderBusy, 999)}/50` },
                gateway: { tone: tone(m.gwSat), badge: `threads ${Math.min(m.gwBusy, 999)}/50` },
              },
              flows: [
                { from: 'gateway', to: 'order', tone: tone(m.gwSat || m.orderSat), rate: 0.6 },
                { from: 'order', to: 'pricing', tone: tone(m.orderSat || m.pricingSat), rate: 0.6 },
                { from: 'pricing', to: 'tax', label: k.taxDown ? (k.breaker ? 'breaker OPEN — call nahi' : `wait ${m.T} s`) : '50 ms', tone: k.taxDown ? (k.breaker ? 'ok' : 'bad') : 'ok', rate: k.taxDown && k.breaker ? 0.1 : 0.6 },
              ],
              readouts: [
                { label: 'Gateway threads', value: `${Math.min(m.gwBusy, 999)} / 50`, tone: m.gwSat ? 'bad' : 'ok' },
                { label: 'Pricing threads', value: `${Math.min(m.busy, 999)} / 50`, tone: m.pricingSat ? 'bad' : 'ok' },
                { label: 'Users ko jawab mila', value: m.success + '%' + (m.fallback ? ' (tax estimate)' : ''), tone: m.success >= 99 ? 'ok' : 'bad' },
                { label: 'Breaker khulne se pehle ka nuksaan', value: m.preOpenStuck ? `~${m.preOpenStuck} s tak 3 requests phansi` : '—', tone: m.preOpenStuck > 6 ? 'warn' : 'ok' },
              ],
              bars: [
                { label: 'Pricing pool', pct: Math.min(100, m.busy * 2), text: `${m.busy}/50`, tone: m.pricingSat ? 'bad' : 'ok' },
                { label: 'Order pool', pct: Math.min(100, m.orderBusy * 2), text: `${m.orderBusy}/50`, tone: m.orderSat ? 'bad' : 'ok' },
                { label: 'Gateway pool', pct: Math.min(100, m.gwBusy * 2), text: `${m.gwBusy}/50`, tone: m.gwSat ? 'bad' : 'ok' },
              ],
              verdict: !k.taxDown
                ? { ok: false, text: 'Sab healthy hai — asli test tab hai jab tax down ho. Tax ko hang karo.' }
                : allOk && m.success >= 99
                  ? { ok: true, text: 'Breaker OPEN: pricing tax ko call hi nahi karti, turant fallback. Cascade ruka, users ko estimate ke saath jawab.' }
                  : allOk
                    ? { ok: false, text: `Threads bach gaye (1 s timeout), par har request 1 s baad FAIL — users ko ${m.success}% jawab. Fallback chahiye.` }
                    : { ok: false, text: `Cascade: pricing ko ${m.busy} threads chahiye (pool 50) → order → gateway sab full. Login bhi band.` },
            };
          },
          check: k => { const m = cascadeModel(k); return k.taxDown === 1 && !m.pricingSat && !m.orderSat && !m.gwSat && m.success >= 99; },
          lesson: '✅ <b>Cascade ruk gaya.</b> Timeout ne nuksaan seemit kiya, breaker ne hang service ko call karna band kiya, aur fallback ne users ko jawab diya.',
          quiz: {
            q: 'Breaker on hai par timeout 4 s. Breaker khulne se pehle kya nuksaan hota hai?',
            choices: [
              'Pehli kuch requests (threshold tak) har ek 4 s phansi rehti hain — isliye breaker ke saath bhi timeout chhota rakhna chahiye',
              'Koi nuksaan nahi',
              'Breaker kabhi nahi khulta',
              'Tax service theek ho jaati hai',
            ],
            answer: 0,
            explain: 'Breaker ko khulne ke liye failures chahiye, aur har failure timeout jitna lamba. Chhota timeout + breaker = jaldi aur sasta bachaav.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — circuit breaker ke teen states',
          goal: 'Pricing-service ke andar breaker ki state har step par dekho.',
          nodes: [N('order', 160, 250), N('coupon', 500, 250, { id: 'pricing', icon: '💰', label: 'pricing' }), N('coupon', 840, 250, { id: 'tax', icon: '🧮', label: 'tax' })],
          edges: [{ from: 'order', to: 'pricing' }, { from: 'pricing', to: 'tax' }],
          panels: [{ id: 'br', title: 'Breaker (pricing ke andar)' }, { id: 'res', title: 'Order ko kya mila' }],
          steps: [
            {
              clock: '8:30:00',
              say: 'Sab normal. Breaker <b>CLOSED</b> — har request tax tak jaati hai. Failures ka counter 0.',
              flows: [{ from: 'order', to: 'pricing', tone: 'ok' }, { from: 'pricing', to: 'tax', label: '50 ms', tone: 'ok' }],
              nodes: { pricing: { tone: 'ok', badge: 'CLOSED' }, tax: { tone: 'ok' } },
              panels: { br: ['state: CLOSED', 'failures: 0'], res: ['tax ₹16.00 (asli)'] },
            },
            {
              clock: '8:30:05',
              say: 'Tax ka DB hang. Pehli request 1 s timeout ke baad fail → counter 1. Doosri → 2. Teesri → 3. Threshold 3 poora.',
              flows: [{ from: 'pricing', to: 'tax', label: 'timeout 1 s × 3', tone: 'bad' }],
              nodes: { tax: { tone: 'bad', badge: 'hang' }, pricing: { tone: 'slow', badge: 'failures 3' } },
              panels: { br: ['state: CLOSED', 'failures: 1 → 2 → 3'], res: ['3 requests: 1 s ke baad fallback'] },
            },
            {
              clock: '8:30:08',
              say: 'Breaker <b>OPEN</b>. Agli 10 second tak pricing tax ko <b>call hi nahi karti</b>. Har request ko turant fallback: "tax estimate 5%".',
              flows: [{ from: 'order', to: 'pricing', label: '10 ms', tone: 'ok' }],
              nodes: { pricing: { tone: 'busy', badge: 'OPEN — fallback' } },
              panels: { br: ['state: OPEN', 'open until: 8:30:18'], res: ['tax estimate 5% (~₹16)', 'response 10 ms'] },
              ask: {
                q: 'OPEN state mein pricing ke threads ka kya hota hai?',
                choices: ['Turant free — koi request tax ka intezaar nahi karti', 'Sab threads tax ka intezaar karte hain', 'Pricing band ho jaati hai', 'Threads double ho jaate hain'],
                answer: 0,
                explain: 'Call hi nahi hui toh intezaar bhi nahi. Yahi cascade todta hai.',
              },
            },
            {
              clock: '8:30:18',
              say: '10 second baad breaker <b>HALF-OPEN</b>. Sirf ek trial request tax ko jaati hai. Tax abhi bhi hang → trial fail → breaker phir OPEN (agle 10 s).',
              flows: [{ from: 'pricing', to: 'tax', label: 'trial call', tone: 'slow' }],
              nodes: { pricing: { tone: 'slow', badge: 'HALF-OPEN → OPEN' } },
              panels: { br: ['state: HALF-OPEN', 'trial: fail', '→ OPEN again'] },
              ask: {
                q: 'HALF-OPEN mein sirf EK trial request kyun, saari kyun nahi?',
                choices: ['Agar tax abhi bhi bimaar hai toh saari requests phir phansengi — ek trial se sasta pata chalta hai', 'Kyunki tax ek hi request leta hai', 'Random rule hai', 'Taaki fallback band ho'],
                answer: 0,
                explain: 'Trial = kam risk mein check. Theek hua toh CLOSED, warna OPEN.',
              },
            },
            {
              clock: '8:42:30',
              say: 'Tax team ne DB theek kiya. Agla HALF-OPEN trial successful → breaker <b>CLOSED</b>. Asli tax wapas.',
              flows: [{ from: 'pricing', to: 'tax', label: 'trial ✅ 50 ms', tone: 'ok' }],
              nodes: { tax: { tone: 'ok', badge: 'recovered' }, pricing: { tone: 'ok', badge: 'CLOSED' } },
              panels: { br: ['state: CLOSED', 'failures: 0'], res: ['tax ₹16.00 (asli)'] },
            },
          ],
          lesson: '<b>Asli baat:</b> CLOSED (normal) → OPEN (call band, fallback) → HALF-OPEN (ek trial). Breaker dependency ko recover hone ka mauka bhi deta hai — kyunki koi usse bheed se nahi daba raha.',
        },
        {
          type: 'order',
          title: 'Cascading failure kaise phailta hai — kram lagao',
          instructions: 'Chain: gateway → order → pricing → tax. Tax ka DB hang hua. Events ko sahi kram mein lagao.',
          steps: [
            { text: 'Tax-service ka DB hang — tax zinda hai par jawab nahi deti', explain: 'Hang, dead nahi — connection accept hota hai, jawab nahi.' },
            { text: 'Pricing ki har request tax ke timeout tak ruki rehti hai', explain: 'Sync call = caller block.' },
            { text: 'Pricing ka thread pool full — naye requests pricing mein line mein', explain: 'Aane wala traffic kam nahi hota.' },
            { text: 'Order ki requests pricing ka intezaar karti hain, order ke threads bharte hain', explain: 'Dard ek level upar chadha.' },
            { text: 'Gateway ke threads bhi bhar jaate hain', explain: 'Ab gateway bhi saturated.' },
            { text: 'Login aur menu jaise unrelated features bhi fail — poori app down', explain: 'Gateway sabka darwaaza tha. Ek tax service ne sab gira diya.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Sync ke dard — quick check',
          questions: [
            {
              q: 'Kaunsi dependency cascade ke liye zyada khatarnak hai?',
              choices: ['Jo hang ho (jawab nahi, connection khula)', 'Jo turant connection refuse kare', 'Jo 50 ms mein jawab de', 'Jo async ho'],
              answer: 0,
              explain: 'Refuse turant fail hai. Hang caller ke threads timeout tak pakadta hai.',
            },
            {
              q: 'Breaker OPEN hone par pricing ko kya lautana chahiye?',
              choices: ['Tay kiya hua fallback (estimate/cache/default)', 'Tax ko 10 baar retry', 'Kuch nahi, request hang rakho', '500 error hamesha'],
              answer: 0,
              explain: 'OPEN ka poora faayda tabhi jab user ko kaam ka jawab mile.',
            },
            {
              q: 'Timeout budget ka niyam?',
              choices: ['Upar ki service ka timeout neeche wali se lamba ho', 'Sab jagah same timeout', 'Neeche wali ka timeout sabse lamba', 'Timeout sirf gateway par'],
              answer: 0,
              explain: 'Warna upar wala pehle haar maan leta hai aur neeche ka fallback user tak pahunchta hi nahi.',
            },
            {
              q: 'Sync communication mein callee ko kis traffic ke liye size karna padta hai?',
              choices: ['Peak traffic', 'Average traffic', 'Minimum traffic', 'Kal ke traffic'],
              answer: 0,
              explain: 'Har request usi pal process honi hai — peak par capacity kam = drops aur latency.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — cascade dekho, breaker lagao',
          project: '04-sync-async',
          exercise: 'ex2-cascade',
          goal: 'Tax ko hang karke 12 requests bhejo aur teeno services ke inflight dekho. Phir breaker + 1 s timeout ke saath dohraao.',
          steps: [
            { text: 'Lamba timeout, bina breaker.', cmd: 'TAX_DOWN=1 TIMEOUT_MS=4000 npm start ex2-cascade' },
            { text: 'Doosre terminal se 12 requests aur turant stats.', cmd: 'for i in $(seq 1 12); do curl -s -X POST localhost:4611/work > /dev/null & done\ncurl localhost:4611/stats; curl localhost:4612/stats; curl localhost:4613/stats', expect: '{"service":"gateway","inflight":12,...}\n{"service":"order","inflight":12,...}\n{"service":"pricing","inflight":12,...}' },
            { text: 'Ctrl+C. Breaker + 1 s timeout.', cmd: 'TAX_DOWN=1 TIMEOUT_MS=1000 BREAKER=1 npm start ex2-cascade\nfor i in $(seq 1 12); do curl -s -X POST localhost:4611/work > /dev/null & done' },
            { text: '2 second baad ek request aur pricing stats.', cmd: 'curl -X POST localhost:4611/work\ncurl localhost:4613/stats', expect: '{..."fallback":"tax estimate 5% (tax-service unavailable)","breaker":"OPEN"} (~15 ms)\n{"service":"pricing","inflight":0,...,"breaker":"OPEN"}' },
          ],
          observe: {
            q: 'Breaker OPEN hone ke baad wali request kitni tez aayi aur kyun?',
            choices: [
              'Lagbhag 10-20 ms — pricing ne tax ko call hi nahi kiya, seedha fallback diya',
              '4 second — tax ka intezaar',
              '1 second — timeout',
              'Request fail hui',
            ],
            answer: 0,
            explain: 'services/chain.js mein br.state === OPEN par callNext turant throw karta hai aur pricing fallback lautati hai. Log mein 🔴 breaker OPEN dikhega.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Resilience',
        instructions: 'Cascading failure aur breaker SRE interviews ka favourite. 🎤',
        questions: [
          {
            q: 'Interviewer: "Cascading failure kya hai aur tum kaise rokoge?"',
            choices: [
              'Ek downstream ki susti/hang upstream ke threads/connections bhar deti hai aur failure chain mein upar phailta hai; timeouts (budget), circuit breakers + fallback, bulkheads (per-dependency pools), aur load shedding se rokunga',
              'Jab do services ek saath deploy hoti hain',
              'Database replication lag',
              'Sirf retries badhakar',
            ],
            answer: 0,
            explain: 'Mechanism + multi-layer defence.',
          },
          {
            q: 'Interviewer: "Circuit breaker ke states?"',
            choices: [
              'CLOSED (normal, failures gino) → threshold par OPEN (call band, fallback) → timeout ke baad HALF-OPEN (trial) → success par CLOSED, fail par OPEN',
              'ON aur OFF',
              'RED, YELLOW, GREEN bina kisi rule ke',
              'Sirf OPEN',
            ],
            answer: 0,
            explain: 'Teeno states aur transitions bolna zaroori hai.',
          },
          {
            q: 'Interviewer: "Sync communication se strong coupling kaise aata hai?"',
            choices: [
              'Caller callee ke contract aur uptime se bandha hai — breaking change, planned downtime, ya slowness seedha caller par; isliye versioning aur backward compatibility zaroori',
              'Sync mein services same database share karti hain',
              'Sync mein code share hota hai',
              'Sync se coupling kam hoti hai',
            ],
            answer: 0,
            explain: 'Temporal coupling (dono saath zinda hon) + contract coupling.',
          },
        ],
      },
      success: [
        'Main sync ke chaar dard naam aur misaal ke saath bata sakta hoon',
        'Main cascading failure ka kram samjha sakta hoon',
        'Main circuit breaker ke states aur fallback design kar sakta hoon',
        'Main timeout budget ka niyam laga sakta hoon',
      ],
      homework: '<p>Apne project ki kisi ek sync dependency ke liye breaker config likho: failure threshold, open duration, half-open trials, aur fallback kya hoga. Agar resilience library (resilience4j, opossum, Polly) use karte ho toh uski config file mein yeh values dhoondho.</p>',
      cards: [
        { front: 'Sync ke 4 dard?', back: '1) Caller block 2) Callee ko peak ke liye size 3) Cascading failure 4) Strong coupling.' },
        { front: 'Cascading failure?', back: 'Downstream hang → upstream threads bhare → upstream slow → aur upar tak — poori app down.' },
        { front: 'Circuit breaker states?', back: '<b>CLOSED</b> (normal) → <b>OPEN</b> (call band, fallback) → <b>HALF-OPEN</b> (ek trial) → CLOSED/OPEN.' },
        { front: 'Timeout budget?', back: 'Upar ki service ka timeout <b>neeche wali se lamba</b> (gateway 8 s > order 7 s > tax call 1 s).' },
        { front: 'Hang vs dead dependency?', back: '<b>Hang zyada khatarnak</b> — dead turant refuse karti hai, hang threads timeout tak churaati hai.' },
      ],
    },

    /* =================================================================
       LEVEL: Async with broker
       ================================================================= */
    {
      id: 'ms-async',
      icon: '📨',
      title: 'Async — Broker ek Buffer Hai',
      badge: 'Queue Qila-daar',
      source: Object.assign({ at: 1155 }, SRC),
      hook: {
        when: 'KhanaKart · IPL final toss · 7:28 PM',
        title: 'Toss ke 2 minute mein 3,000 orders per second — aur notification-service ka dum',
        text: 'Toss hote hi log order karne lage: 3,000 orders per second. Order-service har order par notification-service ko sync call karke "Order confirmed" push bhej rahi thi. Notification-service ek second mein sirf 2,000 bhej sakti thi. Baaki requests drop — 1,000 orders har second fail. Notification ke chakkar mein orders gaye. Team ne socha: notification ko order ke saath abhi hona zaroori hi kab tha?',
      },
      objectives: [
        '<b>Asynchronous communication</b> — message broker ke through, non-blocking',
        'Async flow: sync publish + ack, phir consumer apni raftaar se',
        'Async ke faayde: no waiting, surge absorb, no request drop, retries + DLQ, decoupling',
        'Async ki keemat: <b>eventual consistency</b>, broker SPOF, <b>tracing mushkil</b>',
      ],
      steps: [
        {
          q: 'Async communication kya hai?',
          analogy: 'Mumbai ke dabbawale: tum dabba de dete ho aur apne kaam par chale jaate ho. Dabba apne time par pahunch jaata hai. Tum dabbe ke pahunchne tak darwaaze par khade nahi rehte.',
          body: 'Service A, service B ko seedha call nahi karti. A ek <b>message</b> ("order O-901 placed") <b>broker</b> ko deti hai. B broker se message uthaati hai jab B ke paas time ho. Broker beech ka <b>buffer</b> hai.',
          example: 'Brokers: RabbitMQ, Amazon SQS, Kafka, Kinesis, Google Pub/Sub. Har ek ki khoobiyan alag hain, par idea ek.',
        },
        {
          q: 'Async flow step-by-step kaisa dikhta hai?',
          points: [
            'User "Place order" → order-service apne DB mein order save karti hai (sync).',
            'order-service broker ko "order_placed" message publish karti hai aur <b>ack ka intezaar</b> karti hai (sync, milliseconds).',
            'Ack milte hi user ko "Order placed" — user ka kaam khatam.',
            'notification-service ke workers broker se message uthaate hain, push bhejte hain, phir <b>ack</b> karte hain — user ke request se bilkul alag.',
          ],
          asli: 'User sirf "save + publish" ka intezaar karta hai. Bhaari kaam (push, email) request ke bahar.',
        },
        {
          q: 'Async ke faayde kya hain?',
          body: '<table><tr><th>Faayda</th><th>KhanaKart mein</th></tr>' +
            '<tr><td>Service ko intezaar nahi</td><td>Order API ~45 ms, chahe push provider slow ho</td></tr>' +
            '<tr><td>Surge absorb</td><td>1 ya 3,000 orders/s — user ka latency same; bas queue lambi</td></tr>' +
            '<tr><td>Peak ke liye pehle se scale nahi</td><td>Queue badhe toh workers badhao; order-service ko farak nahi</td></tr>' +
            '<tr><td>Kam infra</td><td>Workers ke aage load balancer nahi chahiye (ek hop ≈ 3-5 ms kam)</td></tr>' +
            '<tr><td>Request drop nahi</td><td>Sync mein backlog full = 503; async mein message queue mein safe</td></tr>' +
            '<tr><td>Failure par control</td><td>Worker crash → message dobara; provider down → retry → <b>DLQ</b></td></tr>' +
            '<tr><td>Decoupling</td><td>Services sirf message format share karti hain</td></tr></table>',
        },
        {
          q: 'Async ki keemat kya hai?',
          points: [
            '<b>Eventual consistency</b> — push kuch seconds (surge mein minutes) baad pahunchega. Delay ko accept karna padta hai.',
            '<b>Broker single point of failure</b> — broker gira toh publish fail. Broker ko highly available, horizontally scalable aur durable chahiye.',
            '<b>Flow track karna mushkil</b> — A → broker → B → C → broker → D mein "message kahan atka?" jaanne ke liye tracing (correlation id) chahiye.',
          ],
          asli: 'Async ek naya system laata hai (broker) aur naya sawaal (kitna delay chalega). Faayde bade hain, par muft nahi.',
        },
        {
          q: 'DLQ (dead letter queue) kya hai?',
          analogy: 'Post office mein galat pata ya band ghar wali chitthi "undelivered" dabbe mein jaati hai — phenki nahi jaati, koi baad mein dekhta hai.',
          body: 'Message 3 baar fail hua (jaise email provider down) → broker usse main queue se hata ke <b>DLQ</b> mein daal deta hai. Main queue atakti nahi, aur DLQ ke messages baad mein fix karke dobara chalaaye ja sakte hain.',
        },
      ],
      myth: [
        { myth: 'Async matlab message kabhi nahi khota.', sach: 'Broker ko durable config chahiye (persist, replication), publish ka ack dekhna padta hai, aur consumer ko kaam ke baad hi ack karna chahiye. Bina in teeno ke messages kho sakte hain.' },
        { myth: 'Queue hai toh consumer kabhi overload nahi hoga, sab theek.', sach: 'Consumer overload nahi hota par queue lambi hoti jaati hai. Queue depth aur "oldest message age" monitor na karo toh delay ghanton tak chala jaata hai bina kisi ko pata chale.' },
      ],
      playbook: {
        title: 'async with broker',
        use: [
          'Delay chalega: notifications, emails, analytics, reporting',
          'Lamba kaam: invoice PDF, restaurant onboarding checks, data exports',
          'Surge wale flows jahan request drop nahi honi chahiye',
        ],
        avoid: [
          'User jiska jawab screen par khada intezaar kar raha hai (OTP, payment confirm)',
          'Bina monitoring ke queue (depth, age, DLQ)',
          'Consumer jo message uthaate hi ack kar de, kaam baad mein',
        ],
        how: [
          'Publish ke baad ack check karo; ack na aaye toh retry (message id ke saath)',
          'Consumer: kaam poora → phir ack. Idempotent consumer (duplicate message safe)',
          'Max attempts + DLQ + DLQ alert',
          'Queue depth / oldest age par workers autoscale',
          'Har message mein correlation/trace id',
        ],
        redflags: [
          'Queue depth lagataar badh raha hai',
          'DLQ mein messages aur koi owner nahi',
          'Users "SMS 2 ghante baad aaya" bol rahe hain',
        ],
        rule: 'Async delay ko accept karne ka faisla hai — delay ko naapo, broker ko mazboot rakho, aur har message ka trace rakho.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — IPL toss ka surge',
          goal: 'Surge <b>3,000 orders/second</b> (60 second tak) par: order API p99 <b>≤ 100 ms</b>, <b>0 dropped</b> orders, aur notification delay <b>≤ 120 second</b>.',
          scenario: 'Har notification worker ek second mein 100 push bhej sakta hai. Sync mode mein order-service notification ka intezaar karti hai. Async mode mein order-service sirf broker ko publish karti hai.',
          knobs: [
            { id: 'mode', label: 'Communication', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'sync', 1: 'async (broker)' } },
            { id: 'surge', label: 'Orders per second', min: 500, max: 5000, step: 500, value: 1000 },
            { id: 'consumers', label: 'Notification workers', min: 1, max: 20, step: 1, value: 4 },
          ],
          nodes: [N('app', 110, 300), N('order', 370, 300), N('broker', 660, 80), N('notification', 850, 340)],
          edges: [{ from: 'app', to: 'order' }, { from: 'order', to: 'broker', dashed: true }, { from: 'broker', to: 'notification', dashed: true }, { from: 'order', to: 'notification', dashed: true }],
          model: k => {
            const m = surgeModel(k);
            const okP = m.p99 <= 100, okD = m.dropped === 0, okDelay = !m.async ? false : m.delay <= 120;
            return {
              nodes: {
                order: { tone: okP && okD ? 'ok' : 'bad', badge: `p99 ${m.p99} ms` },
                broker: { tone: m.async ? (m.backlog ? 'busy' : 'ok') : 'idle', badge: m.async ? `queue ${m.backlog.toLocaleString('en-IN')}` : 'use nahi' },
                notification: { tone: m.async ? (okDelay ? 'ok' : 'slow') : (okD ? 'ok' : 'bad'), badge: `${k.consumers} workers · ${m.cap}/s` },
                app: { tone: okD ? 'ok' : 'bad', badge: okD ? 'orders placed' : `${m.dropped}/s dropped` },
              },
              flows: m.async
                ? [{ from: 'app', to: 'order', label: `${k.surge}/s`, tone: 'ok', rate: 0.9 }, { from: 'order', to: 'broker', label: 'publish + ack', tone: 'ok', rate: 0.9 }, { from: 'broker', to: 'notification', label: `${Math.min(k.surge, m.cap)}/s`, tone: okDelay ? 'ok' : 'slow', rate: 0.5 }]
                : [{ from: 'app', to: 'order', label: `${k.surge}/s`, tone: okD ? 'ok' : 'bad', rate: 0.9 }, { from: 'order', to: 'notification', label: okD ? 'sync wait' : 'overload → drops', tone: okD ? 'slow' : 'bad', rate: 0.9 }],
              readouts: [
                { label: 'Order API p99', value: m.p99 + ' ms', tone: okP ? 'ok' : 'bad' },
                { label: 'Dropped orders', value: m.dropped + ' / s', tone: okD ? 'ok' : 'bad' },
                { label: 'Notification delay (max)', value: m.async ? `~${m.delay} s` : 'turant (jab chale)', tone: m.async ? (okDelay ? 'ok' : 'bad') : 'warn' },
              ],
              bars: [
                { label: 'Worker capacity vs surge', pct: Math.min(100, (m.cap / k.surge) * 100), text: `${m.cap} / ${k.surge} per s`, tone: m.cap >= k.surge ? 'ok' : 'warn' },
              ],
              verdict: k.surge < 3000
                ? { ok: false, text: 'Toss ka surge 3,000/s hai — slider ko 3,000 ya upar lao.' }
                : !m.async
                  ? { ok: false, text: okD ? `Sync mein order API ${m.p99} ms — user notification ka intezaar kar raha hai.` : `Sync: notification ki capacity ${m.cap}/s, surge ${k.surge}/s → ${m.dropped} orders/s drop. Sync callee ko peak ke liye size karna padta.` }
                  : okDelay
                    ? { ok: true, text: `Async: order API 45 ms, 0 drops. Queue peak ${m.backlog.toLocaleString('en-IN')}, max delay ~${m.delay} s.` }
                    : { ok: false, text: `Async mein orders safe, par queue ${m.backlog.toLocaleString('en-IN')} — notification ${m.delay} s late. Workers badhao.` },
            };
          },
          check: k => { const m = surgeModel(k); return k.surge >= 3000 && m.async && m.p99 <= 100 && m.dropped === 0 && m.delay <= 120; },
          lesson: '✅ <b>Surge jhel liya.</b> Async ne order API ko notification ki capacity se azaad kiya. Workers sirf delay tay karte hain — orders nahi girte.',
          quiz: {
            q: 'Sync mode mein 3,000/s bina drop sambhaalne ke liye kitne workers chahiye the (har worker 100/s)?',
            choices: ['30 — aur woh 30 poore saal peak ke liye khade rehte', '3', '10', '1'],
            answer: 0,
            explain: 'Sync = peak ke liye pehle se capacity. Async = average ke paas capacity + queue surge ko sokh le.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — email provider down: retry aur DLQ',
          goal: 'Ek message ka safar dekho: consume → fail → retry → DLQ, aur baaki queue atakti nahi.',
          nodes: [N('order', 130, 260), N('broker', 420, 260), N('notification', 830, 80, { label: 'email worker' }), N('db', 830, 440, { id: 'dlq', icon: '☠️', label: 'DLQ', kind: 'queue' })],
          edges: [{ from: 'order', to: 'broker' }, { from: 'broker', to: 'notification' }, { from: 'broker', to: 'dlq', dashed: true }],
          panels: [{ id: 'q', title: 'order_placed queue' }, { id: 'dlq', title: 'Dead letter queue' }],
          steps: [
            {
              say: 'order-service ne O-901 ka "order_placed" publish kiya. Broker ne message save karke ack diya. User ko "Order placed" mil chuka.',
              flows: [{ from: 'order', to: 'broker', label: 'publish O-901 → ack', tone: 'ok' }],
              nodes: { broker: { tone: 'ok', badge: 'depth 1' } },
              panels: { q: ['O-901 (attempts 0)'], dlq: ['(khaali)'] },
            },
            {
              say: 'Email worker ne O-901 uthaaya (attempt 1). Broker message ko "in-flight" rakhta hai — worker ack na kare toh kuch der baad wapas queue mein. Email provider down → worker <b>nack</b> karta hai.',
              flows: [{ from: 'broker', to: 'notification', label: 'O-901 (attempt 1)', tone: 'acc' }],
              nodes: { notification: { tone: 'bad', badge: 'provider down → nack' } },
              panels: { q: ['O-901 wapas queue mein (attempts 1)'] },
              ask: {
                q: 'Worker ne nack kiya. User ke order ka kya hua?',
                choices: ['Kuch nahi — order pehle hi placed hai; sirf email baad mein retry hogi', 'Order cancel ho gaya', 'User ko error dikha', 'Payment refund hua'],
                answer: 0,
                explain: 'Async failure user ke main flow se alag hai. Yahi "better control over failures" hai.',
              },
            },
            {
              say: 'Attempt 2 aur 3 bhi fail (provider abhi bhi down). Beech mein naye messages O-902, O-903 aate hain aur doosre workers unhe bhej dete hain jab provider kuch der ke liye chala.',
              flows: [{ from: 'broker', to: 'notification', label: 'O-901 (attempt 3) ❌', tone: 'bad' }],
              panels: { q: ['O-902 ✅ sent', 'O-903 ✅ sent', 'O-901 (attempts 3)'] },
            },
            {
              say: 'Max attempts (3) poore → broker O-901 ko <b>DLQ</b> mein bhejta hai. Main queue saaf, baaki emails chalte rahe. DLQ par alert jaata hai.',
              flows: [{ from: 'broker', to: 'dlq', label: 'O-901 → DLQ', tone: 'slow' }],
              nodes: { dlq: { tone: 'busy', badge: '1 message · alert' }, notification: { tone: 'ok', badge: 'baaki chal rahe' } },
              panels: { q: ['(khaali)'], dlq: ['O-901 (3 attempts, provider down)'] },
              ask: {
                q: 'DLQ na hota aur O-901 hamesha retry hota, toh kya khatra?',
                choices: ['Ek "zeher" message baar-baar workers ka time khaata, aur kuch brokers mein queue ke aage atak kar baaki messages rok deta', 'Koi khatra nahi', 'O-901 apne aap delete ho jaata', 'Provider tez ho jaata'],
                answer: 0,
                explain: 'Poison message ko alag karna zaroori hai — DLQ wahi karta hai.',
              },
            },
            {
              say: 'Provider theek hone par on-call engineer DLQ ke messages ko main queue mein wapas bhejta hai (redrive). O-901 ki email ab jaati hai — thodi der se, par jaati hai.',
              flows: [{ from: 'dlq', to: 'broker', label: 'redrive', tone: 'ok' }, { from: 'broker', to: 'notification', label: 'O-901 ✅', tone: 'ok' }],
              nodes: { dlq: { tone: 'ok', badge: 'khaali' } },
              panels: { dlq: ['(khaali)'], q: ['O-901 ✅ sent (late)'] },
            },
          ],
          lesson: '<b>Asli baat:</b> async mein failure user ka nahi, worker ka problem hai. Retries + max attempts + DLQ + alert = koi message chupchaap nahi khota.',
        },
        {
          type: 'bins',
          title: 'Async ka faayda ya keemat?',
          instructions: 'Har baat ko sahi dabbe mein daalo.',
          bins: [{ id: 'gain', label: '✅ Faayda' }, { id: 'cost', label: '💸 Keemat' }],
          items: [
            { text: 'Surge par order API ka latency same rehta hai', bin: 'gain', explain: 'Publish tez hai, bhaari kaam baad mein.' },
            { text: 'Push notification kuch seconds late pahunchta hai', bin: 'cost', explain: 'Eventual consistency.' },
            { text: 'Broker down = publish fail', bin: 'cost', explain: 'Broker naya single point of failure.' },
            { text: 'Worker crash hua toh message dobara uthega', bin: 'gain', explain: 'Ack ke bina message wapas queue mein.' },
            { text: '"Message kahan atka?" jaanne ke liye tracing chahiye', bin: 'cost', explain: 'Flow kai hops aur queues mein bikhra hai.' },
            { text: 'Workers ke aage load balancer nahi chahiye', bin: 'gain', explain: 'Workers khud broker se khinchte hain.' },
            { text: 'Surge mein requests drop nahi hoti', bin: 'gain', explain: 'Message queue mein safe.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Async — quick check',
          questions: [
            {
              q: 'Consumer ko ack kab karna chahiye?',
              choices: ['Kaam (email bhejna) poora hone ke baad', 'Message uthaate hi', 'Kabhi nahi', 'Publish se pehle'],
              answer: 0,
              explain: 'Pehle ack kiya aur worker crash hua → message kho gaya.',
            },
            {
              q: 'Queue depth 2 ghante se badh raha hai. Sabse pehle kya dekhoge?',
              choices: ['Consumers ki capacity/health aur oldest message age — workers badhane ya fail hone ki wajah', 'Broker delete', 'Publisher band', 'Kuch nahi, queue hai toh chalega'],
              answer: 0,
              explain: 'Badhti queue = consumers peeche. Age batata hai users kitna late dekh rahe hain.',
            },
            {
              q: 'Kaunsa KhanaKart kaam async ke liye SABSE KAM theek hai?',
              choices: ['Login OTP bhejna', 'Order confirmation email', 'Weekly spend report', 'Restaurant ko nayi rating ka notification'],
              answer: 0,
              explain: 'OTP ka user screen par intezaar kar raha hai — queue delay seedha login delay.',
            },
            {
              q: 'Async flow mein ek request ko end-to-end trace kaise karein?',
              choices: ['Har message mein correlation/trace id daal ke, har service ke logs/traces mein wahi id', 'Timestamps compare karke andaaza', 'Broker ka dashboard dekh ke', 'Possible nahi'],
              answer: 0,
              explain: 'Correlation id queue ke paar request ki kahani jodti hai.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — burst, sync vs async, DLQ',
          project: '04-sync-async',
          exercise: 'ex3-broker',
          goal: '200 orders ek saath bhejo — pehle async, phir sync. Phir email provider down karke DLQ dekho.',
          steps: [
            { text: 'Async mode chalao aur burst bhejo.', cmd: 'npm start ex3-broker\nnpm run burst 200\ncurl localhost:4620/stats', expect: '{"orders":200,"failed":0,"p50Ms":~400,"p99Ms":~450}\n{"published":200,...,"depth":{"order_placed":~190}}' },
            { text: 'Ctrl+C. Sync mode mein wahi burst.', cmd: 'SYNC_NOTIFY=1 npm start ex3-broker\nnpm run burst 200', expect: '{"orders":200,"failed":0,"p50Ms":~4500,"p99Ms":~8000}' },
            { text: 'Ctrl+C. Email down karke ek order, 6 second baad DLQ dekho.', cmd: 'EMAIL_DOWN=1 npm start ex3-broker\ncurl -X POST localhost:4621/orders\ncurl localhost:4620/stats\ncurl localhost:4620/dlq', expect: '{..."dlq":1,...}\n[{"id":1,"body":{"orderId":"O-1",...},"attempts":3}]' },
          ],
          observe: {
            q: 'Sync burst mein p99 ~8 second aur async mein ~0.45 second kyun?',
            choices: [
              'Sync mein user email provider (max 10 ek saath) ka intezaar karta hai; async mein user sirf publish ka intezaar karta hai aur emails queue se baad mein jaati hain',
              'Async mode ka server tez hai',
              'Sync mode mein bug hai',
              'Burst tool async mein kam requests bhejta hai',
            ],
            answer: 0,
            explain: 'services/order-async.js: SYNC_NOTIFY=1 par sendEmailSync (10 slots) ka await; warna sirf broker publish.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Async messaging',
        instructions: 'Queues aur brokers ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Async communication ke trade-offs batao."',
            choices: [
              'Faayde: decoupling, surge absorb, no drops, retries/DLQ, independent scaling. Keemat: eventual consistency, broker availability/durability, tracing aur debugging mushkil, duplicate messages sambhaalne padte hain',
              'Async hamesha behtar hai',
              'Async sirf batch jobs ke liye hai',
              'Async mein koi trade-off nahi',
            ],
            answer: 0,
            explain: 'Dono taraf bolna zaroori.',
          },
          {
            q: 'Interviewer: "Messages khone na paayein — kya guarantee karoge?"',
            choices: [
              'Durable/replicated broker, publisher confirms (ack), consumer kaam ke baad ack, idempotent consumers, DLQ + alerts',
              'Sirf broker ka backup',
              'Messages ko RAM mein rakhenge',
              'Retries band',
            ],
            answer: 0,
            explain: 'Publish side, broker side, consume side — teeno.',
          },
          {
            q: 'Interviewer: "Consumer lag badh raha hai. Kaise scale karoge?"',
            choices: [
              'Queue depth/oldest age par consumers autoscale, bottleneck (DB/provider) check, aur batching; Kafka jaise partitioned broker mein partitions bhi dekhunga',
              'Publisher slow kar dunga',
              'Broker restart',
              'Messages delete',
            ],
            answer: 0,
            explain: 'Scale consumers + downstream bottleneck + partition limits.',
          },
        ],
      },
      success: [
        'Main async flow ko broker, ack aur consumer ke saath samjha sakta hoon',
        'Main async ke saat faayde aur teen keematein bata sakta hoon',
        'Main retries, max attempts aur DLQ design kar sakta hoon',
        'Main surge ke waqt sync aur async ka farak numbers se dikha sakta hoon',
      ],
      homework: '<p>Apne project mein koi ek sync call dhoondho jiska user intezaar nahi karna chahiye (email, analytics, webhook). Uske liye async design likho: event naam, message fields (correlation id samet), consumer ka ack point, max attempts, DLQ aur alert.</p>',
      cards: [
        { front: 'Async flow ke steps?', back: 'Save → <b>publish + ack</b> → user ko jawab → consumer uthaaye → kaam → <b>ack</b>.' },
        { front: 'Async ke faayde (4 main)?', back: 'Intezaar nahi, <b>surge absorb</b>, <b>no drops</b>, retries/DLQ se failure control.' },
        { front: 'Async ki 3 keematein?', back: '<b>Eventual consistency</b>, <b>broker SPOF</b>, <b>tracing mushkil</b>.' },
        { front: 'DLQ?', back: 'Max attempts ke baad message <b>alag queue</b> mein — main queue atake nahi, baad mein fix + redrive.' },
        { front: 'Consumer ack kab?', back: '<b>Kaam poora hone ke baad</b> — pehle ack = crash par message gaya.' },
      ],
    },

    /* =================================================================
       LEVEL: Sync ya async — decision lab
       ================================================================= */
    {
      id: 'ms-sync-or-async',
      icon: '⚖️',
      title: 'Sync ya Async? — KhanaKart ke 12 Faisle',
      badge: 'Communication Chaturr',
      source: Object.assign({ at: 1900 }, SRC),
      hook: {
        when: 'KhanaKart · architecture review',
        title: 'Naye "Order placed" flow mein kaunsa step sync, kaunsa async?',
        text: 'Order flow dobara design ho raha hai. Product manager chahta hai sab "real-time" ho. SRE chahta hai sab async ho taaki surge mein kuch na toote. Dono aadhe sahi hain. Har step ke liye chaar sawaal poochho — jawab apne aap nikalta hai.',
      },
      objectives: [
        'Sync chunne ke 3 signals: aage nahi badh sakte, real-time, chhota-tez kaam',
        'Async chunne ke 4 signals: delay chalega, lamba kaam, kai consumers, failure-retry chalega',
        'Ek flow ke andar sync aur async ko mix karna',
        'Long-running kaam ke liye "202 Accepted + status" pattern',
      ],
      steps: [
        {
          q: 'Sync kab chunein?',
          points: [
            '<b>Jawab ke bina aage nahi badh sakte</b> — DB query, restaurant accept, stock check.',
            '<b>Real-time zaroori</b> — payment confirm, chat message, OTP. Paise wale flows aksar sync.',
            '<b>Kaam chhota aur tez</b> — kuch milliseconds. 10 minute ka kaam HTTP request mein nahi.',
          ],
        },
        {
          q: 'Async kab chunein?',
          points: [
            '<b>Delay chalega</b> — "order confirmed" push 5 second late chalega; analytics alert 10 second late chalega.',
            '<b>Kaam lamba hai</b> — restaurant onboarding ke KYC checks (20 min), monthly invoice PDFs, database backup.',
            '<b>Ek event, kai services</b> — order placed → push, loyalty points, analytics, restaurant dashboard; kal paanchvi service bhi judegi.',
            '<b>Failure aur retry chalega</b> — email provider down ho toh baad mein bhejo, user ko pata bhi na chale.',
          ],
        },
        {
          q: 'Lamba kaam user ko kaise dikhayein?',
          analogy: 'Dry cleaner kapde leta hai aur ek parchi deta hai: "kal 5 baje". Tum dukaan par khade nahi rehte. Parchi se baad mein status poochh lete ho.',
          body: 'API turant <b>202 Accepted</b> + ek job id lautaye. Kaam queue se background worker kare. User/app <code>GET /jobs/:id</code> se status dekhe, ya kaam poora hone par notification.',
          example: 'Restaurant owner "Onboard karo" dabaata hai → 202 + job id → KYC, FSSAI license, bank account checks queue se → 20 minute baad "Aapka restaurant live hai" push.',
        },
        {
          q: 'Ek flow mein dono kaise mix hote hain?',
          body: '"Place order": payment confirm (sync) → restaurant accept (sync) → order save + "order_placed" publish (sync publish) → user ko jawab. Phir async: push notification, loyalty points, analytics, rider assignment (ya sync, product decision).',
          asli: 'Rule of thumb: <b>user jiske liye screen par ruka hai woh sync, baaki sab event ke peeche</b>.',
        },
      ],
      myth: [
        { myth: 'Real-time feel ke liye sab kuch sync hona chahiye.', sach: 'User ko "order placed" turant chahiye — SMS ka turant hona nahi. Async steps ke bawajood app real-time lagti hai kyunki main jawab sync hai.' },
        { myth: 'Async matlab "kabhi bhi" — koi SLA nahi.', sach: 'Async steps ka bhi SLA hota hai (push 30 s ke andar). Queue age par alert rakho.' },
      ],
      playbook: {
        title: 'sync ya async',
        use: [
          'Sync: aage nahi badh sakte / real-time / chhota-tez',
          'Async: delay chalega / lamba kaam / kai consumers / retry chalega',
          'Lamba kaam: 202 Accepted + job status',
        ],
        avoid: [
          'OTP, payment confirm jaise user-blocking kaam queue ke peeche',
          'Minutes ka kaam HTTP request mein',
          'Har naye consumer ke liye publisher ka code badalna (event use karo)',
        ],
        how: [
          'Flow ka har step likho aur 7 signals se tag karo',
          'User-blocking steps sync, baaki event publish ke peeche',
          'Async steps ka SLA aur monitoring likho',
          'Long jobs ke liye job id + status endpoint + completion notification',
        ],
        redflags: [
          'User async delay ki wajah se galat state dekh raha hai (order placed par payment pending)',
          'Sync chain mein "nice to have" steps',
          'Queue ka koi SLA/alert nahi',
        ],
        rule: 'User jiske liye ruka hai woh sync; baaki sab event ke peeche.',
      },
      stages: [
        {
          type: 'design',
          title: '🏗️ Design canvas — "Place order" flow',
          instructions: 'Har step ke liye sync ya async chuno. Review mein har option ka "kyun" khulega.',
          brief: 'KhanaKart ka naya order flow. IPL surge sambhaalna hai aur users ko galat state nahi dikhni chahiye.',
          requirements: ['User ko "Order placed" 1 second ke andar', 'Surge mein orders drop na hon', 'Payment aur restaurant accept ke bina order placed na dikhe'],
          slots: [
            {
              id: 'pay', label: 'Payment confirm', icon: '💳',
              options: [
                { id: 'sync', label: 'Sync (idempotency key ke saath)', score: 3, why: 'Paisa kata ya nahi — jawab ke bina "placed" nahi dikha sakte.' },
                { id: 'async', label: 'Async — baad mein confirm', score: -3, why: 'User ko "placed" dikha aur payment fail hua toh galat state aur refund ka jhanjhat.' },
              ],
            },
            {
              id: 'accept', label: 'Restaurant accept', icon: '🍳',
              options: [
                { id: 'sync', label: 'Sync (timeout 2 s)', score: 3, why: 'Restaurant band/busy ho toh order place hi nahi hona chahiye.' },
                { id: 'async', label: 'Async', score: -1, why: 'Chal sakta hai agar app "restaurant confirm kar raha hai" status dikhaye — par requirement kehti hai accept ke bina placed nahi.' },
              ],
            },
            {
              id: 'push', label: 'Order confirmed push/SMS', icon: '🔔',
              options: [
                { id: 'async', label: 'Async (event + workers)', score: 3, why: 'Delay chalega, surge mein drop nahi, provider down ho toh retry/DLQ.' },
                { id: 'sync', label: 'Sync', score: -3, why: 'SMS provider down = order fail. IPL surge = drops.' },
              ],
            },
            {
              id: 'loyalty', label: 'Loyalty points', icon: '🏅',
              options: [
                { id: 'async', label: 'Async', score: 3, why: 'Points 1 minute baad judein toh koi farak nahi.' },
                { id: 'sync', label: 'Sync', score: -2, why: 'Latency aur failure badhata hai bina kisi user faayde ke.' },
              ],
            },
            {
              id: 'analytics', label: 'Analytics + restaurant dashboard update', icon: '📊',
              options: [
                { id: 'event', label: 'Same "order_placed" event ke subscribers', score: 3, why: 'Ek event, kai consumers — naya consumer bina order-service badle.' },
                { id: 'sync', label: 'Order-service dono ko sync call kare', score: -3, why: 'Har naye consumer ke liye order-service ka code aur chain lambi.' },
              ],
            },
          ],
          pass: 13,
          verdicts: {
            great: '🌟 User-blocking steps sync, baaki event ke peeche. Surge-proof aur sahi state.',
            ok: '👍 Kareeb — laal slots ka reason padho.',
            bad: '😅 Ya toh user galat state dekhega, ya surge mein orders girenge.',
          },
        },
        {
          type: 'bins',
          title: '12 KhanaKart faisle — sync ya async?',
          instructions: 'Har kaam ko sahi dabbe mein daalo.',
          bins: [{ id: 'sync', label: '🔗 Sync' }, { id: 'async', label: '📨 Async' }],
          items: [
            { text: 'Login OTP SMS bhejna', bin: 'sync', explain: 'User screen par OTP ka intezaar kar raha hai — queue delay = login delay.' },
            { text: '"Order delivered, rate karein" push', bin: 'async', explain: 'Delay chalega.' },
            { text: 'Wallet se ₹320 kaatna', bin: 'sync', explain: 'Paisa — jawab ke bina aage nahi.' },
            { text: 'Restaurant onboarding ke KYC checks (20 min)', bin: 'async', explain: 'Lamba kaam — 202 + status.' },
            { text: 'Checkout par coupon validate', bin: 'sync', explain: 'Final price isi se banta hai.' },
            { text: 'Monthly GST invoice PDFs banana', bin: 'async', explain: 'Lamba, batch kaam.' },
            { text: 'Customer-support chat message', bin: 'sync', explain: 'Real-time baat-cheet.' },
            { text: 'Order placed → loyalty, analytics, dashboard', bin: 'async', explain: 'Ek event, kai consumers.' },
            { text: 'Cart mein item ka stock check (Instamart)', bin: 'sync', explain: 'Stock na ho toh add hi nahi hona chahiye.' },
            { text: 'Restaurant ko weekly performance email', bin: 'async', explain: 'Delay chalega, retry chalega.' },
            { text: 'Search results fetch', bin: 'sync', explain: 'User results ke liye ruka hai (andar ke counts async ho sakte hain — Level "Retry Samajhdaari se").' },
            { text: 'Rider ki live location se ETA recalculation logs', bin: 'async', explain: 'Logging/analytics — delay chalega.' },
          ],
        },
        {
          type: 'match',
          title: 'Signal → faisla',
          pairs: [
            { left: 'Payment gateway se debit confirm', right: 'Sync — jawab ke bina aage nahi badh sakte', explain: 'Paisa kata ya nahi — pehle pata ho.' },
            { left: '20 minute ka restaurant verification', right: 'Async — 202 Accepted + job status', explain: 'HTTP request 20 min khuli nahi rakh sakte.' },
            { left: 'Order placed par 4 teams ki services ko jaanna hai', right: 'Async — ek event, kai subscribers', explain: 'Naya consumer bina publisher badle.' },
            { left: 'Email provider kabhi-kabhi down rehta hai', right: 'Async — retry + DLQ', explain: 'Failure user tak na pahunche.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Decision — quick check',
          questions: [
            {
              q: '"Restaurant onboard karo" button — sabse achha API design?',
              choices: ['202 Accepted + job id, background checks, status endpoint + completion notification', '20 minute tak HTTP request khuli rakho', 'Button ko 20 minute disable', 'Onboarding sync, timeout 30 min'],
              answer: 0,
              explain: 'Lamba kaam async; user ko parchi (job id) do.',
            },
            {
              q: 'Kaunsa pair galat hai?',
              choices: ['OTP → async queue', 'Chat message → sync', 'Monthly report → async', 'Payment confirm → sync'],
              answer: 0,
              explain: 'OTP ka user wait kar raha hai.',
            },
            {
              q: 'Ek flow mein sync aur async mix karne ka rule of thumb?',
              choices: ['User jiske liye screen par ruka hai woh sync, baaki event ke peeche', 'Aadha-aadha', 'Pehle async phir sync', 'Mix mat karo'],
              answer: 0,
              explain: 'Main jawab tez aur sahi, baaki kaam surge-proof.',
            },
          ],
        },
      ],
      interview: {
        title: 'Interview Round — Design decision',
        instructions: 'Final system design style sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Food delivery app ke order flow mein sync aur async kaise baantoge?"',
            choices: [
              'Payment confirm aur restaurant accept sync (idempotency + timeouts), order save + event publish, phir notifications, loyalty, analytics, dashboards async subscribers; rider assignment product ke hisaab se',
              'Sab sync',
              'Sab async including payment',
              'Sirf notification sync',
            ],
            answer: 0,
            explain: 'Step-by-step reasoning signals ke saath.',
          },
          {
            q: 'Interviewer: "Real-time chahiye par surge bhi aata hai — conflict kaise sulajhaoge?"',
            choices: [
              'Real-time wale minimum steps sync rakhunga aur unhe peak ke liye scale karunga; baaki sab async taaki surge queue mein sokh jaaye',
              'Surge ko ignore',
              'Sab async kar ke real-time chhod dunga',
              'Rate limit karke users ko rok dunga hamesha',
            ],
            answer: 0,
            explain: 'Sync surface chhota karo — sirf wahi scale karna padega.',
          },
          {
            q: 'Interviewer: "Async step ka SLA kaise ensure karoge?"',
            choices: ['Queue depth aur oldest message age par alerts, consumer autoscaling, DLQ monitoring', 'SLA async mein nahi hota', 'Publisher ko fast karke', 'Broker ka size badhakar'],
            answer: 0,
            explain: 'Age hi user ka asli delay hai.',
          },
        ],
      },
      success: [
        'Main 7 signals se kisi bhi kaam ko sync ya async classify kar sakta hoon',
        'Main ek flow mein sync aur async steps mix kar sakta hoon',
        'Main long-running kaam ke liye 202 + job status design kar sakta hoon',
        'Main async steps ka SLA aur monitoring bata sakta hoon',
      ],
      homework: '<p>Apne product ke top 10 backend kaamon ki list banao. Har kaam ke aage sync/async aur kaunsa signal (aage nahi badh sakte, real-time, chhota; ya delay chalega, lamba, kai consumers, retry chalega). Jo kaam abhi galat dabbe mein hai, uska migration ek line mein likho.</p>',
      cards: [
        { front: 'Sync ke 3 signals?', back: 'Jawab ke bina <b>aage nahi badh sakte</b>, <b>real-time</b>, <b>chhota-tez</b> kaam.' },
        { front: 'Async ke 4 signals?', back: '<b>Delay chalega</b>, <b>lamba kaam</b>, <b>kai consumers</b>, <b>failure-retry chalega</b>.' },
        { front: 'Lamba kaam ka API pattern?', back: '<b>202 Accepted + job id</b>, background worker, status endpoint / completion notification.' },
        { front: 'Mix ka rule of thumb?', back: 'User jiske liye <b>screen par ruka hai woh sync</b>; baaki event ke peeche.' },
      ],
    },
  ]);
})();
