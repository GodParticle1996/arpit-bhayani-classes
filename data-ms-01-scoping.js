/* =====================================================================
   Video 1 — Service ko sahi scope kaise karein (loose coupling + high cohesion)
   Source concept: Arpit Bhayani — "How to Scope Microservices Right with
   Loose Coupling & High Cohesion" (youtube nfkdKHcKxbE)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.

   ✍️ LIKHNE KA NIYAM: "yeh / woh / isse / uska / wahan" ko kisi pehle bataye
   naam ki jagah mat likho — naam DOBARA likho. Chhote vaakya, aasaan shabd.
   Poori file IIFE mein (games.js ke top-level const se takraav na ho).
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'nfkdKHcKxbE', title: 'How to Scope Microservices Right with Loose Coupling & High Cohesion' };

  /* ---------------------------------------------------------------------
     Diagrams
     --------------------------------------------------------------------- */
  VISUALS['ms-boundary'] = {
    t: 'Service ki boundary — bahut badi, bahut chhoti, ya theek?',
    html: `
    <div class="dg-split">
      <div class="dg-col">
        <div class="dg-pill bad">🧱 Bahut badi boundary</div>
        <div class="dg-node is-bad"><span class="ni">🏢</span><span class="nl">khanakart-core</span><span class="ns">menu+coupon+order+payment</span></div>
        <div class="dg-cap">6 teams, 1 deploy. Coupon ka bug = poori app band.</div>
      </div>
      <div class="dg-col">
        <div class="dg-pill good">✅ Theek boundary</div>
        <div class="dg-flow">
          <div class="dg-node is-good"><span class="ni">🧾</span><span class="nl">order</span></div>
          <div class="dg-node is-good"><span class="ni">🎟️</span><span class="nl">coupon</span></div>
          <div class="dg-node is-good"><span class="ni">💳</span><span class="nl">payment</span></div>
        </div>
        <div class="dg-cap">Ek team = ek service. Checkout 3-5 hops mein poora.</div>
      </div>
      <div class="dg-col">
        <div class="dg-pill bad">🧩 Bahut chhoti boundary</div>
        <div class="dg-flow">
          <div class="dg-node is-bad"><span class="nl">apply-coupon</span></div>
          <div class="dg-node is-bad"><span class="nl">validate-coupon</span></div>
          <div class="dg-node is-bad"><span class="nl">coupon-expiry</span></div>
        </div>
        <div class="dg-cap">Checkout 14 services se guzre. Har hop par latency aur failure ka chance.</div>
      </div>
    </div>`,
  };

  VISUALS['ms-loose-coupling'] = {
    t: 'Loose coupling — counter se baat karo, kitchen mein mat ghuso',
    html: `
    <div class="dg-split">
      <div class="dg-col">
        <div class="dg-pill bad">❌ Tight coupling</div>
        <div class="dg-flow">
          <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">order</span></div>
          <div class="dg-arrow flow"></div>
          <div class="dg-node is-bad"><span class="ni">🗄️</span><span class="nl">delivery ka DB</span><span class="ns">SELECT eta_min FROM riders</span></div>
        </div>
        <div class="dg-cap">Delivery team ne table badla → order tooti.</div>
      </div>
      <div class="dg-col">
        <div class="dg-pill good">✅ Loose coupling</div>
        <div class="dg-flow">
          <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">order</span></div>
          <div class="dg-arrow flow"></div>
          <div class="dg-node is-good"><span class="ni">🛵</span><span class="nl">delivery API</span><span class="ns">GET /v1/riders/:id/eta</span></div>
        </div>
        <div class="dg-cap">Delivery team DB kuch bhi kare — contract wahi, order safe.</div>
      </div>
    </div>`,
  };

  VISUALS['ms-high-cohesion'] = {
    t: 'High cohesion — jo saath badalta hai, woh saath rehta hai',
    html: `
    <div class="dg-split">
      <div class="dg-col">
        <div class="dg-pill good">✅ payment-service (ek maalik)</div>
        <div class="dg-stack">
          <div class="dg-box is-good"><span class="bx-label">charge (UPI / card)</span></div>
          <div class="dg-box is-good"><span class="bx-label">refund</span></div>
          <div class="dg-box is-good"><span class="bx-label">payment-status worker</span></div>
        </div>
      </div>
      <div class="dg-col">
        <div class="dg-pill bad">❌ order-service mein address module</div>
        <div class="dg-stack">
          <div class="dg-box is-accent"><span class="bx-label">order</span></div>
          <div class="dg-box is-bad"><span class="bx-label">user addresses (5 services use karti hain)</span></div>
        </div>
        <div class="dg-cap">Address ka chhota change = order team ki approval + order ka deploy.</div>
      </div>
    </div>`,
  };

  /* ---------------------------------------------------------------------
     Levels
     --------------------------------------------------------------------- */
  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Service ki boundary
       ================================================================= */
    {
      id: 'ms-boundary',
      icon: '🧱',
      title: 'Service ki Boundary — Kitni Badi, Kitni Chhoti?',
      badge: 'Boundary Banaane Wala',
      source: Object.assign({ at: 225 }, SRC),
      hook: {
        when: 'KhanaKart · Friday 8:10 PM · dinner rush',
        title: 'Coupon ka ek chhota bug, aur poori app 25 minute band',
        text: 'KhanaKart ka saara code ek hi service <b>khanakart-core</b> mein hai — menu, coupon, order, payment. Coupon team ne ek null check bhool gaya. Ek user ne KHANA50 lagaya, khanakart-core ka process gir gaya, aur menu, checkout, payment — sab band. CTO ne kaha "microservices banao". Ek engineer ne 40 chhoti services ka plan bhej diya. Sahi jawab dono ke beech kahin hai. Kahan?',
      },
      objectives: [
        '<b>Boundary</b> kya hoti hai — ek service kin kaamon aur kis data ki maalik hai',
        'Boundary <b>bahut badi</b> hone ke dard: shared deploy, approvals, poori app par blast',
        'Boundary <b>bahut chhoti</b> hone ke dard: har hop par latency aur failure ka chance',
        'Beech ka raasta dhoondhne ke do niyam: <b>loose coupling</b> aur <b>high cohesion</b>',
      ],
      steps: [
        {
          q: 'Service ki "boundary" ka matlab kya hai?',
          analogy: 'Ek housing society socho. Har flat ki apni deewar hai. Flat 302 wale apna kitchen kaise bhi banayein — flat 303 ko farak nahi padta. Deewar batati hai ki kiska ilaaka kahan tak hai.',
          body: 'Service ki boundary bhi ek deewar hai. Boundary batati hai: <b>kaunse kaam</b> is service ke hain, <b>kaunsa data</b> is service ka hai, aur <b>kaunsi team</b> is service ki maalik hai. Boundary ke andar service kuch bhi badal sakti hai. Boundary ke bahar sirf API ke through baat hoti hai.',
        },
        {
          q: 'Boundary bahut badi ho (bahut kam services) toh kya hota hai?',
          body: 'Bahut saari teams ek hi service mein code likhti hain. Ek service = ek deploy. Isliye:',
          points: [
            'Coupon team ka 5 line ka fix bhi order team aur payment team ki approval ka intezaar karta hai.',
            'Kisi ek module ka bug poori service ka process gira deta hai — <b>blast radius</b> 100%.',
            'Deploy dheema aur darawna ho jaata hai, isliye teams hafte mein ek baar deploy karti hain.',
          ],
          example: '6 teams, ek khanakart-core. Friday 8:10 PM coupon bug → 25 minute rollback → dinner peak par ~18,000 orders ka nuksaan (₹400 average = ~₹72 lakh ka order value).',
        },
        {
          q: 'Boundary bahut chhoti ho (bahut zyada services) toh kya hota hai?',
          body: 'Har chhote kaam ki alag service ban jaati hai: apply-coupon, validate-coupon, coupon-expiry... Ek user ka checkout ab bahut saari services se guzarta hai. Har network hop ke saath latency judti hai aur failure ka chance bhi.',
          example: 'Checkout 14 services se guzarta hai. Har service 99.7% time theek chalti hai. 0.997 ko 14 baar multiply karo = <b>95.9%</b>. Matlab har 100 checkout mein ~4 fail — jabki koi ek service "kharab" nahi thi.',
          asli: 'Chhoti services ka dard dikhta nahi — har service akeli achhi lagti hai. Dard tab dikhta hai jab ek user request saari services ko jodti hai.',
        },
        {
          q: 'Toh sahi size kaise pata chale?',
          body: 'Do niyam, jo agle do levels mein detail se aayenge:',
          points: [
            '<b>Loose coupling</b> — ek service ke andar badlaav se doosri service ko badalna na pade.',
            '<b>High cohesion</b> — jo kaam saath badalte hain, woh ek hi service mein rahein; jo alag badalte hain, woh alag rahein.',
          ],
          asli: 'Ek practical test: "Kya do cheezein hamesha saath deploy hoti hain?" Haan → shayad ek hi service honi chahiye. "Kya do teams ek dusre ki approval ka intezaar karti hain?" Haan → shayad do services honi chahiye.',
        },
        {
          q: 'Nayi service banana itna mazedaar kyun lagta hai — aur khatra kya hai?',
          body: 'Nayi service = naya saaf code, nayi technology, naya CI/CD, purani galtiyon se chhutkara. Yeh sab achhi cheezein hain. Par "naya code likhne ka mann" service banane ki wajah nahi hai. Wajah hamesha <b>team, deploy, scale ya failure ka alag hona</b> honi chahiye.',
        },
      ],
      myth: [
        { myth: 'Jitni zyada services, utna achha microservices architecture.', sach: 'Services ki ginti koi score nahi hai. Har extra service = ek extra network hop, ek extra deploy pipeline, ek extra on-call. Sirf tab todo jab todne se team ya system ko faayda ho.' },
        { myth: 'Monolith hamesha bura hai.', sach: 'Chhoti team aur naya product ho toh monolith sabse tez raasta hai. Dard tab shuru hota hai jab kai teams ek hi deploy mein phans jaati hain.' },
      ],
      playbook: {
        title: 'service ko kab todein',
        use: [
          'Do teams ek dusre ki approval ke bina deploy nahi kar paa rahi',
          'Ek hissa baaki app se bilkul alag tarah scale hota hai (jaise search, notifications)',
          'Ek hisse ka bug baaki app gira deta hai aur us hisse ko alag rakhna zaroori hai',
        ],
        avoid: [
          'Har API endpoint ki alag service (make-payment, refund-payment ki alag services)',
          'Business ka domain abhi samajh nahi aaya — pehle monolith ke andar saaf modules banao',
          'Sirf "nayi technology try karni hai" wajah ho',
        ],
        how: [
          'Business capabilities ki list banao: order, payment, delivery, notification...',
          'Har capability ke saath team aur data likho — ek team, ek data owner',
          'User ka main flow (jaise checkout) likho aur gino kitni services synchronously judti hain',
          'Hot path par 5-6 se zyada sync hops ho rahe hain toh boundary dobara socho',
        ],
        redflags: [
          'Do services hamesha saath deploy hoti hain',
          'Ek user action 10+ services se synchronously guzarta hai',
          'Kisi service ke paas apna data ya apni team hi nahi hai',
        ],
        rule: 'Service tab todo jab team, deploy, scale ya failure alag ho — code likhne ka mann wajah nahi hai.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — Friday dinner rush ka crash',
          goal: 'Har step par ek hi cheez badlegi. Dekho ki ek module ka bug poori khanakart-core ko kaise girata hai.',
          nodes: [
            N('user', 120, 250),
            N('order', 420, 250, { id: 'core', icon: '🏢', label: 'khanakart-core' }),
            N('db', 420, 430, { label: 'core DB' }),
            N('coupon', 780, 90, { id: 'teamC', icon: '👩‍💻', label: 'coupon team' }),
            N('order', 780, 250, { id: 'teamO', icon: '👨‍💻', label: 'order team' }),
            N('payment', 780, 410, { id: 'teamP', icon: '🧑‍💻', label: 'payment team' }),
          ],
          edges: [
            { from: 'user', to: 'core' }, { from: 'core', to: 'db' },
            { from: 'teamC', to: 'core', dashed: true }, { from: 'teamO', to: 'core', dashed: true }, { from: 'teamP', to: 'core', dashed: true },
          ],
          panels: [{ id: 'deploy', title: 'Deploy queue' }, { id: 'status', title: 'KhanaKart status' }],
          steps: [
            {
              clock: 'Fri 6:00 PM',
              say: 'KhanaKart ka saara code <b>khanakart-core</b> naam ki ek service mein hai. Teen teams — coupon, order, payment — ek hi codebase mein kaam karti hain. Ek codebase ka matlab <b>ek deploy</b>.',
              nodes: { core: { tone: 'ok', badge: 'v412 live' } },
              panels: {
                deploy: ['coupon team: KHANA50 fix — ready', 'order team: GST change — review baaki', 'payment team: UPI retry — tests chal rahe'],
                status: ['menu ✅', 'checkout ✅', 'payment ✅'],
              },
            },
            {
              clock: 'Fri 6:20 PM',
              say: 'Coupon team ka fix ready hai. Par khanakart-core ek hi deploy unit hai, isliye coupon fix akele live nahi ja sakta. Order team aur payment team ka adhoora code bhi saath jaayega.',
              flows: [{ from: 'teamC', to: 'core', label: 'deploy request', tone: 'slow' }],
              panels: { deploy: ['coupon team: KHANA50 fix — ready', '⏳ order team ki approval chahiye', '⏳ payment team ki approval chahiye'] },
              ask: {
                q: 'Coupon team ka 5 line ka fix abhi tak live kyun nahi hua?',
                choices: [
                  'khanakart-core ek hi deploy unit hai — teeno teams ka code saath jaata hai, isliye teeno teams ki approval chahiye',
                  'Coupon ka code bahut slow hai',
                  'Database down hai',
                  'Users ne app update nahi kiya',
                ],
                answer: 0,
                explain: 'Boundary bahut badi hai. Ek service mein teen teams = teen teams ka ek hi release train. Chhota fix bhi sabse dheemi team ki raftaar se chalta hai.',
              },
            },
            {
              clock: 'Fri 7:30 PM',
              say: 'Approvals mil gayi. <b>v413</b> deploy hua. Coupon code mein ek null check chhoot gaya — kisi ko pata nahi chala, kyunki tests mein expired coupon ka case nahi tha.',
              flows: [{ from: 'teamC', to: 'core', label: 'v413 deploy', tone: 'acc' }],
              nodes: { core: { tone: 'busy', badge: 'v413 deploying' } },
              panels: { deploy: ['✅ v413 live (coupon + GST + UPI retry)'] },
            },
            {
              clock: 'Fri 8:10 PM',
              say: 'Dinner rush. Ek user expired coupon <b>KHANA50</b> lagata hai. Coupon code null par property padhta hai → error → <b>poora khanakart-core process gir jaata hai</b>. Menu, checkout, payment — sab ek hi process mein the.',
              flows: [{ from: 'user', to: 'core', label: 'apply KHANA50', tone: 'bad' }],
              nodes: { core: { tone: 'bad', badge: '💥 process crashed' } },
              panels: { status: ['menu ❌', 'checkout ❌', 'payment ❌'] },
              ask: {
                q: 'Bug sirf coupon code mein tha. Phir menu kyun band hua?',
                choices: [
                  'Menu, coupon aur checkout ek hi process mein chalte hain — process gira toh sab gira',
                  'Menu coupon ke data par depend karta hai',
                  'Bug ne database se menu delete kar diya',
                  'User ka internet band ho gaya',
                ],
                answer: 0,
                explain: 'Isi ko <b>blast radius</b> kehte hain — ek galti se kitna hissa girta hai. Ek badi service mein blast radius poori app hai.',
              },
            },
            {
              clock: 'Fri 8:35 PM',
              say: 'Rollback mein 25 minute lage. Dinner peak par KhanaKart ~720 orders per minute leta hai. 25 minute × 720 = <b>~18,000 orders</b> ka nuksaan. ₹400 average order = <b>~₹72 lakh</b> ka order value.',
              nodes: { core: { tone: 'slow', badge: 'rollback → v412' } },
              panels: { status: ['menu ✅ (8:35 se)', 'checkout ✅', 'payment ✅', 'nuksaan: ~18,000 orders'] },
            },
            {
              clock: 'Soch ke dekho',
              say: 'Agar coupon ek alag service hoti, toh bug sirf coupon-service girata. Checkout bina discount ke chalta rehta. <b>Par</b> agar har chhote kaam ki alag service bana di, toh checkout 14 services se guzrega — agla lab usi ka hisaab dikhayega.',
              nodes: { core: { tone: 'ok', badge: 'agar coupon alag hota: sirf coupon down' } },
              ask: {
                q: 'Is kahani mein boundary bahut badi hone ke kaunse 2 dard dikhe?',
                choices: [
                  'Deploy ke liye doosri teams ki approval, aur ek module ke bug se poori app down',
                  'Bahut saari network calls aur zyada latency',
                  'Data do jagah duplicate hona',
                  'Cloud ka bill badhna',
                ],
                answer: 0,
                explain: 'Badi boundary ke dard: <b>shared deploy</b> (approvals, dheema release) aur <b>bada blast radius</b>. Network calls ka dard ulta case hai — bahut chhoti boundary.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> badi boundary ka dard deploy aur blast radius mein dikhta hai. Agla lab ulta khatra dikhayega — bahut saari chhoti services.',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — kitni services banayein?',
          goal: 'Services aur teams ke sliders ghumao. Teeno shartein ek saath poori karo: <b>blast radius ≤ 25%</b>, <b>checkout success ≥ 98%</b>, <b>deploy ke liye doosri team ka intezaar 0 din</b>.',
          scenario: 'KhanaKart checkout flow. Har service 99.7% time theek chalti hai. Checkout mein lagbhag 70% services synchronously judti hain. Agar ek service ko do teams share karti hain, toh har deploy par ~2 din coordination lagta hai.',
          knobs: [
            { id: 'services', label: 'Services ki ginti', min: 1, max: 20, step: 1, value: 1, note: '1 = sirf khanakart-core monolith' },
            { id: 'teams', label: 'Teams ki ginti', min: 3, max: 10, step: 1, value: 6, note: 'Har team kam se kam ek service ki maalik honi chahiye' },
          ],
          nodes: [
            N('app', 110, 260),
            N('gateway', 330, 260),
            N('order', 590, 110, { id: 'a', label: 'services A' }),
            N('payment', 590, 260, { id: 'b', label: 'services B' }),
            N('delivery', 590, 410, { id: 'c', label: 'services C' }),
            N('user', 860, 260, { id: 'teams', icon: '👥', label: 'teams' }),
          ],
          edges: [
            { from: 'app', to: 'gateway' }, { from: 'gateway', to: 'a' }, { from: 'gateway', to: 'b' }, { from: 'gateway', to: 'c' },
            { from: 'teams', to: 'a', dashed: true }, { from: 'teams', to: 'b', dashed: true }, { from: 'teams', to: 'c', dashed: true },
          ],
          model: k => {
            const s = k.services, T = k.teams;
            const perService = Math.ceil(T / s);
            const waitDays = s >= T ? 0 : (perService - 1) * 2;
            const hops = Math.max(1, Math.ceil(s * 0.7));
            const success = Math.pow(0.997, hops) * 100;
            const blast = Math.round(100 / s);
            const p99 = 140 + hops * 22;
            const okBlast = blast <= 25, okSucc = success >= 98, okWait = waitDays === 0;
            const hopTone = okSucc ? 'ok' : 'bad';
            const each = Math.max(1, Math.round(s / 3));
            return {
              nodes: {
                a: { tone: s === 1 ? 'bad' : hopTone, badge: s === 1 ? 'monolith (sab kuch)' : `${each} service` },
                b: { tone: s < 3 ? 'idle' : hopTone, badge: s < 3 ? 'core ke andar' : `${each} service` },
                c: { tone: s < 3 ? 'idle' : hopTone, badge: s < 3 ? 'core ke andar' : `${Math.max(1, s - 2 * each)} service` },
                teams: { tone: okWait ? 'ok' : 'busy', badge: okWait ? '1 team = 1+ service' : `${perService} teams / service` },
                gateway: { tone: 'acc', badge: `${hops} sync hops` },
              },
              flows: [
                { from: 'app', to: 'gateway', label: `p99 ~${p99} ms`, tone: okSucc ? 'ok' : 'slow', rate: 0.7 },
                { from: 'gateway', to: 'a', tone: hopTone, rate: 0.5 },
                { from: 'gateway', to: 'b', tone: s < 3 ? 'acc' : hopTone, rate: 0.5 },
                { from: 'gateway', to: 'c', tone: s < 3 ? 'acc' : hopTone, rate: 0.5 },
              ],
              readouts: [
                { label: 'Blast radius (ek service giri toh)', value: blast + '%', tone: okBlast ? 'ok' : 'bad' },
                { label: 'Checkout success', value: success.toFixed(1) + '%', tone: okSucc ? 'ok' : 'bad' },
                { label: 'Deploy ke liye intezaar', value: waitDays + ' din', tone: okWait ? 'ok' : 'bad' },
                { label: 'Checkout p99 latency', value: p99 + ' ms', tone: p99 <= 300 ? 'ok' : 'warn' },
              ],
              bars: [
                { label: 'Blast radius', pct: blast, text: blast + '%', tone: okBlast ? 'ok' : 'bad' },
                { label: 'Failed checkouts / 1000', pct: Math.min(100, (100 - success) * 10), text: Math.round((100 - success) * 10) + '', tone: okSucc ? 'ok' : 'bad' },
              ],
              verdict: okBlast && okSucc && okWait
                ? { ok: true, text: `${s} services, ${T} teams — har team apni service deploy karti hai, blast chhota, checkout ${hops} hops mein.` }
                : { ok: false, text: !okWait ? `Services (${s}) teams (${T}) se kam hain — teams ek service share kar rahi hain, har deploy par intezaar.`
                  : !okBlast ? `Ek service giri toh ${blast}% app band — boundary abhi bhi badi hai.`
                  : `Checkout ${hops} services se guzarta hai — ${success.toFixed(1)}% success. Services bahut chhoti ho gayi.` },
            };
          },
          check: k => {
            const s = k.services, T = k.teams;
            const hops = Math.max(1, Math.ceil(s * 0.7));
            return Math.round(100 / s) <= 25 && Math.pow(0.997, hops) * 100 >= 98 && s >= T;
          },
          lesson: '✅ <b>Sweet spot mil gaya.</b> Kam services = bada blast radius aur teams ka intezaar. Zyada services = checkout ka success rate girta hai. Sahi jawab beech mein hai — aur teams ki ginti se juda hai.',
          quiz: {
            q: 'Teams ko 10 kar do. Ab koi bhi services ki ginti teeno shartein poori kyun nahi karti?',
            choices: [
              '10 teams ko alag deploy dene ke liye 10+ services chahiye, par 10 services par checkout 7 sync hops ka ho jaata hai aur success 98% se neeche girta hai',
              'Kyunki 10 teams ke saath blast radius hamesha 100% rehta hai',
              'Kyunki slider mein bug hai',
              'Kyunki zyada teams se latency kam ho jaati hai',
            ],
            answer: 0,
            explain: 'Asli duniya ka jawab: har service checkout ke <b>synchronous raaste</b> par nahi honi chahiye. Notifications, analytics jaisi services ko async rakho (Level: Sync vs Async) — tab services badhne par bhi hot path chhota rehta hai.',
          },
        },
        {
          type: 'bins',
          title: 'Symptom se pehchaano — boundary badi hai ya chhoti?',
          instructions: 'Har KhanaKart symptom ko sahi dabbe mein daalo.',
          bins: [
            { id: 'big', label: '🧱 Boundary bahut badi (kam services)' },
            { id: 'small', label: '🧩 Boundary bahut chhoti (zyada services)' },
          ],
          items: [
            { text: 'Coupon team ka fix order team ki review ke intezaar mein 3 din se ruka hai', bin: 'big', explain: 'Do teams ek deploy unit share kar rahi hain.' },
            { text: 'Search ke ek memory leak ne checkout bhi gira diya', bin: 'big', explain: 'Search aur checkout ek hi process mein — bada blast radius.' },
            { text: 'Checkout page kholne par 14 internal API calls hoti hain', bin: 'small', explain: 'Bahut saari chhoti services ek user request mein jud gayi.' },
            { text: 'apply-coupon aur validate-coupon services hamesha saath deploy hoti hain', bin: 'small', explain: 'Jo hamesha saath deploy hote hain, woh asal mein ek hi service hain — bina wajah toda gaya.' },
            { text: 'Release hafte mein sirf ek baar hota hai kyunki sab teams ko saath aana padta hai', bin: 'big', explain: 'Release train — shared deploy ka classic dard.' },
            { text: 'Ek bug dhoondhne ke liye 9 services ke logs jodne padte hain', bin: 'small', explain: 'Bahut saare hops = debug karna mushkil.' },
            { text: 'Monolith mein 40 developers ke merge conflicts roz aate hain', bin: 'big', explain: 'Bahut saari teams ek codebase mein.' },
            { text: 'Har service 99.7% theek hai phir bhi 4% checkouts fail hote hain', bin: 'small', explain: 'Failure ka chance har hop par multiply hota hai.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Boundary — quick check',
          questions: [
            {
              q: 'KhanaKart mein 3 teams ek hi service share karti hain. Sabse pehla dard kya dikhega?',
              choices: ['Har deploy ke liye doosri teams ka intezaar aur approval', 'Network latency badhna', 'Database ka size badhna', 'API versioning ki zaroorat'],
              answer: 0,
              explain: 'Ek service = ek deploy. Teen teams = teen teams ki raftaar mein sabse dheemi raftaar.',
            },
            {
              q: 'Checkout 10 services se synchronously guzarta hai, har service 99.5% theek. Checkout success lagbhag kitna?',
              choices: ['~95%', '~99.5%', '~90%', '100%'],
              answer: 0,
              explain: '0.995 ko 10 baar multiply karo ≈ 0.951 = ~95%. Har hop ka chhota failure chance jud kar bada ho jaata hai.',
            },
            {
              q: 'Nayi service banane ki kaunsi wajah sabse kamzor hai?',
              choices: ['"Naye framework mein likhna hai"', 'Do teams ek dusre ke deploy ka intezaar karti hain', 'Search ko baaki app se 10x zyada scale karna hai', 'Payment ke bug se baaki app girni nahi chahiye'],
              answer: 0,
              explain: 'Nayi technology try karna achhi baat hai, par service todne ki wajah team, deploy, scale ya failure isolation honi chahiye.',
            },
            {
              q: '"Blast radius" ka seedha matlab?',
              choices: ['Ek galti se system ka kitna hissa girta hai', 'Service kitni tez chalti hai', 'Kitne users ek saath aa sakte hain', 'Deploy mein kitna time lagta hai'],
              answer: 0,
              explain: 'Blast radius chhota rakhna boundary ka ek bada faayda hai — coupon gira toh sirf coupon.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — monolith vs split services mein blast radius',
          project: '01-scoping',
          exercise: 'ex1-blast-radius',
          goal: 'Coupon bug ko pehle monolith mein, phir alag services mein trigger karo. Dekho menu ka kya hota hai.',
          why: 'Lab ke numbers ek model the. Yahan asli Node.js process girega — aur tum khud dekhoge ki crash kahan tak failta hai.',
          steps: [
            { text: 'Project folder mein jao aur dependencies install karo (sirf pehli baar).', cmd: 'cd arpitbhayaniclasses/docker-labs/01-scoping\nnpm install', expect: 'added ~70 packages' },
            { text: 'Monolith ko coupon bug ke saath chalao.', cmd: 'COUPON_BUG=1 npm start ex1-monolith\n# Docker: COUPON_BUG=1 docker compose --profile ex1-monolith up --build', expect: 'monolith  http://localhost:4000  (menu + coupon + checkout ek hi process mein)' },
            { text: 'Doosre terminal mein menu dekho, phir coupon lagao, phir menu dobara dekho.', cmd: 'curl localhost:4000/menu\ncurl localhost:4000/coupon/apply\ncurl localhost:4000/menu', expect: '{"restaurant":"Meghana Foods",...}\n{"note":"coupon check shuru..."}\ncurl: (7) Failed to connect to localhost port 4000' },
            { text: 'Ctrl+C karo. Ab split services chalao aur wahi teen kaam karo, plus checkout.', cmd: 'COUPON_BUG=1 npm start ex1-split\ncurl localhost:4101/menu\ncurl localhost:4102/coupon/apply\ncurl localhost:4101/menu\ncurl localhost:4103/checkout', expect: '{"restaurant":"Meghana Foods",...}\n{"note":"coupon check shuru..."}\n{"restaurant":"Meghana Foods",...}\n{"food":320,"discount":0,...,"couponNote":"coupon-service jawab nahi de rahi — bina discount ke order lo"}' },
          ],
          observe: {
            q: 'Split version mein coupon-service girne ke baad /menu aur /checkout ka kya hua?',
            choices: [
              'Menu chalta raha, checkout bhi hua — bas discount 0 aaya',
              'Menu aur checkout dono band ho gaye',
              'Menu band hua, checkout chala',
              'Coupon-service apne aap theek ho gayi',
            ],
            answer: 0,
            explain: 'Alag process = alag blast radius. order-service ne timeout (300 ms) ke baad coupon ke bina order le liya. Monolith mein wahi bug poori dukaan band kar deta hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Service boundaries',
        instructions: 'System design interview mein boundary ka sawaal aksar pehla hota hai. 🎤',
        questions: [
          {
            q: 'Interviewer: "Monolith ko microservices mein todna hai. Pehli service kaunsi nikaaloge aur kyun?"',
            choices: [
              'Woh hissa jiski team/deploy/scale/failure baaki se sabse alag hai — jaise notifications ya search — aur jiske paas apna data hai',
              'Sabse bada module, taaki kaam jaldi khatam ho',
              'Har API endpoint ki alag service ek saath',
              'Database pehle todunga, code baad mein',
            ],
            answer: 0,
            explain: 'Pehli service aisi chuno jahan todne ka faayda saaf ho aur risk kam — alag team, alag scale pattern, apna data. Achha jawab "kyun" ko team aur failure se jodta hai.',
          },
          {
            q: 'Interviewer: "Microservices ki ginti kaise decide karoge?"',
            choices: [
              'Ginti target nahi hai — business capabilities aur team ownership se boundaries banaunga, phir hot path ke synchronous hops gin kar check karunga',
              'Jitni zyada utna achha — har feature ki ek service',
              'Hamesha 5 services',
              'Har developer ki ek service',
            ],
            answer: 0,
            explain: 'Interviewer "trade-off" sunna chahta hai: kam services = shared deploy aur bada blast, zyada services = latency aur failure multiply.',
          },
          {
            q: 'Interviewer: "Do services hamesha ek saath deploy hoti hain. Kya sochoge?"',
            choices: [
              'Dono shayad asal mein ek hi service hain — ya dono ke beech tight coupling hai (shared code, shared DB). Merge ya contract theek karunga.',
              'Deploy script mein dono ko ek saath daal dunga, problem khatam',
              'Teesri service bana dunga jo dono ko deploy kare',
              'Kuch nahi, yeh normal hai',
            ],
            answer: 0,
            explain: 'Hamesha saath deploy = boundary galat jagah khinchi hai. Yeh agle do levels (loose coupling, high cohesion) ka seedha signal hai.',
          },
        ],
      },
      success: [
        'Main service boundary ka matlab team, data aur deploy ke roop mein samjha sakta hoon',
        'Main badi boundary ke dard (shared deploy, blast radius) pehchaan sakta hoon',
        'Main chhoti boundary ke dard (hops, failure multiply) ka hisaab laga sakta hoon',
        'Main "service kab todein" ka decision card use kar sakta hoon',
      ],
      homework: '<p>Apne current project (ya kisi open-source app) ka main user flow likho — jaise "order place karna". Har step par likho: kaunsi service/module, kaunsi team, kaunsa data. Phir gino: kitne synchronous hops? Kitni teams ek deploy share karti hain? Dono numbers note karo — agle levels mein wapas aayenge.</p>',
      cards: [
        { front: 'Service boundary kya batati hai?', back: 'Service <b>kaunse kaam</b>, <b>kaunse data</b> aur <b>kaunsi team</b> ki maalik hai. Andar kuch bhi badlo, bahar sirf API se baat.' },
        { front: 'Boundary bahut badi hone ke 2 dard?', back: '1) <b>Shared deploy</b> — teams ek dusre ki approval ka intezaar. 2) <b>Bada blast radius</b> — ek module ka bug poori service girata hai.' },
        { front: 'Boundary bahut chhoti hone ka dard (number ke saath)?', back: 'Har hop par failure multiply: 14 services × 99.7% = <b>~95.9%</b> checkout success. Latency bhi har hop par judti hai.' },
        { front: 'Service todne ki achhi wajahein?', back: 'Alag <b>team</b>, alag <b>deploy</b>, alag <b>scale</b> pattern, alag <b>failure isolation</b>. "Naya framework" wajah nahi.' },
        { front: 'Red flag: do services hamesha saath deploy hoti hain — matlab?', back: 'Boundary galat hai — shayad ek hi service honi chahiye, ya beech mein shared code/DB wali tight coupling hai.' },
      ],
    },

    /* =================================================================
       LEVEL: Loose coupling
       ================================================================= */
    {
      id: 'ms-loose-coupling',
      icon: '✂️',
      title: 'Loose Coupling — Dusri Service ke Andar Mat Jhaanko',
      badge: 'Coupling Kaatne Wala',
      source: Object.assign({ at: 446 }, SRC),
      hook: {
        when: 'KhanaKart · Wednesday 1:05 PM · lunch rush',
        title: 'Delivery team ne apna database badla, aur order tracking toot gaya',
        text: 'Tuesday raat delivery team ne riders ka data MySQL se MongoDB mein shift kiya. Delivery team ki saari APIs perfectly chal rahi thi. Wednesday lunch par KhanaKart app ka "Mera order kahan hai?" page 500 error dene laga — 40,000 users ek ghante mein support ko call karne lage. Galti kisne ki? Delivery team ne sirf <b>apna</b> database badla tha.',
      },
      objectives: [
        '<b>Loose coupling</b> ka matlab — ek service ka andar ka badlaav doosri service ko na tode',
        '<b>Contract</b> kya hota hai aur contract ke bahar sab kuch "internal" kyun hai',
        'Dusri service ke baare mein <b>kya jaanna theek hai, kya nahi</b>',
        'Coupling loose rakhne ke practical tareeke: versioning, no shared credentials, tolerant reader',
      ],
      steps: [
        {
          q: 'Loose coupling ka matlab kya hai?',
          analogy: 'Restaurant mein tum counter par jaate ho, menu card dekhte ho, order dete ho. Tum kitchen mein ghus kar fridge nahi kholte. Chef ne fridge ka shelf badla, ya naya gas stove lagaya — tumhe farak nahi padta. Counter aur menu card wahi hain.',
          body: 'Do services <b>loosely coupled</b> hain agar ek service ke andar ka badlaav (database, language, table, code structure) doosri service ko badalne par majboor na kare. Dono sirf ek tay kiye hue raaste se baat karti hain — <b>contract</b>.',
        },
        {
          q: 'Contract kya hota hai?',
          body: 'Contract ek service ka "menu card" hai — bahar ki duniya se kiya hua vaada:',
          points: [
            'Kaunsa endpoint ya event: <code>GET /v1/riders/:id/eta</code>',
            'Request aur response ki shakl: <code>{ etaMinutes: 12 }</code>',
            'Errors ka matlab: 404 = rider nahi mila',
            'Protocol aur limits: HTTP/gRPC, rate limit, expected latency',
          ],
          asli: 'Contract ke bahar jo kuch hai — database ka type, table ke naam, column, server ka IP — sab <b>internal</b> hai. Internal cheez par depend karna = tight coupling.',
        },
        {
          q: 'order-service ko delivery-service ke baare mein kya jaanna chahiye?',
          body: '<table><tr><th>Jaankari</th><th>Jaanna chahiye?</th><th>Kyun</th></tr>' +
            '<tr><td>Public APIs (endpoints)</td><td>✅ Haan</td><td>Inhi se baat karni hai</td></tr>' +
            '<tr><td>Authentication ka tareeka</td><td>✅ Haan</td><td>Bina auth call hi nahi hogi</td></tr>' +
            '<tr><td>Rate limits</td><td>✅ Haan</td><td>Warna zyada calls se delivery-service dab jaayegi</td></tr>' +
            '<tr><td>Protocol + request/response format</td><td>✅ Haan</td><td>REST hai ya gRPC — bina jaane baat nahi hogi</td></tr>' +
            '<tr><td>Database ka type (MySQL/Mongo)</td><td>❌ Nahi</td><td>Delivery team kabhi bhi badal sakti hai</td></tr>' +
            '<tr><td>Database password, table/column naam</td><td>❌ Nahi</td><td>Jaanoge toh seedha padhne ka mann karega</td></tr></table>',
        },
        {
          q: 'Andar jhaankne se asal mein kya toot-ta hai?',
          example: 'Saalon pehle ek order developer ne ETA ke liye seedha delivery ka MySQL table padh liya: <code>SELECT eta_min FROM riders</code>. Delivery team ko pata hi nahi tha. Tuesday raat delivery team ne data MongoDB mein <code>drivers.etaSeconds</code> naam se shift kiya. Delivery-service ki API ne naya data padh kar wahi <code>etaMinutes</code> lautaya — par order-service ka SQL query ab khaali table par chal raha tha. Tracking page 500.',
          asli: 'Tight coupling ka sabse bada khatra <b>chhupa hua</b> hona hai. Delivery team ke paas koi tareeka hi nahi tha jaanne ka ki order-service unka table padhti hai.',
        },
        {
          q: 'Coupling loose kaise rakhein?',
          points: [
            '<b>Kabhi DB credentials share mat karo.</b> Har service ka database sirf us service ka.',
            '<b>API versioning:</b> breaking change aaye toh <code>/v2</code> banao, <code>/v1</code> kuch time saath chalao.',
            '<b>Additive changes:</b> response mein naya field jodna theek hai; purana field hatana breaking hai.',
            '<b>Tolerant reader:</b> consumer anjaane fields ko ignore kare, naye field par crash na ho.',
            '<b>Contract tests:</b> CI mein check karo ki provider abhi bhi consumer ka expected response deta hai.',
          ],
        },
      ],
      myth: [
        { myth: 'Apni hi company ki service hai — database seedha padh lo, API se tez hai.', sach: 'Ek network hop bachega, par delivery team ki har database change par order-service tootegi. Speed chahiye toh contract par caching lagao, andar mat jhaanko.' },
        { myth: 'Loose coupling = services ek dusre par depend hi nahi karti.', sach: 'Dependency rahegi — order ko ETA chahiye hi. Loose coupling ka matlab dependency <b>contract par</b> ho, internals par nahi.' },
      ],
      playbook: {
        title: 'coupling kaise loose rakhein',
        use: [
          'Har service-to-service baat API ya event contract se',
          'Breaking change ho toh naya version saath chalao, purane consumers ko time do',
          'Contract ka owner provider team ho, aur contract documented ho (OpenAPI/proto)',
        ],
        avoid: [
          'Dusri service ke database ka password apni config mein rakhna',
          'Dusri service ke internal endpoint (/internal/debug...) ko call karna',
          'Response ke har field par hard dependency — jo chahiye sirf woh padho',
        ],
        how: [
          'Har service ka "public contract" likho: endpoints, schemas, errors, rate limit, SLA',
          'Consumer ki zaroorat contract test mein likho (Pact jaisa tool)',
          'DB access ke network rules: service X ka DB sirf service X ke pods se reachable',
          'Deprecation plan: v1 ke consumers gino, date do, phir v1 band karo',
        ],
        redflags: [
          'Kisi team ka schema migration kisi doosri team ka incident ban jaata hai',
          'Ek service ki config mein doosri service ka DB host/password',
          'Provider kehta hai "hamein nahi pata humein kaun call karta hai"',
        ],
        rule: 'Contract par depend karo, internals par kabhi nahi.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — Tuesday raat ka migration',
          goal: 'Dekho ek chhupi hui dependency kaise ek team ke normal kaam ko doosri team ka incident bana deti hai.',
          nodes: [
            N('app', 120, 250),
            N('order', 410, 250),
            N('delivery', 760, 110),
            N('db', 760, 400, { id: 'ddb', label: 'delivery DB' }),
          ],
          edges: [
            { from: 'app', to: 'order' }, { from: 'order', to: 'delivery' }, { from: 'delivery', to: 'ddb' },
            { from: 'order', to: 'ddb', dashed: true },
          ],
          panels: [{ id: 'ddb', title: 'delivery DB ki shakl' }, { id: 'app', title: 'Tracking page' }],
          steps: [
            {
              clock: '2021',
              say: 'order-service ko tracking page ke liye rider ka ETA chahiye. Sahi raasta: delivery-service ki API. Ek developer ne deadline ke chakkar mein shortcut liya — <b>delivery ka database seedha padh liya</b>.',
              flows: [{ from: 'order', to: 'ddb', label: 'SELECT eta_min FROM riders', tone: 'slow' }],
              nodes: { order: { tone: 'ok', badge: 'shortcut: DB seedha' }, delivery: { tone: 'ok' }, ddb: { tone: 'ok', badge: 'MySQL' } },
              panels: { ddb: ['riders: id, name, eta_min'], app: ['ETA: 12 min ✅'] },
            },
            {
              clock: 'Tue 11:00 PM',
              say: 'Delivery team ko live location ke liye MongoDB chahiye. Team migration karti hai: <code>riders.eta_min</code> ab <code>drivers.etaSeconds</code> hai. Delivery-service ki API update hui aur <b>API ka jawab bilkul wahi</b> rahaa: <code>{ etaMinutes }</code>.',
              flows: [{ from: 'delivery', to: 'ddb', label: 'migration', tone: 'acc' }],
              nodes: { ddb: { tone: 'new', badge: 'MongoDB · drivers' }, delivery: { tone: 'ok', badge: 'API same ✅' } },
              panels: { ddb: ['drivers: riderId, fullName, etaSeconds'] },
              ask: {
                q: 'Delivery team ne migration se pehle order team ko kyun nahi bataya?',
                choices: [
                  'Delivery team ko pata hi nahi tha ki order-service unka database padhti hai — dependency chhupi hui thi',
                  'Delivery team laparwah thi',
                  'Order team chhutti par thi',
                  'Migration ke liye kisi ko batana zaroori nahi hota',
                ],
                answer: 0,
                explain: 'Contract ke through dependency dikhti hai (API logs, consumer list). Database ke through dependency <b>kisi ko nahi dikhti</b> — isliye tootne tak pata nahi chalta.',
              },
            },
            {
              clock: 'Wed 1:05 PM',
              say: 'Lunch rush. User tracking page kholta hai. order-service purana SQL chalata hai — table khaali, column gayab. <b>500 error.</b> App retry karta hai, load aur badhta hai.',
              flows: [{ from: 'app', to: 'order', label: 'GET /orders/o1/tracking', tone: 'bad' }, { from: 'order', to: 'ddb', label: 'riders? eta_min?', tone: 'bad' }],
              nodes: { order: { tone: 'bad', badge: '500 errors' }, app: { tone: 'bad', badge: '40k support calls' } },
              panels: { app: ['❌ Something went wrong', '40,000 "order kahan hai?" calls / ghanta'] },
              ask: {
                q: 'Is incident ka asli root cause kya hai?',
                choices: [
                  'order-service delivery ke internals (table/column) par depend karti thi, contract par nahi',
                  'MongoDB MySQL se kharab hai',
                  'Delivery team ka migration buggy tha',
                  'Lunch par traffic zyada tha',
                ],
                answer: 0,
                explain: 'Delivery team ka migration sahi tha — delivery-service ki API chal rahi thi. Galti tight coupling ki thi.',
              },
            },
            {
              clock: 'Wed 3:00 PM',
              say: 'Fix: order-service ab sirf <code>GET /v1/riders/r7/eta</code> call karti hai. Delivery ka database network rule se sirf delivery-service ke liye khula hai.',
              flows: [{ from: 'order', to: 'delivery', label: 'GET /v1/riders/r7/eta', tone: 'ok' }, { from: 'delivery', to: 'ddb', tone: 'ok' }],
              nodes: { order: { tone: 'ok', badge: 'sirf contract' }, app: { tone: 'ok', badge: 'tracking ✅' }, ddb: { tone: 'ok', badge: 'sirf delivery ke liye' } },
              panels: { app: ['ETA: 7 min ✅'] },
            },
            {
              clock: 'Agle mahine',
              say: 'Delivery team ETA ko seconds mein dena chahti hai. <code>/v1</code> ka jawab <b>badla nahi</b> jaata — naya <code>/v2/riders/:id/eta</code> banta hai jisme <code>etaSeconds</code> hai. Purane consumers /v1 par chalte rehte hain.',
              flows: [{ from: 'order', to: 'delivery', label: '/v1 (purana) · /v2 (naya)', tone: 'ok' }],
              nodes: { delivery: { tone: 'ok', badge: 'v1 + v2 saath' } },
              ask: {
                q: 'Breaking change ke waqt /v1 ko turant band kyun nahi karte?',
                choices: [
                  'Consumers ko apna code badalne ka time chahiye — v1 aur v2 saath chalne se koi bina warning toot-ta nahi',
                  'Kyunki v1 tez hai',
                  'Kyunki v2 mein bug hoga',
                  'Band kar dena chahiye, koi farak nahi padta',
                ],
                answer: 0,
                explain: 'Versioning ka poora maksad yahi hai: provider aage badhe, consumer apni raftaar se aaye.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> tight coupling tab tak dikhta nahi jab tak kuch toote. Contract par depend karo — delivery team phir database kuch bhi kare, order-service ko pata bhi nahi chalega.',
        },
        {
          type: 'bins',
          title: 'order-service ko kya jaanna chahiye?',
          instructions: 'Har jaankari ko sahi dabbe mein daalo — order-service ko delivery-service ke baare mein yeh pata hona chahiye ya nahi?',
          bins: [
            { id: 'yes', label: '✅ Jaanna chahiye (contract)' },
            { id: 'no', label: '❌ Nahi jaanna chahiye (internal)' },
          ],
          items: [
            { text: 'GET /v1/riders/:id/eta endpoint', bin: 'yes', explain: 'Public API — isi se baat karni hai.' },
            { text: 'Delivery DB ka password', bin: 'no', explain: 'Password pata hoga toh koi na koi seedha query likhega.' },
            { text: 'Rate limit: 300 requests/second', bin: 'yes', explain: 'Na jaano toh order-service delivery-service ko dabaa sakti hai.' },
            { text: 'Delivery MongoDB use karti hai', bin: 'no', explain: 'Internal choice — kal badal sakti hai.' },
            { text: 'Response format: { etaMinutes: number }', bin: 'yes', explain: 'Contract ka hissa.' },
            { text: 'drivers collection ka etaSeconds field', bin: 'no', explain: 'Table/field naam internal hain.' },
            { text: 'Auth: service token header mein', bin: 'yes', explain: 'Bina auth ke call reject hogi.' },
            { text: 'Delivery pods ke IP addresses', bin: 'no', explain: 'IP badalte rehte hain — service discovery/DNS ke peeche chhupe rehne chahiye.' },
          ],
        },
        {
          type: 'archdiff',
          title: '🕵️ Design review — coupling ke chhupe dhaage',
          brief: 'KhanaKart ka naya architecture review ke liye aaya hai. Kuch services kisi doosri service ke <b>internals</b> par depend kar rahi hain.',
          goal: 'Is design mein <b>4</b> tight coupling chhupe hain. Har galat box par click karo.',
          nodes: [
            { id: 'app', label: '📱 KhanaKart app', sub: 'sirf API gateway ko call karta hai', row: 0 },
            { id: 'gw', label: '🚪 API gateway', sub: 'public routes', row: 0 },
            { id: 'orderdb', label: '🧾 order-service', sub: 'config: DELIVERY_DB_PASSWORD', row: 1 },
            { id: 'coupon', label: '🎟️ coupon-service', sub: 'GET /v1/coupons/:code', row: 1 },
            { id: 'notif', label: '🔔 notification-service', sub: 'payment-service ke pod IP 10.2.4.17 par call', row: 1 },
            { id: 'review', label: '⭐ review-service', sub: 'restaurant-service ke /internal/debug/menu ko call', row: 2 },
            { id: 'payment', label: '💳 payment-service', sub: 'order.created event subscribe karta hai', row: 2 },
            { id: 'search', label: '🔎 search-service', sub: 'profile DB ki users table se naam join karta hai', row: 2 },
          ],
          flaws: [
            { id: 'orderdb', why: 'Delivery ka DB password order ki config mein = order-service delivery ke database ke andar jhaank rahi hai. Delivery ka har migration order todega.' },
            { id: 'notif', why: 'Pod ka IP hardcode — pod restart hote hi IP badlega. Service naam/DNS ya service discovery se baat karo.' },
            { id: 'review', why: '/internal/debug koi contract nahi hai — restaurant team kabhi bhi hata degi. Public API maango.' },
            { id: 'search', why: 'Profile ki users table se seedha join = profile ke schema par hard dependency. Profile ke events se naam apne index mein rakho, ya profile API se lo.' },
          ],
          fine: {
            app: 'App sirf gateway se baat karta hai — internals chhupe hain.',
            gw: 'Gateway public routes deta hai — sahi front door.',
            coupon: 'Versioned public endpoint — contract par dependency, bilkul theek.',
            payment: 'Event subscribe karna contract hai (event ka schema) — loose coupling.',
          },
          lesson: '<b>Asli baat:</b> tight coupling ke chaar roop — shared DB credentials, hardcoded IP, internal/debug endpoints, aur doosri service ki table par join. Charon ka ilaaj ek hi hai: tay kiya hua contract.',
        },
        {
          type: 'quiz',
          title: 'Loose coupling — quick check',
          questions: [
            {
              q: 'Delivery team response mein naya field "riderPhoto" jodti hai. Order-service ka kya hona chahiye?',
              choices: ['Kuch nahi — order-service anjaane fields ignore kare (tolerant reader)', 'Order-service crash honi chahiye', 'Delivery team ko /v2 banana padega', 'Order-service ko turant deploy karna padega'],
              answer: 0,
              explain: 'Naya field jodna additive change hai. Consumer agar anjaane fields ignore kare toh koi deploy nahi chahiye.',
            },
            {
              q: 'Kaunsa change delivery API ke liye BREAKING hai?',
              choices: ['etaMinutes field ka naam badal kar eta rakhna', 'Naya optional field jodna', 'Andar Redis cache lagana', 'MySQL se MongoDB shift karna (API same)'],
              answer: 0,
              explain: 'Field ka naam badalna consumers ko todta hai. Database badalna ya cache lagana contract ke andar ki baat hai.',
            },
            {
              q: 'Tight coupling ka sabse khatarnak hissa kya hai?',
              choices: ['Dependency chhupi hoti hai — provider ko pata nahi hota ki koi uske internals par depend karta hai', 'Code zyada lamba hota hai', 'Network calls zyada hoti hain', 'Deploy tez hote hain'],
              answer: 0,
              explain: 'Chhupi dependency ko koi test ya review nahi pakadta — incident hi pakadta hai.',
            },
            {
              q: 'Order-service ko ETA bahut baar chahiye aur delivery API har baar call karna mehenga hai. Sahi tareeka?',
              choices: ['Delivery API ka jawab thodi der cache karo (ya delivery ke events se local copy rakho)', 'Delivery DB ka read replica order-service ko de do', 'Delivery ka code copy kar lo', 'Har baar DB seedha padho'],
              answer: 0,
              explain: 'Speed ke liye contract par caching ya events — internals mein ghusna nahi. Read replica bhi delivery ke schema par hi dependency hai.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — schema badlo, dekho kaun toot-ta hai',
          project: '01-scoping',
          exercise: 'ex2-direct-db',
          goal: 'Do order-services chalao: ek delivery ka DB seedha padhti hai, ek API se poochhti hai. Phir delivery ka schema badlo.',
          steps: [
            { text: 'Schema v1 ke saath exercise chalao.', cmd: 'npm start ex2-direct-db\n# Docker: docker compose --profile ex2-direct-db up --build', expect: 'delivery-service  apna database schema v1 par migrate kiya' },
            { text: 'Dono order-services se tracking maango.', cmd: 'curl localhost:4202/orders/o1/tracking\ncurl localhost:4203/orders/o1/tracking', expect: '{"orderId":"o1","etaMinutes":12,"via":"delivery ka DB seedha padha"}\n{"orderId":"o1","etaMinutes":12,"via":"delivery-service API contract"}' },
            { text: 'Ctrl+C. Delivery team ka migration: schema v2 ke saath dobara chalao.', cmd: 'SCHEMA=v2 npm start ex2-direct-db\n# Docker: SCHEMA=v2 docker compose --profile ex2-direct-db up', expect: 'delivery-service  apna database schema v2 par migrate kiya' },
            { text: 'Dono se dobara tracking maango.', cmd: 'curl localhost:4202/orders/o1/tracking\ncurl localhost:4203/orders/o1/tracking', expect: '{"error":"Cannot read properties of undefined (reading \'find\')",...}\n{"orderId":"o1","etaMinutes":12,"via":"delivery-service API contract"}' },
          ],
          observe: {
            q: 'Schema v2 ke baad kaunsi order-service tooti aur kyun?',
            choices: [
              'Port 4202 wali (DB seedha padhne wali) — riders table ab hai hi nahi; API wali chalti rahi kyunki contract wahi hai',
              'Dono tooti',
              'Port 4203 wali (API wali) tooti',
              'Koi nahi tooti',
            ],
            answer: 0,
            explain: 'services/order-reads-db.js mein "riders" aur "eta_min" hardcoded hain. services/delivery-service.js schema v2 mein bhi etaMinutes lautati hai — contract ne order ko bachaya.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Coupling',
        instructions: 'Contract aur coupling ke sawaal senior interviews mein bahut aate hain. 🎤',
        questions: [
          {
            q: 'Interviewer: "Doosri team ki service ka data chahiye, par unki API slow hai. Unka DB read replica le lein?"',
            choices: [
              'Nahi — replica bhi unke schema par dependency hai. Unki API par cache lagaunga, ya unke events se apni read copy banaunga, aur slow API ka SLA unse discuss karunga.',
              'Haan, replica read-only hai toh safe hai',
              'Unka database hi merge kar lenge',
              'Unki service ka code copy kar lenge',
            ],
            answer: 0,
            explain: 'Read-only hone se coupling khatam nahi hoti — schema change phir bhi todega. Achha jawab speed aur coupling dono ko address karta hai.',
          },
          {
            q: 'Interviewer: "API mein breaking change karna hai jise 12 teams use karti hain. Plan?"',
            choices: [
              'Naya version (v2) banaunga, v1 saath chalaunga, consumers ko metrics se identify karke migration date dunga, usage zero hone par v1 band',
              'Friday raat change kar dunga',
              'Sabko email karke same din change',
              'Breaking change kabhi nahi karenge, chahe product ruk jaaye',
            ],
            answer: 0,
            explain: 'Versioning + deprecation window + usage metrics = professional jawab.',
          },
          {
            q: 'Interviewer: "Loose coupling ko kaise enforce karoge, sirf documentation se nahi?"',
            choices: [
              'Network policies se DB sirf owner service tak, CI mein contract tests, aur secrets per-service scope',
              'Code review mein dekh lenge',
              'Developers ko training de denge',
              'Enforce nahi ho sakta',
            ],
            answer: 0,
            explain: 'Jo cheez machine rok sakti hai, use machine se roko — network rules, secret scoping, contract tests.',
          },
        ],
      },
      success: [
        'Main contract aur internals ka farak bata sakta hoon',
        'Main "kya jaanna chahiye" table se tight coupling pakad sakta hoon',
        'Main breaking vs non-breaking change pehchaan sakta hoon',
        'Main coupling loose rakhne ke 5 practical tareeke laga sakta hoon',
      ],
      homework: '<p>Apne project ki kisi ek service ki config/env file kholo. Gino: kitni doosri services ke <b>database host/password</b> ya <b>internal URLs</b> usme hain? Har ek ke saath likho — yeh contract hai ya internal? Internal waalon ke liye ek line ka fix plan likho.</p>',
      cards: [
        { front: 'Loose coupling ka ek line ka matlab?', back: 'Ek service ke <b>andar</b> ka badlaav doosri service ko <b>badalne par majboor na kare</b>. Baat sirf contract se.' },
        { front: 'Contract mein kya aata hai?', back: 'Endpoints/events, request-response shape, errors, protocol, auth, rate limit, SLA. Baaki sab (DB, tables, IPs) <b>internal</b>.' },
        { front: 'Doosri service ke baare mein kya NAHI jaanna chahiye?', back: 'DB type, DB password, table/column naam, pod IPs, internal/debug endpoints.' },
        { front: 'Breaking change safely kaise karein?', back: '<b>/v2</b> banao, <b>/v1 saath chalao</b>, consumers gino, deprecation date do, usage zero par v1 band.' },
        { front: 'Tolerant reader?', back: 'Consumer response ke <b>anjaane fields ignore</b> kare. Tab provider naye fields bina kisi ko tode jod sakta hai.' },
      ],
    },

    /* =================================================================
       LEVEL: High cohesion + shared codebase
       ================================================================= */
    {
      id: 'ms-high-cohesion',
      icon: '🧲',
      title: 'High Cohesion — Jo Saath Badle, Woh Saath Rahe',
      badge: 'Cohesion Kaarigar',
      source: Object.assign({ at: 737 }, SRC),
      hook: {
        when: 'KhanaKart · payments team ki retro meeting',
        title: 'Refund ka ek bug fix, teen services mein PR',
        text: 'Payments team ne "microservices" ke josh mein teen services bana di: <b>charge-service</b>, <b>refund-service</b>, <b>payment-status-worker</b>. Ab UPI refund ka ek chhota bug fix teen repos, teen PRs aur teen deploys maangta hai. Doosri taraf order-service ke andar user addresses ka module hai — address team ka har chhota change order team ki approval maangta hai. Ek jagah zyada toda, ek jagah kam. Dono jagah dard.',
      },
      objectives: [
        '<b>High cohesion</b> ka matlab — related kaam saath, unrelated kaam alag',
        'Related kaam alag karne ka dard (teen PR, teen deploy) aur unrelated saath rakhne ka dard (approvals)',
        '"Related" pehchaanne ke 3 sawaal',
        'Monolith se service nikaalte waqt <b>shared codebase</b> ka jaal aur uska ilaaj',
      ],
      steps: [
        {
          q: 'High cohesion ka matlab kya hai?',
          analogy: 'Ghar ki kitchen mein chai ka saamaan — patti, cheeni, doodh, chhalni — ek hi shelf par hota hai. Agar patti kitchen mein, cheeni balcony mein, aur chhalni bedroom mein ho, toh har chai ke liye poore ghar ka chakkar. Aur agar chai ki shelf par joote bhi rakh do, toh har joota nikaalne wala chai ka saamaan hilaayega.',
          body: '<b>High cohesion</b> = jo kaam <b>ek saath badalte hain</b>, woh ek service mein rahein. Jo kaam <b>alag-alag wajah se badalte hain</b>, woh alag services mein rahein.',
        },
        {
          q: 'Related kaam alag-alag services mein daal diye toh?',
          example: 'Charge, refund aur payment-status-worker — teeno UPI gateway ke saath baat karte hain, teeno payment ke same states (initiated → success → refunded) samajhte hain. UPI gateway ne API badli → teeno services mein change, teeno ka deploy, aur teeno ke beech network calls.',
          asli: 'Related cheezon ko todne se <b>cohesion girti hai aur coupling badhti hai</b> — kyunki ab jo cheez ek function call thi, woh network call ban gayi.',
        },
        {
          q: 'Unrelated kaam ek service mein rakh diye toh?',
          example: 'order-service mein user addresses ka module hai. Profile, delivery, search, coupon, order — paanch services addresses padhti hain. Address team ko "landmark" field jodna hai → order-service ka PR → order team ki review → order-service ka deploy. Order team ka koi lena-dena nahi tha.',
          asli: 'Unrelated cheezein saath = do teams ek deploy unit mein band. Yeh Level "Service ki Boundary" ka "badi boundary" wala dard hai.',
        },
        {
          q: 'Kaise pehchaanein ki do cheezein related hain?',
          points: [
            '<b>Kya dono saath badalti hain?</b> Pichhle 3 mahine ke PR dekho — ek badla toh doosra bhi badla?',
            '<b>Kya dono ek hi data ki maalik hain?</b> Payment ki states charge aur refund dono ki hain.',
            '<b>Kya dono ek hi business capability hain?</b> "Paise lena aur lautana" ek capability hai; "address rakhna" alag.',
          ],
          asli: 'Teeno ka jawab "haan" → ek service. Teeno ka "nahi" → alag. Mixed ho toh pehle ek hi service ke andar saaf modules banao, baad mein todo.',
        },
        {
          q: 'Monolith se service nikaalte waqt "shared codebase" ka jaal kya hai?',
          body: 'Jaldi dikhane ke liye teams aksar monolith ka hi code copy/fork karke nayi service bana deti hain — nayi service mein sirf delivery ke endpoints "on" hain, baaki code wahi hai. Ab ek shared file (jaise <code>pricing.js</code>) badli toh <b>dono services ko ek saath deploy</b> karna padta hai.',
          example: 'Delivery fee ₹39 se ₹49 hui. menu-service naye code ke saath deploy hui, order-service ka deploy fail ho gaya. User ko menu par ₹49 dikha, checkout par ₹39 charge hua. Finance team ko ₹10 × 2 lakh orders = ₹20 lakh ka hisaab milana pada.',
          asli: 'Do services ko ek saath deploy karna risky hai — ek deploy ho, doosra fail ho, toh system beech ki galat haalat mein atak jaata hai. Shared logic ka <b>ek maalik</b> banao.',
        },
      ],
      myth: [
        { myth: 'Chhoti service = achhi service, isliye refund ki alag service banao.', sach: 'Size nahi, cohesion dekho. Charge aur refund ek hi data aur ek hi gateway ke saath badalte hain — ek service mein rahein.' },
        { myth: 'Shared library se code duplicate nahi hota, isliye hamesha achhi hai.', sach: 'Logging/HTTP client jaisi generic library theek hai. Business rule (fee, pricing, tax) wali shared library har change par sab services ka saath deploy maangti hai — us rule ki ek service maalik honi chahiye.' },
      ],
      playbook: {
        title: 'kya saath rakhein, kya alag',
        use: [
          'Ek hi data aur ek hi lifecycle wale kaam ek service mein (charge + refund + status worker)',
          'Business rule (fee, tax, pricing) ki ek maalik service — baaki API se poochhein',
          'Migration ke waqt nayi service ka apna saaf codebase, sirf zaroori code copy',
        ],
        avoid: [
          'Har endpoint ki alag service',
          'Kai teams jis data ko use karti hain (addresses) use kisi unrelated service ke andar rakhna',
          'Business logic wali shared library jo kai services mein import ho',
        ],
        how: [
          'Pichhle 3 mahine ke PRs dekho — kaunsi files hamesha saath badalti hain?',
          'Har module ke saath likho: data owner, team, badalne ki wajah',
          'Shared business rule mile toh ek owner service banao aur baaki ko API do',
          'Monolith se nikaalte waqt strangler approach: gateway naye route ko nayi service par bheje, purana code monolith mein hatao',
        ],
        redflags: [
          'Ek bug fix ke liye 3 repos mein PR',
          'Kisi team ka change doosri team ki approval ke bina deploy nahi hota',
          'Deploy runbook mein likha hai "A aur B ko ek saath deploy karein"',
        ],
        rule: 'Jo saath badalta hai, saath rahe. Jo alag wajah se badalta hai, alag rahe.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — ek fee change, do services, ek adhoora deploy',
          goal: 'Dekho shared codebase mein ek chhota change kaise user ko galat bill tak le jaata hai.',
          nodes: [
            N('app', 120, 250),
            N('search', 420, 110, { id: 'menu', icon: '📋', label: 'menu-service' }),
            N('order', 420, 390),
            N('db', 760, 250, { id: 'lib', icon: '📄', label: 'pricing.js (shared)', kind: 'db' }),
          ],
          edges: [
            { from: 'app', to: 'menu' }, { from: 'app', to: 'order' },
            { from: 'menu', to: 'lib', dashed: true }, { from: 'order', to: 'lib', dashed: true },
          ],
          panels: [{ id: 'deploys', title: 'Deploys' }, { id: 'bill', title: 'User ka bill' }],
          steps: [
            {
              say: 'Delivery fee ka code <code>pricing.js</code> mein hai. <b>menu-service</b> aur <b>order-service</b> dono monolith se fork hui thi, isliye dono apne andar yahi file import karti hain.',
              nodes: { menu: { tone: 'ok', badge: 'fee v1: ₹39' }, order: { tone: 'ok', badge: 'fee v1: ₹39' }, lib: { tone: 'ok', badge: 'v1' } },
              panels: { deploys: ['menu-service: v1', 'order-service: v1'], bill: ['menu par fee: ₹39', 'checkout par fee: ₹39'] },
            },
            {
              say: 'Business ne fee ₹49 kar di. Developer ne <code>pricing.js</code> badli — ek file, ek line. Par file do services ke andar hai, isliye <b>do deploys</b> chahiye.',
              nodes: { lib: { tone: 'new', badge: 'v2: ₹49' } },
              ask: {
                q: 'Ek line ke change ke liye do deploys kyun chahiye?',
                choices: [
                  'pricing.js dono services ke codebase ka hissa hai — jo service deploy nahi hui, woh purana code chalati rahegi',
                  'Kyunki do databases hain',
                  'Kyunki Git mein do branches hain',
                  'Do deploys nahi chahiye, ek kaafi hai',
                ],
                answer: 0,
                explain: 'Shared code ka matlab: logic ka koi ek maalik nahi. Har copy apne deploy ke saath hi badalti hai.',
              },
            },
            {
              say: 'menu-service ka deploy ho gaya. order-service ka deploy ek flaky test ki wajah se fail — kal subah dobara hoga.',
              flows: [{ from: 'lib', to: 'menu', label: 'v2 deployed', tone: 'ok' }, { from: 'lib', to: 'order', label: 'deploy failed', tone: 'bad' }],
              nodes: { menu: { tone: 'ok', badge: 'fee v2: ₹49' }, order: { tone: 'slow', badge: 'abhi bhi v1: ₹39' } },
              panels: { deploys: ['menu-service: v2 ✅', 'order-service: v1 ❌ (deploy failed)'] },
            },
            {
              say: 'Raat bhar KhanaKart app menu par <b>₹49</b> fee dikhata hai, checkout par <b>₹39</b> charge karta hai. 2 lakh orders × ₹10 ka farak — finance team ko ₹20 lakh ka mismatch milta hai.',
              flows: [{ from: 'app', to: 'menu', label: 'fee dikhi ₹49', tone: 'slow' }, { from: 'app', to: 'order', label: 'charge hua ₹39', tone: 'bad' }],
              nodes: { app: { tone: 'bad', badge: 'bill mismatch' } },
              panels: { bill: ['menu par fee: ₹49', 'checkout par fee: ₹39 ❌', 'mismatch: ₹20 lakh'] },
              ask: {
                q: 'Is mismatch ka sabse seedha permanent fix kya hai?',
                choices: [
                  'Delivery fee ka ek maalik (pricing-service) — menu aur order dono uski API se fee poochhein',
                  'Deploy script mein dono ko hamesha saath deploy karo',
                  'Flaky tests hata do',
                  'pricing.js ko teesri service mein bhi copy karo',
                ],
                answer: 0,
                explain: 'Saath deploy karna jaal ko chhupata hai, hataata nahi. Ek maalik = fee badli toh sirf ek deploy.',
              },
            },
            {
              say: 'Fix: <b>pricing-service</b> fee ki maalik bani. menu aur order <code>GET /v1/fee</code> poochhte hain. Agli baar fee badli → sirf pricing-service deploy.',
              nodes: {
                lib: { tone: 'ok', badge: 'pricing-service (maalik)' },
                menu: { tone: 'ok', badge: 'API se: ₹49' }, order: { tone: 'ok', badge: 'API se: ₹49' }, app: { tone: 'ok', badge: 'bill match ✅' },
              },
              flows: [{ from: 'menu', to: 'lib', label: 'GET /v1/fee', tone: 'ok' }, { from: 'order', to: 'lib', label: 'GET /v1/fee', tone: 'ok' }],
              panels: { deploys: ['pricing-service: v2 ✅ (sirf yahi deploy)'], bill: ['menu par fee: ₹49', 'checkout par fee: ₹49 ✅'] },
            },
          ],
          lesson: '<b>Asli baat:</b> "do services ko saath deploy karo" ek red flag hai. Shared business logic ka ek maalik banao — cohesion wapas aati hai, deploy akela ho jaata hai.',
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — KhanaKart payments aur addresses kahan rahein?',
          instructions: 'Har slot ke liye jagah chuno. Review mein har option ka trade-off khulega.',
          brief: 'KhanaKart payments team aur address team dono ke dard sun chuke ho. Ab sahi jagah decide karo.',
          requirements: ['UPI gateway ki API badle toh sirf ek team, ek deploy', 'Address team bina order team ke deploy kar sake', 'Delivery fee menu aur checkout par hamesha same'],
          slots: [
            {
              id: 'refund', label: 'Refund logic', icon: '↩️',
              options: [
                { id: 'same', label: 'payment-service ke andar', score: 3, why: 'Refund aur charge ek hi payment states, ek hi UPI gateway, ek hi team — saath badalte hain.' },
                { id: 'sep', label: 'alag refund-service', score: -2, why: 'Har gateway change par do services, aur refund ko payment state ke liye network call — cohesion tooti.' },
                { id: 'order', label: 'order-service ke andar', score: -3, why: 'Order team payment gateway ki expert nahi hai, aur payment data do jagah bikhar jaayega.' },
              ],
            },
            {
              id: 'worker', label: 'Payment status worker (UPI status poll karta hai)', icon: '⏲️',
              options: [
                { id: 'same', label: 'payment-service ka background worker (same codebase)', score: 3, why: 'Worker payment ki hi states update karta hai — same data, same team. Alag process chal sakta hai, par code aur ownership ek.' },
                { id: 'sep', label: 'alag team ki alag service', score: -2, why: 'Payment states do teams mein bat gayi — har state change par coordination.' },
                { id: 'cron', label: 'monolith ka shared cron', score: -1, why: 'Shared cron = shared deploy. Payment team apne worker ko akela deploy nahi kar paayegi.' },
              ],
            },
            {
              id: 'address', label: 'User addresses', icon: '🏠',
              options: [
                { id: 'profile', label: 'profile-service (user ka data)', score: 3, why: 'Address user ki jaankari hai, profile team ki. Baaki services API/events se padhein.' },
                { id: 'order', label: 'order-service ke andar hi rehne do', score: -3, why: 'Unrelated data order mein — address ka har change order team ki approval maangega.' },
                { id: 'lib', label: 'shared address library sab services mein', score: -2, why: 'Schema ya validation badla toh sab services ka saath deploy.' },
              ],
            },
            {
              id: 'fee', label: 'Delivery fee rule', icon: '💰',
              options: [
                { id: 'pricing', label: 'pricing-service (ek maalik) + API', score: 3, why: 'Fee badli toh ek deploy. Menu aur checkout hamesha same jawab.' },
                { id: 'lib', label: 'shared pricing.js dono mein', score: -3, why: 'Adhoora deploy = ₹49 dikhana, ₹39 charge karna.' },
                { id: 'both', label: 'menu aur order dono apna-apna logic', score: -2, why: 'Do jagah same rule — kabhi na kabhi alag ho jaayega.' },
              ],
            },
          ],
          pass: 10,
          verdicts: {
            great: '🌟 Har cheez apne maalik ke paas. Payments ek team, addresses profile ke paas, fee ka ek maalik.',
            ok: '👍 Zyadatar sahi — review mein laal slots dobara padho.',
            bad: '😅 Kahin related cheezein bikhri hain, kahin unrelated cheezein saath. Har option ka "why" padho.',
          },
        },
        {
          type: 'order',
          title: 'Monolith se delivery ko safely nikaalne ka kram',
          instructions: 'Shared codebase ke jaal se bachte hue delivery-service nikaalni hai. Steps ko sahi kram mein lagao.',
          steps: [
            { text: 'Monolith ke andar delivery code ko ek saaf module mein samet lo — baaki code sirf module ke interface se baat kare', explain: 'Pehle andar hi boundary banao. Tab todna aasaan hota hai.' },
            { text: 'Delivery module ka contract likho: endpoints, request-response, events', explain: 'Nayi service ka vaada pehle se tay — consumers ko pata ho kya milega.' },
            { text: 'Nayi delivery-service ka APNA codebase banao, sirf delivery ka zaroori code le jao', explain: 'Poora monolith fork mat karo — warna shared codebase ka jaal.' },
            { text: 'Delivery ke data ko nayi service ke database mein le jao (migration + sync)', explain: 'Data ka maalik bhi badalna chahiye, warna shared DB ka coupling.' },
            { text: 'API gateway par /delivery routes nayi service par bhejo, baaki monolith par', explain: 'Strangler approach — users ko pata bhi nahi chalta.' },
            { text: 'Monolith se delivery ka purana code aur tables hata do', explain: 'Purana code rehne diya toh koi na koi use call karta rahega — do maalik ban jaayenge.' },
          ],
        },
        {
          type: 'quiz',
          title: 'High cohesion — quick check',
          questions: [
            {
              q: 'KhanaKart mein "coupon validate" aur "coupon apply" alag services hain aur har change dono mein hota hai. Kya karein?',
              choices: ['Dono ko ek coupon-service mein merge karo', 'Teesri service bana ke dono ko jodo', 'Dono ko ek saath deploy karne ki script banao', 'Kuch nahi'],
              answer: 0,
              explain: 'Saath badalna = related. Related = ek service.',
            },
            {
              q: 'Kaunsi shared library sabse kam khatarnak hai?',
              choices: ['Logging aur HTTP client ki generic library', 'Delivery fee calculate karne wali library', 'GST calculate karne wali library', 'Order state machine wali library'],
              answer: 0,
              explain: 'Generic technical code kam badalta hai aur business rule nahi hai. Fee/GST/state rules badalte hain aur sab jagah same hone chahiye — un rules ka ek maalik ho.',
            },
            {
              q: 'Do cheezein related hain ya nahi — sabse bharosemand signal?',
              choices: ['Pichhle mahino mein dono ke code saath-saath badle', 'Dono ka naam milta-julta hai', 'Dono ek hi language mein likhi hain', 'Dono ek hi server par chalti hain'],
              answer: 0,
              explain: 'Change history jhooth nahi bolti. Jo saath badalte aaye hain, woh saath rahenge.',
            },
            {
              q: 'Deploy runbook mein likha hai "menu aur order ko hamesha ek saath deploy karein". Iska matlab?',
              choices: ['Dono ke beech shared logic ya tight coupling hai — ek maalik banana chahiye', 'Achhi practice hai', 'Deploy tool purana hai', 'Dono services bahut badi hain'],
              answer: 0,
              explain: 'Saath deploy ki majboori = boundary galat ya shared code. Ek adhoora deploy hi incident ban jaata hai.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — shared code vs ek maalik',
          project: '01-scoping',
          exercise: 'ex3-shared-code',
          goal: 'Adhoora deploy simulate karo: menu naye fee code par, order purane par. Phir pricing-service ko maalik banao.',
          steps: [
            { text: 'Shared code wala mode chalao (menu FEE_VERSION=2, order FEE_VERSION=1).', cmd: 'npm start ex3-shared-code\n# Docker: docker compose --profile ex3-shared-code up --build', expect: 'menu-service  http://localhost:4101/menu  (pricing: shared)' },
            { text: 'Menu aur checkout ki fee compare karo.', cmd: 'curl localhost:4101/menu\ncurl localhost:4103/checkout', expect: '"deliveryFeeShown":49 ... FEE_VERSION=2\n"deliveryFeeCharged":39 ... FEE_VERSION=1' },
            { text: 'Ctrl+C. Ab pricing-service ko maalik bana ke chalao.', cmd: 'npm start ex3-owned\ncurl localhost:4101/menu\ncurl localhost:4103/checkout', expect: '"deliveryFeeShown":49,"feeSource":"pricing-service API"\n"deliveryFeeCharged":49,"feeSource":"pricing-service API"' },
          ],
          observe: {
            q: 'ex3-owned mode mein fee dobara badalni ho (₹49 → ₹59), toh kitni services deploy karni padengi?',
            choices: [
              'Sirf pricing-service — menu aur order API se poochhte hain',
              'Teeno services',
              'menu aur order dono',
              'Koi nahi, fee apne aap badlegi',
            ],
            answer: 0,
            explain: 'Ek maalik = ek deploy. services/pricing-service.js hi lib/pricing.js ko use karti hai; menu aur order sirf GET /v1/fee call karte hain.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Cohesion',
        instructions: 'Cohesion ke sawaal aksar "is feature ko kahan rakhoge?" ke roop mein aate hain. 🎤',
        questions: [
          {
            q: 'Interviewer: "Refunds ke liye alag microservice banayein?"',
            choices: [
              'Nahi, jab tak refund ki team, data ya scale payment se alag na ho — refund aur charge ek hi payment states aur gateway ke saath badalte hain',
              'Haan, har operation ki alag service honi chahiye',
              'Haan, refund zyada important hai',
              'Refund ko order-service mein daalo',
            ],
            answer: 0,
            explain: 'Senior jawab "depends" ko ground karta hai: kab alag hoga (alag team, alag compliance) aur abhi kyun nahi.',
          },
          {
            q: 'Interviewer: "Monolith se service nikaalne ka sabse aam galti kya hai?"',
            choices: [
              'Poora monolith codebase fork karke nayi service bana dena — shared code se dono ko hamesha saath deploy karna padta hai',
              'Service ka naam galat rakhna',
              'Nayi service mein tests likhna',
              'API gateway use karna',
            ],
            answer: 0,
            explain: 'Fork se shuru karna tez lagta hai, par shared code ka jaal paida hota hai. Saaf codebase + contract + data migration + strangler routing.',
          },
          {
            q: 'Interviewer: "Kaise pata karoge ki do modules ko ek service mein hona chahiye?"',
            choices: [
              'Change history (saath badalte hain?), data ownership (ek hi data?), aur business capability (ek hi kaam?) teeno dekhunga',
              'Lines of code gin kar',
              'Developers se vote karwa kar',
              'Jo module tez hai use alag karunga',
            ],
            answer: 0,
            explain: 'Teen signals ka jawab data se aata hai, raay se nahi.',
          },
        ],
      },
      success: [
        'Main high cohesion ko "saath badalna" ke roop mein samjha sakta hoon',
        'Main over-split aur under-split dono ke dard pehchaan sakta hoon',
        'Main shared business logic ka ek maalik banane ka fix de sakta hoon',
        'Main monolith se service nikaalne ka safe kram bata sakta hoon',
      ],
      homework: '<p>Apne repo mein <code>git log --name-only --since="3 months ago"</code> chalao. Dekho kaunsi files/folders hamesha ek hi commit mein saath badalte hain. Kya woh ek hi service/module mein hain? Agar do alag services mein hain, toh likho kaunsi service unki maalik honi chahiye.</p>',
      cards: [
        { front: 'High cohesion ka ek line ka matlab?', back: 'Jo kaam <b>saath badalte hain</b>, ek service mein. Jo <b>alag wajah se badalte hain</b>, alag services mein.' },
        { front: 'Related cheezein pehchaanne ke 3 sawaal?', back: '1) Saath badalti hain? 2) Ek hi data ki maalik? 3) Ek hi business capability?' },
        { front: 'Shared codebase ka jaal?', back: 'Monolith fork karke service banana → shared file badli toh <b>dono ka saath deploy</b> → ek fail hua toh mismatch (₹49 dikha, ₹39 charge).' },
        { front: 'Shared business rule ka fix?', back: 'Rule ki <b>ek maalik service</b> (jaise pricing-service). Baaki services API se poochhein. Rule badla = ek deploy.' },
        { front: 'Kaunsi shared library theek hai?', back: 'Generic technical code (logging, HTTP client). Business rules (fee, tax, state machine) ki library nahi.' },
      ],
    },
  ]);
})();
