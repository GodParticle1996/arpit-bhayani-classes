/* =====================================================================
   Video 7 — API Composition
   Source concept: Arpit Bhayani — "API Composition pattern in Microservices" (youtube 5pYLlYsy6fQ)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: '5pYLlYsy6fQ', title: 'API Composition pattern in Microservices' };

  /* ---------------- models ---------------- */
  const LAT = { order: 120, payment: 150, restaurant: 100, tracking: 200 };
  function composeModel(k) {
    const gw = k.who === 1, rtt = k.rtt;
    const seqInside = LAT.order + LAT.payment + LAT.restaurant + LAT.tracking;
    const parAll = Math.max(LAT.order, LAT.payment, LAT.restaurant, LAT.tracking);
    const orderThen = LAT.order + Math.max(LAT.payment, LAT.restaurant, LAT.tracking);
    let ms, trips;
    if (gw) { ms = rtt + [seqInside, parAll, orderThen][k.plan]; trips = 1; }
    else { ms = [4 * rtt + seqInside, rtt + parAll, 2 * rtt + orderThen][k.plan]; trips = 4; }
    const broken = k.plan === 1;
    const kb = gw ? 1.1 : 3.2;
    return { ms, trips, broken, kb, gw };
  }
  function gwModel(k) {
    const authPlaces = k.auth ? 1 : 7;
    const appReleases = k.reshape ? 0 : 1;
    const menuQps = k.cache ? 400 : 5000;
    const blast = [0, 10, 50, 100][k.canary];
    return { authPlaces, appReleases, menuQps, blast };
  }
  function costModel(k) {
    const stream = k.mode === 1;
    const held = stream ? Math.round(1 + k.users * 0.05) : Math.round(k.users * k.feed * 0.34);
    const oom = held > 64;
    const avail = k.partial ? 99.9 : 99.9 * 0.999 * 0.995 / 1;
    return { held, oom, avail: Number(avail.toFixed(2)), stream };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-api-composition'] = {
    t: 'Phone ek call kare, gateway andar jode',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">📱</span><span class="nl">app</span><span class="ns">1 round trip</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold"><span class="ni">🧩</span><span class="nl">gateway / composer</span><span class="ns">fan-out + merge</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-stack">
        <div class="dg-box"><span class="bx-label">🧾 order (pehle — riderId deta hai)</span></div>
        <div class="dg-box"><span class="bx-label">💳 payment · 🍳 restaurant · 🛵 tracking (ek saath)</span></div>
      </div>
    </div>
    <div class="dg-cap">Jo call pichhle jawab par nirbhar hai woh baad mein; baaki parallel.</div>`,
  };
  VISUALS['ms-gateway-powers'] = {
    t: 'Gateway — ek darwaaza, kai kaam',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-good"><span class="bx-label">🔐 Auth, rate limit, logging, trace id — ek jagah</span></div>
      <div class="dg-box is-good"><span class="bx-label">🙈 Peeche kitni services — app ko nahi pata</span></div>
      <div class="dg-box is-good"><span class="bx-label">🧽 Jaldi mein bana ajeeb response — gateway par saaf shape</span></div>
      <div class="dg-box is-good"><span class="bx-label">🌿 Strangler: /payments naye service par, baaki monolith par</span></div>
    </div>`,
  };
  VISUALS['ms-composition-cost'] = {
    t: 'Composer ki keemat',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-bad"><span class="bx-label">🧠 Bade responses memory mein jodna → OOM</span></div>
      <div class="dg-box is-bad"><span class="bx-label">🔗 Availability multiply — ek backend gira, poora page gira</span></div>
      <div class="dg-box is-bad"><span class="bx-label">✍️ Writes ke liye koi transaction nahi</span></div>
      <div class="dg-box is-bad"><span class="bx-label">🚦 Ek aur component — surge par bottleneck</span></div>
      <div class="dg-box is-bad"><span class="bx-label">🪜 Multi-level composition — latency aur failure judte hain</span></div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: API composition
       ================================================================= */
    {
      id: 'ms-api-composition',
      icon: '🧩',
      title: 'API Composition — Ek Call, Kai Services',
      badge: 'Composer Kaka',
      source: Object.assign({ at: 238 }, SRC),
      hook: {
        when: 'KhanaKart app · "Track order" page',
        title: 'Tier-2 shehar mein order page 2 second mein khulta tha',
        text: '"Track order" page ko chaar cheezein chahiye: order items (order-service), payment status (payment-service), restaurant ka naam (restaurant-service), aur rider kahan hai (delivery-service). KhanaKart app yeh chaar calls khud karti thi, ek ke baad ek. Indore ke slow 4G par har round trip 250 ms. Page 1.6 second baad poora dikhta tha, aur app mein chaar APIs ka data jodne ka code bhi likhna padta tha — Android, iOS aur web, teeno mein.',
      },
      objectives: [
        '<b>API composition</b>: ek composer (aksar API gateway) client ki jagah kai services ko call karke jawab jodta hai',
        'Sequential vs parallel fan-out — <b>dependency</b> dekh ke',
        'Client-side composition vs server-side: round trips, mobile data, client code',
        'Gateway tools: Kong, KrakenD, AWS API Gateway — khud mat banao jab tak zaroorat na ho',
      ],
      steps: [
        {
          q: 'Problem kya hai?',
          body: 'Microservices mein data bikhra hai. Ek screen ko kai services ka data chahiye. Client khud sab ko call kare toh: har call ek <b>round trip</b> (phone se data center tak), client ko har service ka address aur format pata ho, aur jodne ka code har app (Android, iOS, web) mein.',
        },
        {
          q: 'API composition kya hai?',
          analogy: 'Shaadi ka caterer: tumhe sabzi wale, doodh wale, mithai wale aur tent wale ko alag-alag call nahi karna. Tum caterer ko ek baar bolo, caterer sab jodta hai.',
          body: 'Client <b>ek request</b> composer ko bhejta hai. Composer andar ke tez network par sab services ko call karta hai, jawab jodta (merge) hai, aur ek jawab lautata hai. Composer aksar <b>API gateway</b> hota hai — client ka pehla darwaaza.',
          example: 'Tools: Kong, KrakenD, AWS API Gateway, Apigee. Khud ka composer bhi likh sakte ho (Node/Go service), par gateways routing, auth, rate limit already dete hain.',
        },
        {
          q: 'Sequential ya parallel?',
          points: [
            'Jin calls ka input <b>already paas hai</b> — parallel. (Order id se payment aur order dono.)',
            'Jis call ko <b>pichhle call ka output</b> chahiye — baad mein. (Tracking ko riderId chahiye jo order se aata hai.)',
            'Sab sequential: sabse dheema, par composer par halka.',
            'Bahut zyada parallel: composer ke threads/connections/memory khaata hai; CPU cores seemit hain.',
          ],
          asli: 'Rule: pehle dependency ka naksha, phir jahan ho sake parallel. Aur parallelism ki seema composer ki capacity se tay hoti hai.',
        },
        {
          q: 'User ko kya faayda?',
          body: '<table><tr><th></th><th>Phone khud jode</th><th>Gateway jode</th></tr>' +
            '<tr><td>Round trips</td><td>4 (har ek 250 ms)</td><td>1</td></tr>' +
            '<tr><td>Andar ki calls</td><td>Internet par</td><td>Data center ke andar (1-2 ms)</td></tr>' +
            '<tr><td>Mobile data</td><td>4 responses + headers</td><td>1 response</td></tr>' +
            '<tr><td>Client code</td><td>Jodne ka logic 3 apps mein</td><td>Sirf dikhana</td></tr></table>',
          asli: 'Backend ka faisla frontend ka experience sudharta hai — khaaskar slow network wale users ka.',
        },
      ],
      myth: [
        { myth: 'Gateway hai toh sab calls parallel kar do, sabse tez.', sach: 'Dependent call (tracking ko riderId) parallel mein galat ya khaali jawab degi. Aur har request par 20 parallel calls gateway ki capacity kha jaati hain.' },
        { myth: 'Composition sirf performance ke liye hai.', sach: 'Bada faayda client ki simplicity hai: ek address, ek response shape, backend badle toh app release nahi.' },
      ],
      playbook: {
        title: 'API composition',
        use: [
          'Ek screen ko 3+ services ka data chahiye',
          'Mobile/slow network users',
          'Kai clients (Android, iOS, web) ek hi data jodte hain',
        ],
        avoid: [
          'Composer mein business logic (price calculation) — woh service ka kaam',
          'Dependent calls ko parallel',
          'Bina seema ke parallel fan-out (har request 50 calls)',
        ],
        how: [
          'Screen ke liye data list + har field ka owner service',
          'Dependency graph: kya kiske baad',
          'Independent calls parallel, har call par timeout',
          'Managed gateway ya patla composer service',
          'Response mein sirf wahi fields jo screen dikhati hai',
        ],
        redflags: [
          'App ek screen ke liye 4+ calls karti hai',
          'Teen apps mein same merge logic',
          'Composer ka CPU/threads har release ke saath badh rahe',
        ],
        rule: 'Client ek baar poochhe — composer dependency dekh ke parallel jode.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Indore ka slow 4G',
          goal: 'Slow network (<b>RTT ≥ 250 ms</b>) par "Track order" page <b>≤ 700 ms</b>, <b>1 round trip</b>, aur rider tracking <b>sahi</b>.',
          scenario: 'Andar: order 120 ms, payment 150 ms, restaurant 100 ms, tracking 200 ms. Tracking ko riderId chahiye jo order se aata hai.',
          knobs: [
            { id: 'who', label: 'Data kaun jode', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'phone khud', 1: 'gateway (composer)' } },
            { id: 'plan', label: 'Calls ka plan', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'sab ek ke baad ek', 1: 'sab ek saath', 2: 'order pehle, phir baaki 3 ek saath' } },
            { id: 'rtt', label: 'Phone ka round trip (RTT)', min: 50, max: 400, step: 50, value: 100, unit: ' ms' },
          ],
          nodes: [N('app', 130, 80), N('gateway', 340, 340, { label: 'composer', icon: '🧩' }), N('order', 760, 60), N('payment', 830, 190), N('restaurant', 830, 320), N('delivery', 760, 450, { label: 'tracking' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'order' }, { from: 'gateway', to: 'payment' }, { from: 'gateway', to: 'restaurant' }, { from: 'gateway', to: 'delivery' }],
          model: k => {
            const m = composeModel(k);
            const okMs = m.ms <= 700, okT = m.trips === 1, okR = k.rtt >= 250;
            const src = m.gw ? 'gateway' : 'app';
            const tone = m.gw ? 'ok' : 'slow';
            return {
              nodes: {
                app: { tone: okMs && !m.broken ? 'ok' : 'bad', badge: `${m.ms} ms · ${m.trips} trips` },
                gateway: { tone: m.gw ? 'acc' : 'idle', badge: m.gw ? 'fan-out' : 'use nahi' },
                delivery: { tone: m.broken ? 'bad' : 'ok', badge: m.broken ? 'riderId? — khaali' : 'Ramesh · 14 min' },
              },
              flows: [
                m.gw ? { from: 'app', to: 'gateway', label: `1 call · RTT ${k.rtt}`, tone: 'acc' } : null,
                { from: src, to: 'order', label: 'step 1', tone },
                { from: src, to: 'payment', label: k.plan === 0 ? 'step 2' : 'saath', tone },
                { from: src, to: 'restaurant', label: k.plan === 0 ? 'step 3' : 'saath', tone },
                { from: src, to: 'delivery', label: k.plan === 0 ? 'step 4' : 'saath', tone: m.broken ? 'bad' : tone },
              ].filter(Boolean),
              readouts: [
                { label: 'Page load', value: m.ms + ' ms', tone: okMs ? 'ok' : 'bad' },
                { label: 'Round trips', value: String(m.trips), tone: okT ? 'ok' : 'bad' },
                { label: 'Mobile data', value: m.kb + ' KB', tone: m.kb < 2 ? 'ok' : 'warn' },
                { label: 'Rider tracking', value: m.broken ? 'galat (riderId nahi tha)' : 'sahi', tone: m.broken ? 'bad' : 'ok' },
              ],
              bars: [{ label: 'Page load', pct: Math.min(100, m.ms / 20), text: m.ms + ' ms', tone: okMs ? 'ok' : 'bad' }],
              verdict: !okR
                ? { ok: false, text: 'Yeh WiFi jaisa network hai. Indore ka 4G RTT 250 ms ya zyada — slider badhao.' }
                : m.broken
                  ? { ok: false, text: 'Tracking ko riderId chahiye jo order se aata hai. "Sab ek saath" mein tracking khaali/galat.' }
                  : !m.gw
                    ? { ok: false, text: `Phone khud jod raha hai: ${m.trips} round trips, ${m.ms} ms, aur merge code teen apps mein.` }
                    : !okMs
                      ? { ok: false, text: `Gateway hai par ${m.ms} ms — andar calls ek ke baad ek chal rahi hain.` }
                      : { ok: true, text: `Gateway: 1 round trip, order pehle phir 3 parallel — ${m.ms} ms, tracking sahi.` },
            };
          },
          check: k => { const m = composeModel(k); return k.rtt >= 250 && m.ms <= 700 && m.trips === 1 && !m.broken; },
          lesson: '✅ <b>Ek call, sahi kram.</b> Slow network par round trips hi sabse mehenge hain. Composer ne unhe 4 se 1 kiya aur dependency ke hisaab se parallel chalaya.',
          quiz: {
            q: 'RTT 400 ms par best plan bhi 720 ms. Ab kya karoge?',
            choices: [
              'Page ko hisson mein dikhao — order + restaurant pehle, tracking thodi der baad; ya tracking ka last known location cache se',
              'Sab calls hata do',
              'Phone ko khud 4 calls karne do',
              'Kuch nahi ho sakta',
            ],
            answer: 0,
            explain: 'Composition ke baad bhi slow network par progressive loading aur cache kaam aate hain.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — composer ke andar 330 ms',
          goal: 'Gateway "Track order" request ko kaise todta aur jodta hai — har millisecond.',
          nodes: [N('app', 130, 80), N('gateway', 340, 340, { label: 'composer', icon: '🧩' }), N('order', 760, 60), N('payment', 830, 190), N('restaurant', 830, 320), N('delivery', 760, 450, { label: 'tracking' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'order' }, { from: 'gateway', to: 'payment' }, { from: 'gateway', to: 'restaurant' }, { from: 'gateway', to: 'delivery' }],
          panels: [{ id: 'clock', title: 'Composer ki ghadi' }, { id: 'resp', title: 'Jawab ban raha hai' }],
          steps: [
            {
              clock: '0 ms',
              say: 'Priya "Track order O-501" kholti hai. App <b>ek</b> request bhejti hai: <code>GET /order-details/O-501</code>. Composer ke paas abhi sirf order id hai.',
              flows: [{ from: 'app', to: 'gateway', label: 'GET /order-details/O-501', tone: 'acc' }],
              nodes: { gateway: { tone: 'busy', badge: 'sirf orderId' } },
              panels: { clock: ['0 ms'], resp: ['{ }'] },
            },
            {
              clock: '0 → 120 ms',
              say: 'Payment ko order id kaafi hai — par restaurant ko <b>restaurantId</b> aur tracking ko <b>riderId</b> chahiye, jo order-service deti hai. Composer pehle order-service ko call karta hai.',
              flows: [{ from: 'gateway', to: 'order', label: 'orders/O-501', tone: 'acc' }],
              nodes: { order: { tone: 'ok', badge: 'riderId RD-17, R-4' } },
              panels: { clock: ['order 0→120 ms'], resp: ['items, total ₹340', 'riderId RD-17', 'restaurantId R-4'] },
              ask: {
                q: 'Payment call order ke saath (0 ms par) bhi shuru ho sakti thi. Kyun?',
                choices: ['Payment ko sirf orderId chahiye jo pehle se hai — isse ~30 ms aur bachte', 'Nahi ho sakti', 'Payment sabse dheemi hai', 'Payment ko riderId chahiye'],
                answer: 0,
                explain: 'Dependency har call ki alag dekho — "order pehle" ka matlab sab kuch order ke baad nahi.',
              },
            },
            {
              clock: '120 → 320 ms',
              say: 'Ab payment (150 ms), restaurant (100 ms) aur tracking (200 ms) <b>ek saath</b>. Sabse dheemi tracking — toh yeh hissa 200 ms ka.',
              flows: [{ from: 'gateway', to: 'payment', label: 'saath', tone: 'ok' }, { from: 'gateway', to: 'restaurant', label: 'saath', tone: 'ok' }, { from: 'gateway', to: 'delivery', label: 'RD-17', tone: 'ok' }],
              nodes: { payment: { tone: 'ok', badge: 'PAID · UPI' }, restaurant: { tone: 'ok', badge: 'Sharma Dhaba' }, delivery: { tone: 'ok', badge: 'Ramesh · 14 min' } },
              panels: { clock: ['order 0→120', 'restaurant 120→220', 'payment 120→270', 'tracking 120→320'], resp: ['items, total ₹340', 'PAID via UPI', 'Sharma Dhaba', 'Ramesh, 14 min'] },
            },
            {
              clock: '330 ms',
              say: 'Composer chaar jawab jodkar ek saaf JSON banata hai — sirf wahi fields jo page dikhata hai — aur ek response bhejta hai. Phone ne ek hi round trip kiya.',
              flows: [{ from: 'gateway', to: 'app', label: 'ek jawab (1.1 KB)', tone: 'ok', back: true }],
              nodes: { gateway: { tone: 'ok', badge: '330 ms' }, app: { tone: 'ok', badge: 'page ready' } },
              panels: { clock: ['kul ~330 ms (+ phone RTT)'] },
              ask: {
                q: 'Agar yahi composer sab 4 calls ek ke baad ek karta?',
                choices: ['~570 ms — 120+150+100+200', '~200 ms', '~330 ms', '~1,600 ms'],
                answer: 0,
                explain: 'Sequential mein andar ki latencies judti hain.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> composer = dependency ka naksha + parallel jahan mumkin + ek saaf jawab. Client ko sirf dikhana hai.',
        },
        {
          type: 'order',
          title: 'Composer banane ka kram',
          instructions: '"Track order" composer banane ke steps sahi kram mein lagao.',
          steps: [
            { text: 'Screen ke har field ki list aur uska owner service likho', explain: 'Kya chahiye, kahan se.' },
            { text: 'Har call ka input dekho — kaunsi call kis call ke output par nirbhar hai', explain: 'Dependency graph.' },
            { text: 'Independent calls ko parallel group mein rakho, har call par timeout', explain: 'Speed + safety.' },
            { text: 'Jawab jodkar sirf zaroori fields ka response shape tay karo', explain: 'Client ka contract.' },
            { text: 'App ko ek endpoint par shift karo aur purane 4 calls hatao', explain: 'Client simple.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Composition — quick check',
          questions: [
            {
              q: 'API composer ka kaam?',
              choices: ['Ek client request par kai services ko call karke jawab jodna', 'Database join karna', 'Services deploy karna', 'Events publish karna'],
              answer: 0,
              explain: 'Fan-out + merge.',
            },
            {
              q: 'Kaunsi call parallel NAHI ho sakti?',
              choices: ['Tracking, jise order se riderId chahiye', 'Payment status, jise orderId chahiye (paas hai)', 'Offers list, jise restaurantId chahiye (URL mein hai)', 'User profile, jise userId chahiye (token mein hai)'],
              answer: 0,
              explain: 'Input pehle se paas nahi.',
            },
            {
              q: 'Composition ka sabse bada faayda slow 4G users ko?',
              choices: ['Round trips kam — andar ki calls data center ke tez network par', 'Server sasta', 'Database tez', 'Kuch nahi'],
              answer: 0,
              explain: 'RTT mehenga, andar ki hop sasti.',
            },
            {
              q: 'Python composer mein 50 threads se fan-out — dikkat?',
              choices: ['GIL ki wajah se threads CPU cores par saath nahi chalte; I/O wait mein theek, par CPU kaam aur bahut threads memory/switching khaate hain', 'Python mein threads nahi hote', 'Koi dikkat nahi', 'Python HTTP nahi kar sakta'],
              answer: 0,
              explain: 'Parallelism language aur cores se bandha hai — async I/O ya managed gateway behtar.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — phone vs composer',
          project: '07-api-composition',
          exercise: 'ex1-composer',
          goal: 'Wahi page chaar tareeke se banao aur 4G phone par time, round trips aur bytes naapo.',
          steps: [
            { text: 'Install karo aur chalao.', cmd: 'cd arpitbhayaniclasses/docker-labs/07-api-composition\nnpm install\nnpm start ex1-composer' },
            { text: 'Phone simulation.', cmd: 'npm run phone', expect: 'A) Phone khud 4 services ko (ek ke baad ek)   ~1630 ms · 4 round trips\nB) Phone khud: order, phir baaki 3 ek saath   ~830 ms · 4 round trips\nC) Gateway composer, sequential               ~880 ms · 1 round trips\nD) Gateway composer, parallel                 ~580 ms · 1 round trips' },
            { text: 'Composer ki timeline dekho.', cmd: 'curl "localhost:4900/order-details/O-501?plan=parallel"', expect: '"_composer":{"plan":"parallel","ms":~330,"timeline":["order 0→123 ms","restaurant 124→228 ms","payment 124→276 ms","tracking 124→327 ms"]}' },
          ],
          observe: {
            q: 'Timeline mein payment, restaurant aur tracking sab ~124 ms par shuru hue. Kyun 0 par nahi?',
            choices: [
              'services/composer.js pehle order ka await karta hai (riderId, restaurantId ke liye), phir teeno Promise.all mein',
              'Network slow tha',
              'Backends 124 ms baad start hue',
              'Random',
            ],
            answer: 0,
            explain: 'Dependency ke baad parallel. Payment ko order ke saath shuru karna ek aur chhota sudhaar hota.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — API composition',
        instructions: 'Gateway aur composition ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Ek page ko 5 services ka data chahiye. Kaise serve karoge?"',
            choices: [
              'API composition at gateway/BFF: ek endpoint, dependency ke hisaab se parallel fan-out with timeouts, response trimming; slow parts ke liye partial response ya progressive loading',
              'Client 5 calls kare',
              'Sab services ka ek shared DB',
              'Ek naya monolith',
            ],
            answer: 0,
            explain: 'Pattern + execution details.',
          },
          {
            q: 'Interviewer: "Composer mein kitna parallelism?"',
            choices: [
              'Dependency jitna allow kare, aur composer ki capacity (connections, event loop/threads, memory) ke andar; per-downstream concurrency limits aur timeouts',
              'Jitna zyada utna achha',
              'Kabhi parallel nahi',
              'Hamesha 2',
            ],
            answer: 0,
            explain: 'Parallelism resource hai, muft nahi.',
          },
          {
            q: 'Interviewer: "Apna composer likhoge ya gateway product?"',
            choices: [
              'Routing/auth/rate-limit ke liye managed ya open-source gateway (Kong, KrakenD, AWS API Gateway); screen-specific heavy composition ke liye patla composer/BFF service',
              'Hamesha apna',
              'Hamesha product',
              'Nginx config mein sab',
            ],
            answer: 0,
            explain: 'Pahiya dobara mat banao, par product ki seema bhi pehchano.',
          },
        ],
      },
      success: [
        'Main API composition ko KhanaKart "Track order" se samjha sakta hoon',
        'Main dependency dekh ke sequential/parallel plan bana sakta hoon',
        'Main client vs server composition ka farak numbers se bata sakta hoon',
        'Main parallelism ki seemayein bata sakta hoon',
      ],
      homework: '<p>Apne app ki sabse "chatty" screen dhoondho (network tab mein sabse zyada calls). Har call ka input aur output likho, dependency graph banao, aur composer ke saath expected latency nikaalo: RTT + (dependency chain ki sabse lambi line).</p>',
      cards: [
        { front: 'API composition?', back: 'Composer (gateway) client ki jagah <b>kai services call karke jawab jodta</b> hai.' },
        { front: 'Parallel kab?', back: 'Jab call ka input <b>pehle se paas</b> ho. Pichhle output par nirbhar → baad mein.' },
        { front: 'Client ko faayda?', back: '<b>Kam round trips</b>, kam mobile data, merge code nahi, ek address.' },
        { front: 'Parallelism ki seema?', back: 'Composer ke <b>cores, connections, memory</b>; language (Python GIL).' },
      ],
    },

    /* =================================================================
       LEVEL: Gateway powers
       ================================================================= */
    {
      id: 'ms-gateway-powers',
      icon: '🚪',
      title: 'Gateway ki Taaqat — Security, Saaf Response, Strangler Migration',
      badge: 'Darwaaza Daroga',
      source: Object.assign({ at: 843 }, SRC),
      hook: {
        when: 'KhanaKart · monolith todne ka plan',
        title: '"Payments ko monolith se nikalo — par app ka ek bhi release nahi"',
        text: 'KhanaKart ka 8 saal purana monolith. Payments ko alag service banana hai. Mushkil: Android app ke 30% users 6 mahine tak update nahi karte. Upar se monolith ka payment response jaldi mein bana tha — <code>{"s":1,"amt_paise":34000,"m":"U"}</code> — aur nayi web team is format se pareshaan hai. Aur har service apna auth aur rate limiting alag-alag likh rahi hai; teen services mein token check ka bug alag-alag nikla.',
      },
      objectives: [
        'Gateway = client ka <b>ek darwaaza</b>; peeche kitni services, client ko nahi pata',
        '<b>Cross-cutting kaam</b> ek jagah: auth, rate limiting, logging, tracing, caching',
        'Jaldi mein bane ajeeb response ko gateway par <b>saaf shape</b> dena',
        '<b>Strangler fig migration</b>: gateway routing se monolith ko dheere-dheere todna',
      ],
      steps: [
        {
          q: 'Ek darwaaza hone ka faayda?',
          body: 'Client sirf <code>api.khanakart.in</code> jaanta hai. Peeche 5 services hon ya 50 — client ko farak nahi. Service split karo, naam badlo, merge karo — gateway routing badlo, app release nahi.',
        },
        {
          q: 'Gateway par kaunse common kaam?',
          analogy: 'Office building ka reception: ID check, visitor register, "ek din mein 10 se zyada baar nahi" — har floor par alag guard nahi rakhte.',
          points: [
            '<b>Authentication</b>: token/API key verify — ek jagah, ek bug-free implementation.',
            '<b>Rate limiting</b>: per user/app/IP — bots aur galti se loop mein phase clients se bachaav.',
            '<b>Logging + trace id</b>: har request ki ek line, har service tak jaata trace id.',
            '<b>Caching</b>: public menu jaise responses 30 second cache — monolith ka load 90% kam.',
          ],
          asli: 'Authorization ("kya yeh order is user ka hai?") service mein hi rahe — business rule hai. Gateway sirf "kaun hai" pakka karta hai.',
        },
        {
          q: 'Ajeeb response ko saaf kaise karein?',
          body: 'Tez badhti startup mein payments team ne jaldi mein response bana diya: <code>{"s":1,"amt_paise":34000,"m":"U"}</code>. Frontend ko chahiye <code>{"status":"PAID","amount":340,"method":"UPI"}</code>. Gateway beech mein <b>reshape</b> karta hai — frontend saaf contract dekhta hai, payments team baad mein apna API theek kare.',
          asli: 'Yeh ek sahi "jugaad" hai — par temporary. Reshape logic gateway mein jama hota gaya toh gateway naya monolith ban jaata hai. Har reshape ka owner aur hatane ki date likho.',
        },
        {
          q: 'Strangler fig migration kya hai?',
          analogy: 'Strangler fig (bargad jaisi bel) purane ped ke chaaron taraf dheere-dheere badhti hai. Saalon baad purana ped andar se khatam ho jaata hai aur bel khadi rehti hai.',
          body: 'Gateway saari traffic monolith ko bhejta hai. Naya payment-service banao. Gateway mein rule: <code>/payments/*</code> → payment-service (pehle 10% users, phir 100%). Baaki sab monolith. Phir <code>/menu</code>, phir <code>/orders</code>. Users ko pata bhi nahi chalta, aur galti ho toh gateway rule wapas — 1 minute mein rollback.',
        },
      ],
      myth: [
        { myth: 'Gateway par saari security ho gayi, services ko kuch check nahi karna.', sach: 'Gateway authentication aur rate limit karta hai. Authorization (resource kiska hai), input validation aur service-to-service auth (mTLS) services mein bhi chahiye — andar ka network bhi bharosemand nahi.' },
        { myth: 'Monolith todne ke liye big-bang rewrite sabse saaf hai.', sach: 'Big-bang mein mahino tak kuch ship nahi hota aur switch ke din sab ek saath tootta hai. Strangler mein ek route, chhota risk, turant rollback.' },
      ],
      playbook: {
        title: 'API gateway',
        use: [
          'Kai clients, kai services — ek public entry point',
          'Auth, rate limit, logging ek jagah',
          'Monolith se services nikaalna (strangler)',
          'Purane/ajeeb API ko temporarily saaf contract dena',
        ],
        avoid: [
          'Gateway mein business logic aur har team ke reshape jama karna',
          'Authorization sirf gateway par',
          'Gateway config bina version control aur review ke',
        ],
        how: [
          'Routes version control mein (declarative config)',
          'Auth plugin + per-client rate limits',
          'Trace id header generate karke aage bhejo',
          'Strangler: naya service → 1-10% canary → metrics compare → 100% → purana code hatao',
          'Har reshape/hack ka owner + expiry',
        ],
        redflags: [
          'Gateway ka code service jitna bada',
          'Har service apna token parser',
          'Rollback ke liye app release chahiye',
        ],
        rule: 'Gateway darwaaza hai, dimaag nahi — common kaam yahan, business logic services mein.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — gateway config karo',
          goal: 'Auth <b>1 jagah</b>, app release <b>0</b>, monolith par menu load <b>≤ 500 req/s</b>, aur aaj naya payment-service <b>10% users (canary)</b> par.',
          scenario: 'Aaj 7 services apna token check khud karti hain. Monolith ka payment response ajeeb hai. Menu page 5,000 req/s monolith ko bhejta hai.',
          knobs: [
            { id: 'auth', label: 'Authentication', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'har service khud', 1: 'gateway par' } },
            { id: 'reshape', label: 'Payment response', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'jaisa hai (app parse kare)', 1: 'gateway reshape' } },
            { id: 'cache', label: 'Menu cache (30 s)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'gateway par' } },
            { id: 'canary', label: '/payments → naya service', min: 0, max: 3, step: 1, value: 0, labels: { 0: '0% (monolith)', 1: '10% canary', 2: '50%', 3: '100% ek saath' } },
          ],
          nodes: [N('app', 135, 260), N('gateway', 420, 260), N('coupon', 780, 90, { id: 'mono', icon: '🏛️', label: 'monolith' }), N('payment', 760, 430, { label: 'payment-service (naya)' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'mono' }, { from: 'gateway', to: 'payment', dashed: true }],
          model: k => {
            const m = gwModel(k);
            const okA = m.authPlaces === 1, okR = m.appReleases === 0, okC = m.menuQps <= 500, okCan = k.canary === 1;
            return {
              nodes: {
                gateway: { tone: 'acc', badge: [k.auth ? 'auth' : null, k.reshape ? 'reshape' : null, k.cache ? 'cache' : null].filter(Boolean).join(' · ') || 'sirf routing' },
                mono: { tone: okC ? 'ok' : 'busy', badge: `menu ${m.menuQps.toLocaleString('en-IN')} req/s · payments ${100 - m.blast}%` },
                payment: { tone: m.blast === 0 ? 'idle' : m.blast === 100 ? 'slow' : 'new', badge: m.blast ? `${m.blast}% users` : 'abhi band' },
                app: { tone: okR ? 'ok' : 'slow', badge: okR ? 'koi release nahi' : 'release: s/amt_paise parse' },
              },
              flows: [
                { from: 'app', to: 'gateway', tone: 'acc' },
                { from: 'gateway', to: 'mono', label: k.cache ? 'cache miss hi' : 'har menu request', tone: okC ? 'ok' : 'slow', rate: okC ? 0.2 : 1 },
                m.blast ? { from: 'gateway', to: 'payment', label: `/payments ${m.blast}%`, tone: m.blast === 100 ? 'slow' : 'ok' } : null,
              ].filter(Boolean),
              readouts: [
                { label: 'Auth kitni jagah', value: String(m.authPlaces), tone: okA ? 'ok' : 'bad' },
                { label: 'App releases chahiye', value: String(m.appReleases), tone: okR ? 'ok' : 'bad' },
                { label: 'Monolith menu load', value: m.menuQps.toLocaleString('en-IN') + ' req/s', tone: okC ? 'ok' : 'bad' },
                { label: 'Naye service ke bug ka blast radius', value: m.blast + '% users', tone: m.blast <= 10 ? 'ok' : 'warn' },
              ],
              bars: [{ label: 'Traffic naye service par', pct: m.blast, text: m.blast + '%', tone: okCan ? 'ok' : 'warn' }],
              verdict: !okA
                ? { ok: false, text: '7 services, 7 token parsers — ek mein bug = security hole. Auth gateway par lao.' }
                : !okR
                  ? { ok: false, text: 'App ko s/amt_paise parse karna padega — release aur 6 mahine purane users. Gateway reshape karo.' }
                  : !okC
                    ? { ok: false, text: 'Menu public hai aur har 30 s mein hi badalta hai — 5,000 req/s monolith par kyun?' }
                    : k.canary === 3
                      ? { ok: false, text: 'Pehle hi din 100% — naye service ka koi bug sab users par. Pehle 10% canary.' }
                      : !okCan
                        ? { ok: false, text: k.canary === 0 ? 'Aaj migration shuru karni hai — 10% users naye payment-service par bhejo.' : '50% abhi jaldi — pehle 10% par metrics compare karo.' }
                        : { ok: true, text: 'Auth ek jagah, app untouched, menu cached, aur payment-service 10% canary par — gateway rule se 1 minute mein rollback.' },
            };
          },
          check: k => { const m = gwModel(k); return m.authPlaces === 1 && m.appReleases === 0 && m.menuQps <= 500 && k.canary === 1; },
          lesson: '✅ <b>Gateway ne kaam kiya, services ne business.</b> Common concerns ek jagah, ajeeb response saaf, aur strangler migration bina app release — chhote canary se.',
          quiz: {
            q: '10% canary par naye payment-service ka error rate 0.4% hai aur monolith ka 0.1%. Agla kadam?',
            choices: [
              'Gateway rule se traffic wapas 0% (rollback), bug theek karo, phir dobara 10%',
              'Seedha 100% kar do',
              'Monolith band kar do',
              'Kuch nahi, 0.4% kam hai',
            ],
            answer: 0,
            explain: 'Canary ka matlab hi compare + rollback. Gateway yeh sasta banata hai.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — payments ka strangler, 4 mahine',
          goal: 'Gateway ke routing rules har mahine kaise badle aur user ko kya dikha.',
          nodes: [N('app', 130, 260), N('gateway', 410, 260), N('coupon', 780, 70, { id: 'mono', icon: '🏛️', label: 'monolith' }), N('payment', 780, 260, { label: 'payment-service' }), N('restaurant', 780, 430, { id: 'menu', icon: '📋', label: 'menu-service' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'mono' }, { from: 'gateway', to: 'payment', dashed: true }, { from: 'gateway', to: 'menu', dashed: true }],
          panels: [{ id: 'rules', title: 'Gateway routes' }, { id: 'user', title: 'User ko kya dikha' }],
          steps: [
            {
              say: '<b>Mahina 0.</b> Gateway monolith ke aage lagaya. Sab routes monolith par. Auth aur rate limit gateway par shift. Payment response gateway par reshape.',
              flows: [{ from: 'app', to: 'gateway', tone: 'acc' }, { from: 'gateway', to: 'mono', label: '/* (reshape /payments)', tone: 'ok' }],
              nodes: { mono: { tone: 'busy', badge: 'sab kuch' }, payment: { tone: 'idle', badge: 'ban raha' }, menu: { tone: 'idle', badge: '—' } },
              panels: { rules: ['/* → monolith'], user: ['Kuch nahi badla'] },
            },
            {
              say: '<b>Mahina 1.</b> payment-service taiyaar. Rule: <code>/payments/*</code> → 10% payment-service, 90% monolith. Dashboards par dono ka error rate aur latency.',
              flows: [{ from: 'gateway', to: 'payment', label: '/payments 10%', tone: 'ok' }, { from: 'gateway', to: 'mono', label: 'baaki', tone: 'ok' }],
              nodes: { payment: { tone: 'new', badge: '10%' } },
              panels: { rules: ['/payments/* → 10% new', '/* → monolith'], user: ['Kuch nahi badla'] },
            },
            {
              say: 'Canary par UPI refunds mein bug — error 0.4%. On-call gateway rule 0% karta hai. <b>1 minute</b> mein sab users wapas monolith par. Koi app release nahi.',
              flows: [{ from: 'gateway', to: 'mono', label: '/payments 100% wapas', tone: 'slow' }],
              nodes: { payment: { tone: 'bad', badge: 'bug · 0%' } },
              panels: { rules: ['/payments/* → 0% new (rollback)', '/* → monolith'], user: ['10% users ke kuch refunds 3 min atke, phir theek'] },
              ask: {
                q: 'Big-bang switch (ek din mein sab naye service par) mein yahi bug?',
                choices: ['100% users par, aur rollback matlab deploy/app release — ghante', 'Utna hi asar', 'Bug nahi aata', 'Gateway khud theek karta'],
                answer: 0,
                explain: 'Strangler + canary = chhota blast radius + sasta rollback.',
              },
            },
            {
              say: '<b>Mahina 2.</b> Bug theek. 10% → 50% → 100%. Monolith ka payment code delete. Gateway ka payment reshape bhi hata — naya service khud saaf response deta hai.',
              flows: [{ from: 'gateway', to: 'payment', label: '/payments 100%', tone: 'ok' }, { from: 'gateway', to: 'mono', label: 'baaki', tone: 'ok' }],
              nodes: { payment: { tone: 'ok', badge: '100%' }, mono: { tone: 'ok', badge: 'payments code gaya' } },
              panels: { rules: ['/payments/* → payment-service', '/* → monolith'], user: ['Kuch nahi badla'] },
            },
            {
              say: '<b>Mahina 4.</b> Agla route: <code>/menu/*</code> → menu-service. Monolith har mahine patla. Bel badh rahi hai, purana ped sukh raha hai.',
              flows: [{ from: 'gateway', to: 'menu', label: '/menu 100%', tone: 'ok' }, { from: 'gateway', to: 'payment', tone: 'ok' }, { from: 'gateway', to: 'mono', label: 'orders, profile...', tone: 'ok', rate: 0.3 }],
              nodes: { menu: { tone: 'new', badge: '100%' }, mono: { tone: 'ok', badge: 'aur patla' } },
              panels: { rules: ['/payments/* → payment-service', '/menu/* → menu-service', '/* → monolith'] },
              ask: {
                q: 'Is poore safar mein app ke kitne releases lage?',
                choices: ['0 — app sirf gateway ka URL jaanti hai', '4', 'Har route ka ek', '2'],
                answer: 0,
                explain: 'Ek darwaaza = peeche ka ghar badalte raho.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> gateway routing monolith todne ka sabse sasta aur surakshit tareeka hai — ek route, chhota canary, turant rollback.',
        },
        {
          type: 'bins',
          title: 'Gateway par ya service mein?',
          instructions: 'Har kaam ko sahi jagah daalo.',
          bins: [{ id: 'gw', label: '🚪 Gateway' }, { id: 'svc', label: '🧩 Service' }],
          items: [
            { text: 'JWT token signature aur expiry check', bin: 'gw', explain: 'Authentication — ek jagah.' },
            { text: '"Kya order O-501 isi user ka hai?"', bin: 'svc', explain: 'Authorization — business data chahiye.' },
            { text: 'Per-app 100 requests/second limit', bin: 'gw', explain: 'Rate limiting.' },
            { text: 'Coupon lagne ke baad final price', bin: 'svc', explain: 'Business logic.' },
            { text: 'Har request par trace id banana', bin: 'gw', explain: 'Entry point par shuru.' },
            { text: 'Public restaurant menu ka 30 s cache', bin: 'gw', explain: 'Response caching.' },
            { text: 'Order cancel window (5 minute) ka rule', bin: 'svc', explain: 'Business rule.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Gateway — quick check',
          questions: [
            {
              q: 'Strangler fig pattern mein gateway ka role?',
              choices: ['Route-by-route traffic monolith se naye services par shift karna, rollback ke saath', 'Monolith ka code delete karna', 'Database migrate karna', 'App update karna'],
              answer: 0,
              explain: 'Routing hi strangler ka lever hai.',
            },
            {
              q: 'Gateway par response reshape karne ka khatra?',
              choices: ['Gateway mein logic jama hote-hote gateway naya monolith ban jaata hai', 'Response slow', 'Security hole', 'Koi khatra nahi'],
              answer: 0,
              explain: 'Temporary jugaad — owner aur expiry ke saath.',
            },
            {
              q: 'Client ko "implementation details chhupana" ka asli faayda?',
              choices: ['Services split/merge/rename karo bina client release ke', 'Hackers ko confuse karna', 'Latency kam', 'Kam servers'],
              answer: 0,
              explain: 'Contract gateway par stable.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — gateway ke 5 kaam',
          project: '07-api-composition',
          exercise: 'ex2-gateway-powers',
          goal: 'Auth, rate limit, reshape, cache aur strangler routing — curl se har ek dekho.',
          steps: [
            { text: 'Chalao aur bina key / key ke saath payment.', cmd: "npm start ex2-gateway-powers\ncurl -i localhost:4910/payments/O-501\ncurl -i -H 'x-api-key: app-android-123' localhost:4910/payments/O-501\ncurl localhost:4911/legacy/payment?oid=O-501", expect: '401 "x-api-key missing ya galat"\n200 x-served-by: monolith (reshaped) {"status":"PAID","amount":340,"method":"UPI",...}\nmonolith asal: {"s":1,"amt_paise":34000,"m":"U",...}' },
            { text: 'Rate limit.', cmd: "for i in $(seq 1 12); do curl -s -o /dev/null -w \"%{http_code} \" -H 'x-api-key: app-android-123' localhost:4910/api/profile; done", expect: '200 200 ... 429 429' },
            { text: 'Ctrl+C. Strangler + cache.', cmd: "STRANGLER=1 CACHE=1 npm start ex2-gateway-powers\ncurl -i -H 'x-api-key: app-ios-456' localhost:4910/payments/O-501\ncurl -i -H 'x-api-key: app-ios-456' localhost:4910/menu/R-4\ncurl -i -H 'x-api-key: app-ios-456' localhost:4910/menu/R-4", expect: 'x-served-by: payment-service\nx-cache: MISS (~250 ms)\nx-cache: HIT (~3 ms)' },
          ],
          observe: {
            q: 'STRANGLER=1 par app ko kya badalna pada?',
            choices: [
              'Kuch nahi — URL /payments/O-501 aur response shape wahi; sirf gateway ka route badla',
              'Naya URL',
              'Naya API key',
              'App release',
            ],
            answer: 0,
            explain: 'services/gateway.js: STRANGLER par PAY URL, warna MONO + reshape. Client ke liye dono same contract.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Gateway',
        instructions: 'Gateway design ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "API gateway ki responsibilities?"',
            choices: [
              'Routing, authentication, rate limiting/quotas, TLS termination, request/response transformation, caching, logging/metrics/tracing, composition; business logic nahi',
              'Sirf load balancing',
              'Database queries',
              'Business rules',
            ],
            answer: 0,
            explain: 'Cross-cutting concerns.',
          },
          {
            q: 'Interviewer: "Monolith ko microservices mein kaise migrate karoge?"',
            choices: [
              'Strangler fig: gateway/proxy aage lagao, ek bounded context ko naye service mein nikalo, route-by-route canary shift, metrics compare, purana code hatao, repeat',
              'Big-bang rewrite',
              'Sab code copy-paste',
              'Pehle saare databases alag karo, phir sochenge',
            ],
            answer: 0,
            explain: 'Incremental, reversible.',
          },
          {
            q: 'Interviewer: "Gateway single point of failure nahi banega?"',
            choices: [
              'Gateway stateless, multiple instances load balancer ke peeche, multi-AZ, autoscaling, aur config changes canary ke saath; managed gateways yeh dete hain',
              'Haan, isliye gateway mat lagao',
              'Ek bada server kaafi',
              'Gateway kabhi fail nahi hota',
            ],
            answer: 0,
            explain: 'SPOF nahi, par bottleneck ban sakta hai — agla level.',
          },
        ],
      },
      success: [
        'Main gateway par kaunse kaam hone chahiye aur kaunse nahi, bata sakta hoon',
        'Main ajeeb response reshape ka faayda aur khatra samjha sakta hoon',
        'Main strangler fig migration step-by-step plan kar sakta hoon',
        'Main canary + rollback gateway se samjha sakta hoon',
      ],
      homework: '<p>Apne system ka ek purana module chuno jo alag service ban sakta hai. Strangler plan likho: gateway route, canary %, compare karne wale metrics, rollback step, aur purana code hatane ki shart.</p>',
      cards: [
        { front: 'Gateway ke common kaam?', back: '<b>Auth, rate limit, logging/trace, caching</b>, routing, transformation.' },
        { front: 'Gateway par kya nahi?', back: '<b>Business logic</b> aur authorization rules.' },
        { front: 'Strangler fig?', back: 'Gateway se <b>route-by-route</b> traffic naye services par; monolith dheere-dheere khatam.' },
        { front: 'Reshape jugaad ka niyam?', back: 'Temporary — <b>owner + expiry</b>, warna gateway naya monolith.' },
      ],
    },

    /* =================================================================
       LEVEL: Composition cost
       ================================================================= */
    {
      id: 'ms-composition-cost',
      icon: '⚠️',
      title: 'Composition ki Keemat — Memory, Availability, Bottleneck',
      badge: 'Seema Samjhdaar',
      source: Object.assign({ at: 1127 }, SRC),
      hook: {
        when: 'KhanaKart · Diwali · 8:00 PM',
        title: 'Home feed composer ne memory kha li',
        text: 'Diwali special home feed: 20 restaurants ke poore menus ek saath, taaki app scroll par tez lage. Har menu ~200 KB. Gateway har request par 20 menus memory mein jodta tha. 8 baje traffic 5 guna hua. Gateway pods ek-ek karke OOMKilled — aur gateway ke saath login, orders, payments sab ruk gaye, kyunki sab usi darwaaze se aate hain. Usi hafte reviews-service 3 minute down hui aur restaurant page poora blank dikha — menu aur offers theek the.',
      },
      objectives: [
        '<b>Memory</b>: composer bade responses jodta hai — users × size',
        '<b>Availability</b>: composed response = sab backends ka multiply; partial response se bachaav',
        '<b>Writes</b>: composition se transaction nahi milta',
        '<b>Ek aur component</b> aur surge par <b>bottleneck</b>; <b>multi-level composition</b> ka dard',
      ],
      steps: [
        {
          q: 'Memory kaise phatti hai?',
          body: 'Buffer karne wala composer har backend ka poora jawab memory mein rakhta hai, jodta hai, phir bhejta hai. Memory ≈ <b>ek saath chal rahe requests × har request ka jodha hua size</b>.',
          example: '20 menus × 200 KB = 4 MB data, JSON parse + naya jodha hua body ≈ 7 MB har request. 30 users ek saath = ~200 MB. Gateway container ki limit 64 MB → OOMKilled.',
          asli: 'Bachaav: chhote responses (pagination — pehle 5 restaurants), streaming (aate hi aage bhejo), field trimming, aur gateway ko sahi size.',
        },
        {
          q: 'Availability multiply kaise hoti hai?',
          body: 'Restaurant page: menu (99.9%) + offers (99.9%) + reviews (99.5%). Composer "sab ya kuch nahi" kare toh page availability = 0.999 × 0.999 × 0.995 ≈ <b>99.3%</b>. Reviews gira → poora page gira.',
          points: [
            '<b>Partial response</b>: zaroori hissa (menu) na mile toh fail; optional (reviews, offers) na mile toh <code>null</code> + <code>degraded: ["reviews"]</code>.',
            'App "Reviews abhi load nahi hue" dikhaye — user order kar sake.',
          ],
        },
        {
          q: 'Writes ke liye composition kyun nahi?',
          body: 'Composer ek request se teen services mein likhe (order + payment + loyalty) aur beech mein ek fail ho — koi rollback nahi. Composition <b>reads</b> ke liye achha hai. Multi-service writes ke liye saga/orchestration (Level "Apne DB ki Keemat").',
        },
        {
          q: 'Ek aur component aur bottleneck ka matlab?',
          points: [
            'Gateway ko bhi <b>deploy, monitor, alert, scale</b> karna hai — managed ho tab bhi config aur limits aapke.',
            'Sab traffic gateway se → surge par gateway ke connections/CPU/memory pehle khatam. SPOF nahi (kai instances), par <b>bottleneck</b>.',
            'Bahut zyada parallel fan-out bottleneck ko jaldi laata hai.',
          ],
        },
        {
          q: 'Multi-level composition kya hai?',
          body: 'Gateway → order-service → jo khud restaurant aur inventory ko call karti hai → inventory khud pricing ko. 10-15 saal purane systems mein aam hai — koi service todna nahi chahta. Har level latency jodta hai aur availability multiply karta hai.',
          asli: 'Low latency ke liye achha nahi, par asli duniya hai. Naksha banao, timeouts ka budget rakho, aur jahan ho sake level ghatao.',
        },
      ],
      myth: [
        { myth: 'Gateway ke 10 instances hain toh bottleneck nahi ho sakta.', sach: 'Har instance ki memory/connections seemit hain. Ek bhaari endpoint (Diwali feed) sab instances ko ek saath gira sakta hai — aur saath mein login bhi.' },
        { myth: 'Partial response matlab bug chhupana.', sach: 'Partial response ek design faisla hai: kaunsa hissa zaroori hai, kaunsa nahi. Degraded fields response aur metrics mein saaf dikhte hain.' },
      ],
      playbook: {
        title: 'composition ki keemat sambhalna',
        use: [
          'Pagination / limit — composer kabhi "sab kuch" na jode',
          'Streaming ya chunked responses bade data ke liye',
          'Partial responses optional hisson ke liye',
          'Bhaari endpoints ke liye alag gateway pool (bulkhead)',
        ],
        avoid: [
          'Composer se multi-service writes',
          'Har request par unbounded fan-out',
          'Login aur Diwali feed ek hi gateway pool mein',
        ],
        how: [
          'Har composed endpoint: max fan-out, max response size, timeout budget',
          'Required vs optional fields likho; optional fail par degraded flag',
          'Gateway memory/connection metrics + alerts',
          'Load test peak ke 3-5 guna par',
          'Multi-level chains ka naksha aur level ghataane ka plan',
        ],
        redflags: [
          'Gateway memory har traffic spike ke saath seedhi upar',
          'Ek backend down = page blank',
          'Composer se POST jo 3 services mein likhta hai',
        ],
        rule: 'Composer jitna jode, utna jokhim — size seemit karo, optional ko optional rakho.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Diwali ka home feed',
          goal: '<b>40 users</b> ek saath, feed mein <b>20 restaurants</b>: gateway memory <b>≤ 64 MB</b> aur restaurant page availability <b>≥ 99.8%</b>.',
          scenario: 'Har menu ~200 KB. Buffer mode sab menus parse karke jodta hai (~0.34 MB/restaurant). Stream mode aate hi aage bhejta hai. Page backends: menu 99.9%, offers 99.9%, reviews 99.5%.',
          knobs: [
            { id: 'users', label: 'Ek saath users', min: 5, max: 50, step: 5, value: 10 },
            { id: 'feed', label: 'Restaurants per feed', min: 5, max: 40, step: 5, value: 20 },
            { id: 'mode', label: 'Composer mode', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'buffer (sab jodo, phir bhejo)', 1: 'stream (aate hi bhejo)' } },
            { id: 'partial', label: 'Reviews/offers fail par', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'poora page fail', 1: 'partial response' } },
          ],
          nodes: [N('app', 140, 260), N('gateway', 420, 260, { label: 'gateway (64 MB)' }), N('restaurant', 800, 70, { id: 'menu', icon: '📋', label: 'menu' }), N('coupon', 840, 260, { id: 'offers', icon: '🏷️', label: 'offers' }), N('review', 800, 450, { label: 'reviews' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'menu' }, { from: 'gateway', to: 'offers' }, { from: 'gateway', to: 'review' }],
          model: k => {
            const m = costModel(k);
            const okU = k.users >= 40 && k.feed >= 20, okM = !m.oom, okA = m.avail >= 99.8;
            return {
              nodes: {
                gateway: { tone: m.oom ? 'bad' : m.held > 40 ? 'slow' : 'ok', badge: m.oom ? `💥 OOMKilled (${m.held} MB)` : `${m.held} MB held` },
                app: { tone: m.oom ? 'bad' : 'ok', badge: m.oom ? 'sab ruk gaya (login bhi)' : 'feed chal rahi' },
                review: { tone: k.partial ? 'slow' : 'bad', badge: k.partial ? '99.5% · optional' : '99.5% · zaroori' },
                offers: { tone: 'ok', badge: k.partial ? '99.9% · optional' : '99.9% · zaroori' },
                menu: { tone: 'ok', badge: `${k.feed} × 200 KB` },
              },
              flows: [
                { from: 'app', to: 'gateway', label: `${k.users} users`, tone: m.oom ? 'bad' : 'acc', rate: k.users / 50 },
                { from: 'gateway', to: 'menu', label: m.stream ? 'stream' : 'buffer', tone: m.oom ? 'bad' : 'ok' },
                { from: 'gateway', to: 'offers', tone: 'ok', rate: 0.3 },
                { from: 'gateway', to: 'review', tone: k.partial ? 'slow' : 'bad', rate: 0.3 },
              ],
              readouts: [
                { label: 'Gateway memory', value: `${m.held} / 64 MB`, tone: okM ? 'ok' : 'bad' },
                { label: 'Page availability', value: m.avail + '%', tone: okA ? 'ok' : 'bad' },
                { label: 'Downtime / mahina (page)', value: Math.round((100 - m.avail) / 100 * 43200) + ' min', tone: okA ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Memory', pct: Math.min(100, m.held / 64 * 100), text: `${m.held} MB`, tone: okM ? 'ok' : 'bad' }],
              verdict: !okU
                ? { ok: false, text: 'Diwali ki raat: kam se kam 40 users aur 20 restaurants/feed — sliders badhao.' }
                : m.oom
                  ? { ok: false, text: `Buffer: ${k.users} × ${k.feed} × 0.34 MB ≈ ${m.held} MB > 64 MB → OOMKilled. Gateway ke saath login aur payments bhi gaye.` }
                  : !okA
                    ? { ok: false, text: `Memory theek, par page ${m.avail}% — reviews gira toh poora page blank (~${Math.round((100 - m.avail) / 100 * 43200)} min/mahina).` }
                    : { ok: true, text: `Stream: ${m.held} MB. Partial response: page ${m.avail}% — reviews gire toh "reviews abhi nahi" dikhe, order chale.` },
            };
          },
          check: k => { const m = costModel(k); return k.users >= 40 && k.feed >= 20 && !m.oom && m.avail >= 99.8; },
          lesson: '✅ <b>Composer ki seemayein sambhaali.</b> Stream ne memory ko users × size se azaad kiya, aur partial response ne optional backends ki availability ko page ki availability banne se roka.',
          quiz: {
            q: 'Stream ke alawa memory ka sabse seedha fix?',
            choices: [
              'Pagination — pehle 5 restaurants, scroll par agle 5; response hi chhota',
              'Gateway ki memory 10 GB',
              'Menu JSON compress karke memory mein rakho',
              'Users ko rok do',
            ],
            answer: 0,
            explain: 'Sabse sasta bachaav: kam data jodo.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — multi-level composition ki seedhi',
          goal: '"Restaurant page" request ek purane system mein kitne levels se guzarti hai, aur har level kya jodta hai.',
          nodes: [N('app', 115, 260), N('gateway', 360, 260), N('restaurant', 590, 110, { label: 'restaurant-svc' }), N('review', 590, 420, { label: 'reviews' }), N('inventory', 860, 110), N('coupon', 860, 300, { id: 'pricing', icon: '💰', label: 'pricing' })],
          edges: [{ from: 'app', to: 'gateway' }, { from: 'gateway', to: 'restaurant' }, { from: 'gateway', to: 'review' }, { from: 'restaurant', to: 'inventory' }, { from: 'inventory', to: 'pricing' }],
          panels: [{ id: 'lat', title: 'Latency' }, { id: 'avail', title: 'Availability (sab zaroori)' }],
          steps: [
            {
              say: '<b>Level 1.</b> Gateway page ke liye restaurant-svc aur reviews ko ek saath call karta hai.',
              flows: [{ from: 'app', to: 'gateway', tone: 'acc' }, { from: 'gateway', to: 'restaurant', tone: 'acc' }, { from: 'gateway', to: 'review', label: '80 ms', tone: 'ok' }],
              nodes: { gateway: { tone: 'busy', badge: 'level 1' } },
              panels: { lat: ['reviews 80 ms'], avail: ['gateway 99.95%', 'reviews 99.5%'] },
            },
            {
              say: '<b>Level 2.</b> Restaurant-svc 12 saal purani hai — dishes ke stock ke liye khud inventory ko call karti hai (koi todna nahi chahta).',
              flows: [{ from: 'restaurant', to: 'inventory', label: 'stock?', tone: 'acc' }],
              nodes: { restaurant: { tone: 'busy', badge: 'level 2' } },
              panels: { avail: ['gateway 99.95%', 'reviews 99.5%', 'restaurant 99.9%'] },
            },
            {
              say: '<b>Level 3.</b> Inventory "aaj ka daam" ke liye pricing ko call karti hai. Pricing 150 ms. Ab chain: gateway → restaurant (60) → inventory (40) → pricing (150).',
              flows: [{ from: 'inventory', to: 'pricing', label: '150 ms', tone: 'slow' }],
              nodes: { inventory: { tone: 'busy', badge: 'level 3' }, pricing: { tone: 'slow', badge: '150 ms' } },
              panels: { lat: ['reviews 80 ms', 'restaurant 60 + inventory 40 + pricing 150 = 250 ms', 'page ≈ 250 ms'], avail: ['gateway 99.95%', 'reviews 99.5%', 'restaurant 99.9%', 'inventory 99.9%', 'pricing 99.9%'] },
              ask: {
                q: 'Sab zaroori maano toh page ki availability lagbhag?',
                choices: ['~99.15% — paanch components multiply', '99.95%', '99.5%', '~95%'],
                answer: 0,
                explain: '0.9995 × 0.995 × 0.999 × 0.999 × 0.999 ≈ 0.9915 → ~6 ghante/mahina.',
              },
            },
            {
              say: 'Pricing ka deploy toota. Inventory ka timeout 2 s, restaurant ka 2 s, gateway ka 2 s — sab same. Gateway pehle haar maanta hai, page error. Inventory aur restaurant abhi bhi intezaar kar rahe hain — kaam barbaad.',
              flows: [{ from: 'inventory', to: 'pricing', label: 'hang', tone: 'bad' }, { from: 'gateway', to: 'app', label: '504', tone: 'bad', back: true }],
              nodes: { pricing: { tone: 'bad', badge: 'down' }, inventory: { tone: 'slow', badge: 'wait 2 s' }, restaurant: { tone: 'slow', badge: 'wait 2 s' }, gateway: { tone: 'bad', badge: '504 at 2 s' } },
              ask: {
                q: 'Sabse achha sudhaar?',
                choices: [
                  'Timeout budget (gateway 1.5 s > restaurant 1 s > inventory 600 ms) + inventory mein pricing ka cached daam fallback + stock optional',
                  'Sab timeouts 10 s',
                  'Pricing ko reboot',
                  'Reviews hata do',
                ],
                answer: 0,
                explain: 'Level "Sync ke Dard" ka timeout budget yahan phir.',
              },
            },
            {
              say: 'Lambi yojana: restaurant page ke liye stock aur daam events se restaurant-svc ki apni read copy mein. Chain 3 levels se 1 level. Latency 250 → 70 ms.',
              flows: [{ from: 'gateway', to: 'restaurant', label: 'apni copy', tone: 'ok' }, { from: 'gateway', to: 'review', tone: 'ok' }],
              nodes: { restaurant: { tone: 'ok', badge: '70 ms' }, inventory: { tone: 'idle', badge: 'events' }, pricing: { tone: 'idle', badge: 'events' }, gateway: { tone: 'ok', badge: 'level 1 only' } },
              panels: { lat: ['page ≈ 80 ms'] },
            },
          ],
          lesson: '<b>Asli baat:</b> har composition level latency jodta hai aur availability ghatata hai. Purane systems mein yeh sach hai — naksha banao, timeout budget do, aur dheere-dheere levels ghatao.',
        },
        {
          type: 'match',
          title: 'Dard → bachaav',
          pairs: [
            { left: 'Home feed se gateway OOMKilled', right: 'Pagination/streaming + bhaari endpoint ka alag gateway pool', explain: 'Size seemit, blast radius alag.' },
            { left: 'Reviews down, restaurant page blank', right: 'Partial response: reviews null + degraded flag', explain: 'Optional ko optional rakho.' },
            { left: 'Composer se order + payment + loyalty likhna', right: 'Saga/orchestrator — composition sirf reads ke liye', explain: 'Composer mein rollback nahi.' },
            { left: 'Surge par gateway CPU 95%, sab endpoints slow', right: 'Autoscaling + fan-out limits + load test peak ke 3-5 guna par', explain: 'Bottleneck ko pehle dekho.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Keemat — quick check',
          questions: [
            {
              q: 'Buffering composer ki memory kis par nirbhar hai?',
              choices: ['Ek saath requests × har request ka jodha hua size', 'Sirf backends ki sankhya', 'CPU cores', 'Disk size'],
              answer: 0,
              explain: 'Users × size.',
            },
            {
              q: 'Teen backends 99.9%, 99.9%, 99.5% — sab zaroori. Page?',
              choices: ['~99.3%', '99.9%', '99.5%', '~98%'],
              answer: 0,
              explain: 'Multiply.',
            },
            {
              q: 'Gateway SPOF hai ya bottleneck?',
              choices: ['Kai instances se SPOF nahi, par sab traffic ek raaste se — surge par bottleneck', 'Hamesha SPOF', 'Na SPOF na bottleneck', 'Sirf managed gateway mein bottleneck'],
              answer: 0,
              explain: 'Monitoring + capacity planning zaroori.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — OOMKilled aur partial response',
          project: '07-api-composition',
          exercise: 'ex3-composer-limits',
          goal: 'Buffer vs stream memory naapo, gateway ko OOMKilled hote dekho, phir reviews down par strict vs partial page.',
          steps: [
            { text: 'Chalao aur stream + chhota buffer.', cmd: 'npm start ex3-composer-limits\nnpm run heavy stream 30\nnpm run heavy buffer 4', expect: 'mode=stream, 30 users ... gateway ne ek waqt par sabse zyada ~1 MB response data pakda (limit 64 MB)\nmode=buffer, 4 users ... ~27 MB' },
            { text: 'Bada buffer.', cmd: 'npm run heavy buffer 30', expect: '💥 GATEWAY OOMKilled — ek saath itna data pakda ki 64 MB container limit paar' },
            { text: 'Ctrl+C. Reviews down.', cmd: 'REVIEWS_DOWN=1 npm start ex3-composer-limits\ncurl -i "localhost:4920/restaurant-page/R-4?partial=0"\ncurl -i "localhost:4920/restaurant-page/R-4?partial=1"', expect: '502 {"error":"reviews fail — poora page fail"}\n200 {..."reviews":null,"degraded":["reviews"]}' },
          ],
          observe: {
            q: 'Stream mode 30 users par sirf ~1 MB kyun pakadta hai?',
            choices: [
              'services/gateway-heavy.js stream mein 4 menus lekar turant res.write karta hai aur memory chhod deta hai — parse ya jodna nahi',
              'Stream mode kam data bhejta hai',
              'Stream mode mein users kam the',
              'Stream mode cache use karta hai',
            ],
            answer: 0,
            explain: 'Buffer: texts + JSON.parse + JSON.stringify ek saath memory mein. Stream: sirf abhi likha ja raha chunk.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Composition trade-offs',
        instructions: 'Senior-level trade-off sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "API composition ke nuksaan?"',
            choices: [
              'Composer memory/CPU pressure (bade responses, fan-out), availability multiplication, writes par transactional consistency nahi, ek aur component to operate, surge par bottleneck, multi-level chains mein latency',
              'Koi nuksaan nahi',
              'Sirf latency',
              'Sirf cost',
            ],
            answer: 0,
            explain: 'Poori list.',
          },
          {
            q: 'Interviewer: "Ek optional backend ka outage page ko na gira de — design?"',
            choices: [
              'Required vs optional fields; optional calls par short timeout, circuit breaker, fallback/cached value; response mein degraded markers; client graceful UI',
              'Sab backends ko 99.99% banao',
              'Retry jab tak mile',
              'Page cache 1 din',
            ],
            answer: 0,
            explain: 'Graceful degradation.',
          },
          {
            q: 'Interviewer: "Gateway ko bhaari endpoints se kaise bachaoge?"',
            choices: [
              'Bulkhead: bhaari/composed endpoints ka alag gateway pool ya BFF; per-route concurrency limits, response size limits, streaming/pagination, load shedding',
              'Ek bada gateway',
              'Bhaari endpoint hata do',
              'Client-side composition wapas',
            ],
            answer: 0,
            explain: 'Login aur Diwali feed ki kismat alag karo.',
          },
        ],
      },
      success: [
        'Main composer memory ka hisaab (users × size) laga sakta hoon',
        'Main availability multiplication aur partial response design samjha sakta hoon',
        'Main bata sakta hoon composition writes ke liye kyun nahi',
        'Main multi-level composition ke dard aur uska sudhaar bata sakta hoon',
      ],
      homework: '<p>Apne gateway/BFF ke top 3 composed endpoints lo. Har ek ke liye likho: max fan-out, typical aur max response size, required vs optional backends, aur peak concurrency par memory ka andaaza. Ek endpoint jo sabse khatarnak hai, uska fix (pagination, stream, partial, alag pool).</p>',
      cards: [
        { front: 'Composer memory?', back: '≈ <b>ek saath requests × jodha hua size</b>. Pagination/streaming se bachaav.' },
        { front: 'Composed availability?', back: 'Zaroori backends ka <b>multiply</b>. Optional ko partial response.' },
        { front: 'Composition se writes?', back: '<b>Nahi</b> — rollback nahi. Saga/orchestrator.' },
        { front: 'Gateway SPOF?', back: 'Kai instances se nahi, par <b>bottleneck</b> ho sakta hai.' },
        { front: 'Multi-level composition?', back: 'Service ke andar service call — <b>latency judti, availability ghat-ti</b>.' },
      ],
    },
  ]);
})();
