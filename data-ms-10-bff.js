/* =====================================================================
   Video 10 — Backend for Frontend (BFF)
   Source concept: Arpit Bhayani — "Backend for Frontend pattern" (youtube GCx0aouuEkU)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'GCx0aouuEkU', title: 'Backend for Frontend (BFF) pattern' };

  /* ---------------- models ---------------- */
  function endpointModel(k) {
    const multi = k.clients >= 2, alexa = k.clients >= 3;
    const mobileKB = !multi ? null : [56, 3, 2][k.approach];
    const mobileMs = mobileKB === null ? null : Math.round(250 + mobileKB * 5.3);
    const alexaOk = !alexa || k.approach > 0;
    const branches = k.approach === 1 ? (k.clients - 1) * 3 : 0;
    const coreDeploys = k.approach === 1 ? (k.clients - 1) * 4 : 0;
    const cache = k.approach === 1 ? 92 - (k.clients - 1) * 15 : 92;
    return { multi, alexa, mobileKB, mobileMs, alexaOk, branches, coreDeploys, cache };
  }
  function bffCostModel(k) {
    const perClient = k.bffs === 2;
    const waste = k.bffs === 2 ? 3 : 90;
    const alexaOk = k.bffs >= 1 && perClient;
    const drift = perClient && !k.sharedLib ? 3 : 0;
    const instances = k.bffs === 0 ? 0 : k.async ? 6 : 40;
    const hopMs = k.bffs === 0 ? 0 : 12;
    return { perClient, waste, alexaOk, drift, instances, hopMs };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-bff-problem'] = {
    t: 'Ek endpoint, teen clients — kisi ko sahi nahi baithta',
    html: `
    <div class="dg-flow">
      <div class="dg-stack">
        <div class="dg-box is-good"><span class="bx-label">🖥️ Web: sab chahiye (56 KB)</span></div>
        <div class="dg-box is-bad"><span class="bx-label">📱 App: 2 KB chahiye, 56 KB aaya</span></div>
        <div class="dg-box is-bad"><span class="bx-label">🔊 Alexa: bolne layak text chahiye, JSON aaya</span></div>
      </div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold"><span class="ni">🍳</span><span class="nl">GET /restaurant-page</span><span class="ns">?platform= if-else jugaad</span></div>
    </div>`,
  };
  VISUALS['ms-bff-pattern'] = {
    t: 'Har client ka apna BFF — sirf presentation',
    html: `
    <div class="dg-flow">
      <div class="dg-stack">
        <div class="dg-node is-accent"><span class="ni">🖥️</span><span class="nl">web BFF</span><span class="ns">poora page</span></div>
        <div class="dg-node is-accent"><span class="ni">📱</span><span class="nl">mobile BFF</span><span class="ns">chhota + attestation</span></div>
        <div class="dg-node is-accent"><span class="ni">🔊</span><span class="nl">voice BFF</span><span class="ns">speech</span></div>
      </div>
      <div class="dg-arrow flow"></div>
      <div class="dg-stack">
        <div class="dg-box"><span class="bx-label">🍳 restaurant · ⭐ reviews · 🧾 orders</span></div>
        <div class="dg-box"><span class="bx-label">general purpose, ek shape, gRPC andar</span></div>
      </div>
    </div>
    <div class="dg-cap">BFF: kya fetch, kaise jodo, kya bhejo. Business logic services mein.</div>`,
  };
  VISUALS['ms-bff-when'] = {
    t: 'BFF kab?',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-pill good">✅ Lagao jab</div>
        <div class="dg-box is-good"><span class="bx-label">clients ke UI bahut alag (web 50 cheezein, app 10)</span></div>
        <div class="dg-box is-good"><span class="bx-label">format alag (Alexa speech, bank partner XML)</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-pill bad">💸 Keemat</div>
        <div class="dg-box is-bad"><span class="bx-label">fan-out network heavy, BFF phool sakta hai</span></div>
        <div class="dg-box is-bad"><span class="bx-label">BFFs mein code duplication</span></div>
        <div class="dg-box is-bad"><span class="bx-label">aur components, ek aur hop</span></div>
      </div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Problem
       ================================================================= */
    {
      id: 'ms-bff-problem',
      icon: '📱',
      title: 'Ek Endpoint, Teen Clients — Web, App aur Alexa',
      badge: 'Client Kaaran',
      source: Object.assign({ at: 186 }, SRC),
      hook: {
        when: 'KhanaKart · app launch ke 3 mahine baad',
        title: 'Mobile par restaurant page 56 KB ka — aur Alexa kuch bol hi nahi pa raha',
        text: 'KhanaKart pehle sirf website thi. Restaurant page ke liye ek endpoint: <code>GET /v1/restaurant-page/:id</code> — 30 photos, 120 dishes descriptions ke saath, 20 FAQs, 50 reviews. Ek call, poora page. Phir mobile app aaya: chhoti screen par sirf 30 dishes aur 3 reviews dikhte hain, par app ko wahi 56 KB milta hai. Tier-2 shehron ke 4G par page dheema, data aur battery barbaad. Phir "Alexa, KhanaKart se pichhla order dobara mangao" skill — Alexa ko bolne layak text chahiye, JSON nahi.',
      },
      objectives: [
        'Web ke liye bana <b>ek bada response</b> mobile aur voice par kyun bekaar',
        'Mobile par nuksaan: <b>bandwidth, battery, memory, render time</b>',
        'Voice/Alexa jaise clients ko <b>bilkul alag format</b>',
        '<code>?platform=</code> <b>jugaad</b>: core backend mein if-else ka jungle',
      ],
      steps: [
        {
          q: 'Web ke liye ek bada response kyun banaya tha?',
          body: 'Desktop web par ek page par sab kuch dikhta hai: photos, poora menu, FAQs, reviews. Browser ek call kare aur poora page render ho — isliye ek endpoint sab kuch lautata tha. Web ke liye yeh sahi design tha.',
        },
        {
          q: 'Mobile app aaya toh kya bigda?',
          analogy: 'Poore parivaar ke liye 5 kilo ka khaana pack karwaya, aur ghar par sirf ek insaan hai. Baaki khaana uthake laana bhi pada, fridge bhi bhara, aur fenkna bhi pada.',
          points: [
            'Chhoti screen: sirf 30 dishes (naam, daam, veg) aur top 3 reviews. FAQs aur reviews alag screen par.',
            'Par endpoint wahi 56 KB bhejta hai — <b>96% bekaar</b>.',
            '4G par zyada download time, <b>battery</b>, <b>memory</b>, JSON parse aur render dheema.',
          ],
        },
        {
          q: 'Alexa ki zaroorat kaisi alag hai?',
          body: 'Voice skill ko screen hi nahi. Chahiye ek bolne layak jawab: "Sharma Dhaba, 4.3 star. Aapka pichhla order tha 1 Paneer Tikka aur 2 Butter Naan, 340 rupaye. Kya dobara order karein?" — aur pichhla order <b>orders-service</b> se, jo web page mein tha hi nahi.',
        },
        {
          q: '?platform= jugaad mein kya galat hai?',
          body: 'Core backend mein: <code>if platform == "app" … else if platform == "alexa" … else …</code>. Kaam chal jaata hai — par:',
          points: [
            'Har naya client ya chhota UI tweak = <b>core backend ka code + deploy</b>. Mobile team core team ke intezaar mein.',
            'Core ka code client-specific <b>if-else ka jungle</b>; ek client ka badlaav doosre ko tod sakta hai.',
            'Ek response shape ki jagah kai variants — <b>poora response cache</b> karna mushkil.',
          ],
          asli: 'Problem asli hai: alag clients ko alag shapes chahiye. Sawaal hai yeh "alag" kahan rahe — core backend mein nahi.',
        },
      ],
      myth: [
        { myth: 'Mobile ko bhi poora data bhej do, app khud filter kar lega.', sach: 'Filter karne se pehle data download, parse aur memory mein aata hai. Slow network aur sasta phone — user ko wahi dikhta hai: dheema app.' },
        { myth: 'GraphQL laga do, sab problem khatam.', sach: 'GraphQL client ko fields chunne deta hai — mobile payload ka hissa sudharta hai. Par Alexa jaisa alag format, client-specific security aur aggregation logic kahin toh rakhna padega. GraphQL server aksar BFF ki jagah hi baith-ta hai.' },
      ],
      playbook: {
        title: 'ek endpoint, kai clients — pehchaan',
        use: [
          'Har client ke liye "kya dikhta hai" ki list banao',
          'Payload vs use ka hisaab (bytes aaye / screen par use)',
          'Client-specific if-else ki ginti core backend mein',
        ],
        avoid: [
          'Mobile ko web ka response',
          'Core backend mein ?platform= branches badhana',
          'Alexa/partner format ke liye core API badalna',
        ],
        how: [
          'Network tab / RUM se har client ka payload aur render time naapo',
          'Core API ko general purpose rakho (ek shape)',
          'Client-specific shaping ek alag layer mein (agla level: BFF)',
        ],
        redflags: [
          'Mobile page ka payload 20 KB+ jabki screen par 2-3 KB',
          'Core backend PRs mein "app ke liye" / "alexa ke liye"',
          'Response cache hit rate client variants ke saath gir raha',
        ],
        rule: 'Alag clients ko alag shape chahiye — par woh "alag" core backend ka bojh nahi hona chahiye.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — teen clients, ek backend',
          goal: '<b>Teeno clients</b> (web, app, Alexa): app page 4G par <b>≤ 300 ms</b> network time, Alexa ko <b>bolne layak</b> jawab, core backend mein <b>0 platform if-else</b>, aur core cache hit <b>≥ 85%</b>.',
          scenario: 'Poora restaurant page 56 KB. App ki screen ko ~2-3 KB chahiye. 4G: RTT 250 ms, 1.5 Mbps.',
          knobs: [
            { id: 'clients', label: 'Clients', min: 1, max: 3, step: 1, value: 1, labels: { 1: 'sirf web', 2: 'web + app', 3: 'web + app + Alexa' } },
            { id: 'approach', label: 'Tareeka', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'sabko ek hi response', 1: '?platform= if-else core mein', 2: 'har client ka BFF' } },
          ],
          nodes: [N('web', 150, 80), N('app', 150, 260), N('alexa', 150, 440), N('bff', 480, 260, { label: 'BFF layer' }), N('restaurant', 830, 260, { label: 'core backend' })],
          edges: [{ from: 'web', to: 'bff', dashed: true }, { from: 'app', to: 'bff', dashed: true }, { from: 'alexa', to: 'bff', dashed: true }, { from: 'bff', to: 'restaurant', dashed: true }, { from: 'web', to: 'restaurant' }],
          model: k => {
            const m = endpointModel(k);
            const okM = !m.multi || m.mobileMs <= 300, okA = m.alexaOk, okB = m.branches === 0, okC = m.cache >= 85, okAll = k.clients === 3;
            const via = k.approach === 2 ? 'bff' : null;
            const flow = (from, label, tone) => via
              ? [{ from, to: 'bff', label, tone }, { from: 'bff', to: 'restaurant', tone: 'ok', rate: 0.4 }]
              : [{ from, to: 'restaurant', label, tone }];
            return {
              nodes: {
                web: { tone: 'ok', badge: '56 KB · sab dikhta' },
                app: { tone: !m.multi ? 'idle' : okM ? 'ok' : 'bad', badge: !m.multi ? 'abhi nahi' : `${m.mobileKB} KB · ${m.mobileMs} ms` },
                alexa: { tone: !m.alexa ? 'idle' : okA ? 'ok' : 'bad', badge: !m.alexa ? 'abhi nahi' : okA ? 'speech ✅' : 'JSON — bol nahi sakta' },
                bff: { tone: k.approach === 2 ? 'acc' : 'idle', badge: k.approach === 2 ? `${k.clients} BFF` : 'nahi hai' },
                restaurant: { tone: okB && okC ? 'ok' : 'slow', badge: m.branches ? `${m.branches} if-else · cache ${m.cache}%` : `ek shape · cache ${m.cache}%` },
              },
              flows: [
                ...flow('web', null, 'ok'),
                ...(m.multi ? flow('app', k.approach === 0 ? '56 KB' : '2-3 KB', okM ? 'ok' : 'bad') : []),
                ...(m.alexa ? flow('alexa', okA ? 'speech' : 'JSON', okA ? 'ok' : 'bad') : []),
              ],
              readouts: [
                { label: 'App network time (4G)', value: m.multi ? m.mobileMs + ' ms' : '—', tone: okM ? 'ok' : 'bad' },
                { label: 'Alexa', value: !m.alexa ? '—' : okA ? 'bolne layak' : 'JSON', tone: okA ? 'ok' : 'bad' },
                { label: 'Core mein platform if-else', value: String(m.branches), tone: okB ? 'ok' : 'bad' },
                { label: 'Core deploys/mahina (client tweaks)', value: String(m.coreDeploys), tone: m.coreDeploys ? 'bad' : 'ok' },
                { label: 'Core response cache hit', value: m.cache + '%', tone: okC ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'App payload', pct: m.multi ? Math.min(100, m.mobileKB * 1.8) : 0, text: m.multi ? m.mobileKB + ' KB' : '—', tone: okM ? 'ok' : 'bad' }],
              verdict: !okAll
                ? { ok: false, text: k.clients === 1 ? 'Sirf web par ek bada response bilkul theek hai. Ab app aur Alexa jodo.' : 'App aa gaya. Alexa bhi jodo — asli imtihaan teen alag clients hain.' }
                : k.approach === 0
                  ? { ok: false, text: `Sabko 56 KB: app ${m.mobileMs} ms aur 96% bekaar, Alexa JSON nahi bol sakta.` }
                  : k.approach === 1
                    ? { ok: false, text: `Jugaad chal gaya, par core mein ${m.branches} if-else, ${m.coreDeploys} deploys/mahina sirf client tweaks ke liye, cache ${m.cache}%.` }
                    : { ok: true, text: `BFF: app ${m.mobileKB} KB (${m.mobileMs} ms), Alexa speech, core ek shape — 0 if-else, cache ${m.cache}%.` },
            };
          },
          check: k => { const m = endpointModel(k); return k.clients === 3 && m.mobileMs <= 300 && m.alexaOk && m.branches === 0 && m.cache >= 85; },
          lesson: '✅ <b>Alag clients, alag darwaaze.</b> Client-specific shaping core backend se bahar gayi — core ek general shape deta hai aur har client ko uske layak jawab milta hai. Agla level: BFF ke andar kya hota hai.',
          quiz: {
            q: 'Sirf ek web client ho toh BFF chahiye?',
            choices: ['Aam taur par nahi — ek client ke liye ek achha API kaafi; BFF tab jab clients ki zaroorat alag ho', 'Haan, hamesha', 'Haan, security ke liye zaroori', 'Nahi, BFF sirf Alexa ke liye'],
            answer: 0,
            explain: 'BFF ek jawab hai "clients alag" problem ka.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — website se app, app se Alexa',
          goal: 'Har naye client ke saath ek endpoint par kya dabaav aaya.',
          nodes: [N('web', 150, 80), N('app', 150, 260), N('alexa', 150, 440), N('restaurant', 700, 260, { label: 'core: /restaurant-page' })],
          edges: [{ from: 'web', to: 'restaurant' }, { from: 'app', to: 'restaurant' }, { from: 'alexa', to: 'restaurant' }],
          panels: [{ id: 'core', title: 'Core backend ka code' }, { id: 'users', title: 'Users ka anubhav' }],
          steps: [
            {
              say: '<b>Saal 1.</b> Sirf website. <code>GET /v1/restaurant-page/R-4</code> → 56 KB: photos, menu, FAQs, 50 reviews. Ek call, poora page. Sab khush.',
              flows: [{ from: 'web', to: 'restaurant', label: '56 KB', tone: 'ok' }],
              nodes: { web: { tone: 'ok', badge: 'page 1 call mein' }, restaurant: { tone: 'ok', badge: 'ek shape' } },
              panels: { core: ['return restaurantPage'], users: ['Web: tez ✅'] },
            },
            {
              say: '<b>Saal 2.</b> Mobile app launch. App wahi endpoint call karta hai, 56 KB mein se 3 KB dikhata hai. Indore ke 4G par page ~550 ms network, sasta phone JSON parse mein atakta hai.',
              flows: [{ from: 'app', to: 'restaurant', label: '56 KB (3 KB kaam ka)', tone: 'bad' }],
              nodes: { app: { tone: 'bad', badge: '96% bekaar' } },
              panels: { users: ['Web ✅', 'App: "page dheema" reviews ⭐⭐'] },
              ask: {
                q: 'App team kya kare?',
                choices: ['Chhota response maange — sawaal: kahan banega?', 'Phones ko tez karo', 'Kuch nahi, users adjust karenge', 'Web band karo'],
                answer: 0,
                explain: 'Zaroorat saaf hai. Design ka sawaal hai jagah.',
              },
            },
            {
              say: 'Jaldi mein fix: <code>?platform=app</code> par core backend mein if-else: gallery 1 photo, menu 30 items, reviews 3, FAQs hatao. App tez. Par ab core team ke backlog mein app team ki tickets.',
              flows: [{ from: 'app', to: 'restaurant', label: '?platform=app → 3 KB', tone: 'ok' }],
              nodes: { restaurant: { tone: 'slow', badge: 'if app … else …' }, app: { tone: 'ok', badge: '3 KB' } },
              panels: { core: ['if platform == app: 4 branches', 'else: web'], users: ['Web ✅', 'App ✅ (abhi)'] },
            },
            {
              say: '<b>Saal 3.</b> Alexa skill. Alexa ko bolne layak text + pichhla order (orders-service) chahiye. Core backend mein teesri branch: orders call + speech banana. Ek din web ke liye gallery ka badlaav galti se app branch tod deta hai.',
              flows: [{ from: 'alexa', to: 'restaurant', label: '?platform=alexa', tone: 'slow' }, { from: 'app', to: 'restaurant', label: 'toota', tone: 'bad' }],
              nodes: { alexa: { tone: 'slow', badge: 'speech (jugaad)' }, restaurant: { tone: 'bad', badge: '6 if-else · cache 62%' }, app: { tone: 'bad', badge: 'regression' } },
              panels: { core: ['if app … else if alexa … else web', 'orders-service call sirf alexa ke liye', 'har tweak = core deploy'], users: ['App: gallery toot gayi ❌'] },
              ask: {
                q: 'Is jugaad ki asli dikkat?',
                choices: ['Client-specific presentation logic core backend mein — har client ka badlaav core ka deploy aur doosre clients ka risk', 'Alexa slow hai', 'Web purana hai', 'Cache band karo'],
                answer: 0,
                explain: 'Agla level: yeh logic har client ke apne BFF mein.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> har naya client alag shape maangta hai. Core backend mein if-else badhana sabse aasaan dikhta hai, par core ko sab clients ka ghulam bana deta hai.',
        },
        {
          type: 'bins',
          title: 'Kis client ko kya chahiye?',
          instructions: 'Har cheez ko us client mein daalo jise us restaurant page par sabse zyada zaroorat hai.',
          bins: [{ id: 'web', label: '🖥️ Web' }, { id: 'app', label: '📱 App' }, { id: 'alexa', label: '🔊 Alexa' }],
          items: [
            { text: '30 photos ki gallery', bin: 'web', explain: 'Badi screen.' },
            { text: 'Top 3 reviews, 80 characters', bin: 'app', explain: 'Chhoti screen.' },
            { text: '"Kya dobara order karein?" bolne layak text', bin: 'alexa', explain: 'Voice.' },
            { text: '20 FAQs ek hi page par', bin: 'web', explain: 'App mein alag screen.' },
            { text: 'Pichhla order orders-service se', bin: 'alexa', explain: 'Reorder skill.' },
            { text: 'App attestation (asli app hai?) check', bin: 'app', explain: 'Mobile ka security.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Problem — quick check',
          questions: [
            {
              q: 'Mobile ko web ka poora response bhejne ka sabse bada nuksaan?',
              choices: ['Bandwidth, battery, memory aur render time — slow network par dheema app', 'Security', 'Server CPU', 'Kuch nahi'],
              answer: 0,
              explain: 'User device par bojh.',
            },
            {
              q: '?platform= if-else core backend mein — kaunsi dikkat NAHI?',
              choices: ['Mobile payload bada rehta hai', 'Har client tweak par core deploy', 'Core code client-specific jungle', 'Response cache variants se kam'],
              answer: 0,
              explain: 'Payload toh chhota ho jaata hai — dikkat core ki.',
            },
            {
              q: 'Alexa skill ke liye core API ka JSON kyun kaafi nahi?',
              choices: ['Voice ko bolne layak text/format aur alag data (pichhla order) chahiye', 'Alexa JSON nahi padh sakta kabhi', 'Alexa HTTP nahi karta', 'Alexa ko reviews chahiye'],
              answer: 0,
              explain: 'Format aur content dono alag.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — ek endpoint aur ?platform jugaad',
          project: '10-bff',
          exercise: 'ex1-one-endpoint',
          goal: 'Teen clients ke bytes naapo — pehle ek response, phir core backend jugaad.',
          steps: [
            { text: 'Install karo, ek response mode.', cmd: 'cd arpitbhayaniclasses/docker-labs/10-bff\nnpm install\nnpm start ex1-one-endpoint\nnpm run clients generic', expect: 'web    56 KB   56 KB   0%\napp    56 KB   3 KB    96%   ~555 ms\nalexa  56 KB   ...    100%\nAlexa bolega: (JSON — Alexa isse bol nahi sakta)' },
            { text: 'Ctrl+C. Jugaad mode.', cmd: 'HACK=1 npm start ex1-one-endpoint\nnpm run clients hack\ncurl localhost:5210/stats', expect: 'app 3 KB, alexa speech\ncore backend: 6 platform if-else branches, variants ["web","app","alexa"]' },
          ],
          observe: {
            q: 'Jugaad mode mein app tez ho gaya. Toh problem kahan gayi?',
            choices: [
              'services/generic-api.js (core) mein — 6 client-specific branches; har naya client ya tweak core ka code aur deploy',
              'Problem khatam',
              'App mein',
              'Alexa mein',
            ],
            answer: 0,
            explain: 'Bojh client se hat kar core backend par aa gaya.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Multi-client APIs',
        instructions: 'API design ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Web, mobile aur voice teeno ek API use karte hain. Kya dikkatein?"',
            choices: [
              'Over-fetching (mobile bandwidth/battery), under-fetching (voice ko extra data), alag formats, client-specific branching core mein, deploy coupling, cache fragmentation',
              'Koi dikkat nahi',
              'Sirf security',
              'Sirf latency',
            ],
            answer: 0,
            explain: 'Poori list.',
          },
          {
            q: 'Interviewer: "Mobile payload kaise chhota karoge?"',
            choices: [
              'Client-specific response (BFF ya GraphQL field selection), pagination, compression, images ke thumbnails, detail screens ke liye alag calls',
              'Gzip hi kaafi',
              'Mobile ko kam users do',
              'JSON ki jagah XML',
            ],
            answer: 0,
            explain: 'Shape + transport dono.',
          },
          {
            q: 'Interviewer: "?platform param approach kab theek hai?"',
            choices: [
              'Bahut chhote farak aur 1-2 clients ke liye temporary; clients aur farak badhe toh BFF/GraphQL',
              'Hamesha',
              'Kabhi nahi',
              'Sirf Alexa ke liye',
            ],
            answer: 0,
            explain: 'Chhoti shuruaat theek, jungle nahi.',
          },
        ],
      },
      success: [
        'Main samjha sakta hoon web ke liye bana response mobile/voice par kyun bekaar',
        'Main mobile payload waste ko numbers se dikha sakta hoon',
        'Main ?platform jugaad ke nuksaan bata sakta hoon',
        'Main pehchaan sakta hoon kab clients ki zaroorat sach mein alag hai',
      ],
      homework: '<p>Apne app ki ek screen lo aur browser/app network tab se response size naapo. Screen par asal mein kitne fields dikhte hain? "Bytes aaye / use hue" ka ratio nikaalo aur likho yeh shaping kahan honi chahiye.</p>',
      cards: [
        { front: 'Ek response sab clients ko — mobile par nuksaan?', back: '<b>Bandwidth, battery, memory, render time</b>.' },
        { front: '?platform jugaad ki dikkat?', back: 'Core mein <b>client if-else</b>, har tweak par core deploy, cache variants.' },
        { front: 'Voice client ko kya alag chahiye?', back: '<b>Bolne layak format</b> + alag data (pichhla order).' },
        { front: 'Web ke liye bada response galat tha?', back: '<b>Nahi</b> — ek client ke liye sahi tha; clients badhe tab dikkat.' },
      ],
    },

    /* =================================================================
       LEVEL: BFF pattern
       ================================================================= */
    {
      id: 'ms-bff-pattern',
      icon: '🎨',
      title: 'BFF Pattern — Har Client ka Apna Backend',
      badge: 'BFF Bhaiya',
      source: Object.assign({ at: 590 }, SRC),
      hook: {
        when: 'KhanaKart · platform redesign',
        title: 'Mobile team ko ek field chahiye tha — core team ka 3 hafte intezaar',
        text: 'Mobile team "restaurant open hai ya band" badge dikhana chahti thi. Field core backend ke restaurant response mein tha, par <code>?platform=app</code> branch use hata deti thi. Core team ke paas 40 tickets pehle se. 3 hafte baad deploy hua — aur us deploy ne Alexa branch ka ek bug de diya. Platform architect ne prastaav rakha: har client ka apna chhota backend, jo us client ki team chalaaye.',
      },
      objectives: [
        '<b>BFF</b>: har client type ke liye ek backend (web BFF, mobile BFF, voice BFF) — client aur core ke beech',
        'BFF sirf <b>presentation layer</b>: kya fetch, kaise fetch, kya bhejna — <b>business logic nahi</b>',
        'Microservices ke saath: har BFF alag services call kare (mobile BFF → AR service; web BFF → reviews)',
        'Faayde: isolation, tez tweaks, sensitive fields chhupana, sahi protocol/format, client-specific security, core generic + cacheable',
      ],
      steps: [
        {
          q: 'BFF kya hai?',
          analogy: 'Restaurant ki ek kitchen (core backend), par teen counters: dine-in (plate mein sajaake), takeaway (dabbe mein), aur Zomato rider (seal packet + bill). Khaana wahi, packing har counter ki apni.',
          body: 'Har client type ke liye ek chhota backend: <b>web BFF</b>, <b>mobile BFF</b>, <b>voice BFF</b>. Client sirf apne BFF se baat karta hai. BFF core services se data leta hai aur us client ke layak shape mein lautata hai. Har BFF ek tarah ka apna API gateway hai — kai entry points.',
        },
        {
          q: 'BFF mein kya jaata hai, kya nahi?',
          points: [
            '✅ Kaunsi services call karni hain, kis kram mein (aggregation)',
            '✅ Fields chunna, trim karna, format (JSON, speech, XML)',
            '✅ Client-specific auth/security checks (app attestation)',
            '❌ Discount calculation, order rules, stock logic — yeh <b>core services</b> ka kaam',
          ],
          asli: 'Test: agar yahi rule doosre client ko bhi chahiye (₹199 se upar free delivery), toh woh BFF mein nahi, service/shared library mein.',
        },
        {
          q: 'Data fetch karke phenkna — bekaar nahi?',
          body: 'Core restaurant-service poora response deta hai; mobile BFF 30 dishes rakhta hai. Kyun core ko hi chhota nahi karwaate? Kyunki core <b>generic</b> rehta hai: <b>ek shape</b>, sab clients ke liye, aur <b>poora response cache</b> ho sakta hai. BFF aur core data center ke andar hain — wahan ka bandwidth sasta aur tez hai; mehenga raasta phone tak ka hai.',
        },
        {
          q: 'Microservices ke saath BFF kaisa dikhta hai?',
          body: '<table><tr><th>BFF</th><th>Calls</th><th>Client ko</th></tr>' +
            '<tr><td>Web BFF</td><td>restaurant + reviews (50) + offers</td><td>Poora page, internal fields hata ke</td></tr>' +
            '<tr><td>Mobile BFF</td><td>restaurant + reviews (3) + AR service (dish ko table par dekho)</td><td>Chhota page + AR model link</td></tr>' +
            '<tr><td>Voice BFF</td><td>restaurant + orders (pichhla order)</td><td>Speech + reprompt</td></tr></table>',
          example: 'BFF aur services ke beech <b>gRPC</b> (servers bol sakte hain); browser ko HTTP/JSON. Ek purane bank partner ko XML chahiye? Uska alag BFF — baaki sab JSON.',
        },
        {
          q: 'Security mein BFF kaise madad karta hai?',
          points: [
            'Core ke <b>sensitive fields</b> (commissionPct, gstin, ownerPhone) BFF hata deta hai — client tak kabhi nahi.',
            'Client-specific checks: mobile BFF par app attestation (Play Integrity/App Attest), web BFF par CSRF/cookies, voice BFF par Alexa request signature.',
            'Har client ka attack surface alag — checks bhi alag, ek jagah.',
          ],
        },
      ],
      myth: [
        { myth: 'BFF mein business logic daal do, jaldi ho jaayega.', sach: 'Tab 3 BFFs mein 3 alag price rules — pehla bug drift ka. BFF presentation hai; rules services ya shared library mein.' },
        { myth: 'BFF aur API gateway same hain.', sach: 'Gateway aksar ek, sab clients ke liye common kaam (auth, rate limit, routing). BFF har client type ka alag, us client ki shaping aur aggregation. Dono saath chal sakte hain: gateway → BFFs → services.' },
      ],
      playbook: {
        title: 'BFF pattern',
        use: [
          'Har client type (web, mobile, voice, partner) ka ek BFF',
          'BFF ki ownership us client ki team ke paas',
          'BFF → services gRPC/HTTP, BFF → client jo client samjhe',
          'Sensitive field stripping + client-specific security BFF par',
        ],
        avoid: [
          'Business rules BFF mein',
          'Har screen ka alag BFF (BFF-per-screen explosion)',
          'BFFs ek doosre ko call karein',
        ],
        how: [
          'Client ki screens ki list → BFF endpoints',
          'Har endpoint: kaunsi services, parallel plan, timeouts, trim',
          'Shared rules/clients ek library mein (agla level)',
          'BFF ka apna monitoring aur deploy pipeline',
        ],
        redflags: [
          'Mobile team core team ke intezaar mein',
          'Client tak internal fields pahunch rahe',
          'BFF mein price/discount calculation',
        ],
        rule: 'Har client ka apna darwaaza — packing wahan, khaana kitchen (services) mein.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — mobile BFF ke andar ek request',
          goal: 'Mobile app ka "restaurant page" request mobile BFF mein kaise banta hai.',
          nodes: [N('app', 120, 260), N('bff', 410, 260, { label: 'mobile BFF' }), N('restaurant', 800, 60), N('review', 850, 200), N('inventory', 850, 320, { icon: '🪑', label: 'AR service' }), N('orders', 790, 440, { icon: '🧾', label: 'orders' })],
          edges: [{ from: 'app', to: 'bff' }, { from: 'bff', to: 'restaurant' }, { from: 'bff', to: 'review' }, { from: 'bff', to: 'inventory' }, { from: 'bff', to: 'orders', dashed: true }],
          panels: [{ id: 'bff', title: 'Mobile BFF kya kar raha hai' }, { id: 'resp', title: 'App ko jawab' }],
          steps: [
            {
              say: 'App request bhejta hai: <code>GET /restaurant-page/R-4</code> with header <code>x-app-attestation</code>. Mobile BFF pehle check karta hai: asli KhanaKart app hai? Bina attestation → 403. Yeh check web BFF par nahi hai.',
              flows: [{ from: 'app', to: 'bff', label: 'page + attestation', tone: 'acc' }],
              nodes: { bff: { tone: 'busy', badge: 'attestation ✅' } },
              panels: { bff: ['1. App attestation check'], resp: ['…'] },
              ask: {
                q: 'Attestation check mobile BFF par kyun, core restaurant-service par kyun nahi?',
                choices: ['Mobile-specific security hai; core generic rahe aur web/voice ke apne checks apne BFF par', 'Core slow hai', 'Core ke paas header nahi pahunchta', 'Koi wajah nahi'],
                answer: 0,
                explain: 'Client-specific checks client ke darwaaze par.',
              },
            },
            {
              say: 'BFF ek saath calls karta hai (gRPC): restaurant-service, reviews (<b>limit 3</b>), AR service (dish 3D model links). Orders-service ki zaroorat is screen par nahi — call nahi.',
              flows: [{ from: 'bff', to: 'restaurant', label: 'gRPC', tone: 'ok' }, { from: 'bff', to: 'review', label: 'limit=3', tone: 'ok' }, { from: 'bff', to: 'inventory', label: 'AR models', tone: 'ok' }],
              nodes: { restaurant: { tone: 'ok', badge: '56 KB generic' }, review: { tone: 'ok', badge: '3 reviews' }, inventory: { tone: 'ok', badge: '5 models' }, orders: { tone: 'idle', badge: 'call nahi' } },
              panels: { bff: ['1. attestation ✅', '2. parallel fan-out (gRPC)'] },
            },
            {
              say: 'BFF shape banata hai: cover photo 1, menu 30 items (naam, daam, veg), top 3 reviews 80 characters, AR links. <b>commissionPct, gstin, ownerPhone</b> — hata diye.',
              flows: [],
              nodes: { bff: { tone: 'acc', badge: 'trim + strip' } },
              panels: { bff: ['3. trim: 30 items, 3 reviews', '4. strip: commission, gstin, phone'], resp: ['~2 KB JSON'] },
              ask: {
                q: '"Free delivery ₹199 se upar" ka rule yahan likhein?',
                choices: ['Nahi — business rule service/shared library mein; BFF sirf dikhaaye', 'Haan, mobile BFF mein', 'Haan, teeno BFFs mein copy', 'App mein'],
                answer: 0,
                explain: 'BFF presentation hai. Rule ek jagah.',
              },
            },
            {
              say: 'App ko ~2 KB, 4G par ~260 ms. Mobile team ko "open/band" badge chahiye? <b>Sirf mobile BFF</b> badlo — core aur web/voice ko chhona nahi. Deploy usi din.',
              flows: [{ from: 'bff', to: 'app', label: '2 KB', tone: 'ok', back: true }],
              nodes: { app: { tone: 'ok', badge: '~260 ms' } },
              panels: { resp: ['~2 KB', 'Naya badge: mobile BFF deploy, same din'] },
            },
          ],
          lesson: '<b>Asli baat:</b> BFF = client ka darwaaza: us client ki security, us client ke layak calls aur shape. Core generic rehta hai, aur client team apni raftaar se chalti hai.',
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — KhanaKart ke BFFs',
          instructions: 'Har faisle ke liye option chuno.',
          brief: 'Clients: web, Android/iOS app, Alexa skill, aur ek purana bank partner (cashback ke liye XML API chahiye).',
          requirements: ['Mobile team apne tweaks khud ship kare', 'Internal fields client tak na pahunchein', 'Price rules sab clients mein ek jaise'],
          slots: [
            {
              id: 'count', label: 'Kitne BFFs', icon: '🎨',
              options: [
                { id: 'perclient', label: 'Har client type ka ek: web, mobile (Android+iOS), voice, partner-XML', score: 3, why: 'Alag zaroorat, alag darwaaza; Android/iOS ki zaroorat milti-julti.' },
                { id: 'perscreen', label: 'Har screen ka alag BFF', score: -2, why: 'Dozens BFFs, duplication aur ops ka jungle.' },
                { id: 'one', label: 'Ek BFF sab ke liye', score: -2, why: 'Wahi generic API dobara — if-else ab BFF mein.' },
              ],
            },
            {
              id: 'rule', label: '"₹199 se upar free delivery" rule', icon: '🧮',
              options: [
                { id: 'service', label: 'Pricing service / shared library; BFFs sirf dikhayein', score: 3, why: 'Ek rule, ek jagah — drift nahi.' },
                { id: 'eachbff', label: 'Har BFF mein apna', score: -3, why: 'Rule badla, ek BFF bhool gaya — alag clients alag daam.' },
              ],
            },
            {
              id: 'proto', label: 'BFF ↔ services protocol', icon: '🔌',
              options: [
                { id: 'grpc', label: 'gRPC (internal), client ko JSON/speech/XML', score: 3, why: 'Servers gRPC bol sakte; browser ko HTTP/JSON.' },
                { id: 'browsergrpc', label: 'Browser se seedha gRPC services ko', score: -2, why: 'Browser native gRPC nahi bolta; internals expose.' },
              ],
            },
            {
              id: 'partner', label: 'Bank partner XML', icon: '🏦',
              options: [
                { id: 'xmlbff', label: 'Alag partner BFF jo XML bole', score: 3, why: 'Ek client ki ajeeb zaroorat, ek jagah seemit.' },
                { id: 'corexml', label: 'Core services mein XML support jodo', score: -2, why: 'Sab services ek client ke liye badli.' },
              ],
            },
            {
              id: 'owner', label: 'Mobile BFF ka owner', icon: '👥',
              options: [
                { id: 'mobileteam', label: 'Mobile team', score: 3, why: 'Jo client jaanta hai woh uska backend chalaaye — tweaks tez.' },
                { id: 'coreteam', label: 'Core backend team', score: -1, why: 'Phir wahi intezaar — BFF ka aadha faayda gaya.' },
              ],
            },
          ],
          pass: 12,
          verdicts: {
            great: '🌟 Har client ka darwaaza, rules ek jagah, sahi owner.',
            ok: '👍 Kareeb — laal slots dekho.',
            bad: '😅 Yeh setup ya toh jungle banega ya wahi purana intezaar.',
          },
        },
        {
          type: 'match',
          title: 'BFF ka faayda → KhanaKart example',
          pairs: [
            { left: 'Isolated interfaces', right: 'Web ka gallery badlaav mobile ko nahi todta', explain: 'Alag BFFs, alag code.' },
            { left: 'Sensitive fields chhupana', right: 'gstin, commissionPct client tak nahi', explain: 'BFF strip karta hai.' },
            { left: 'Sahi protocol/format', right: 'Bank partner ko XML, baaki JSON', explain: 'Partner BFF.' },
            { left: 'Core generic + cacheable', right: 'restaurant-service ka ek shape, poora response cache', explain: 'Variants BFF mein.' },
          ],
        },
        {
          type: 'quiz',
          title: 'BFF pattern — quick check',
          questions: [
            {
              q: 'BFF ki zimmedari kya NAHI hai?',
              choices: ['Coupon discount calculate karna', 'Kaunsi services call karni', 'Fields trim karna', 'Client-specific auth check'],
              answer: 0,
              explain: 'Business logic services mein.',
            },
            {
              q: 'Core data fetch karke BFF mein phenkna kyun theek hai?',
              choices: ['Core generic + cacheable rehta hai; data center ke andar bandwidth sasta, mehenga raasta phone tak', 'Kyunki data free hai', 'Kyunki core chhota response nahi de sakta', 'Theek nahi hai'],
              answer: 0,
              explain: 'Trade-off samjho.',
            },
            {
              q: 'BFF aur API gateway?',
              choices: ['Gateway common entry kaam (auth, rate limit, routing); BFF har client type ki shaping/aggregation — dono saath chal sakte', 'Same cheez', 'BFF gateway ko replace karta hi hai', 'Gateway sirf mobile ke liye'],
              answer: 0,
              explain: 'Layering.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — teen BFFs',
          project: '10-bff',
          exercise: 'ex2-bffs',
          goal: 'Har client ka payload aur format dekho, mobile ka security check aur internal fields ka hatna verify karo.',
          steps: [
            { text: 'BFFs chalao aur clients.', cmd: 'npm start ex2-bffs\nnpm run clients bff', expect: 'web 56 KB · app 2 KB · alexa 182 B\nAlexa bolega: "Sharma Dhaba, 4.3 star. Aapka pichhla order tha 1 Paneer Tikka aur 2 Butter Naan, 340 rupaye. Free delivery. Kya dobara order karein?"' },
            { text: 'Mobile security check.', cmd: "curl -i localhost:5222/restaurant-page/R-4\ncurl -s -H 'x-app-attestation: ok' localhost:5222/restaurant-page/R-4 | head -c 300", expect: '403 "app attestation missing — asli KhanaKart app nahi"\n{"id":"R-4","name":"Sharma Dhaba",...,"menu":[{"id":"d0","name":"Dish 0","price":120,"veg":false},...' },
            { text: 'Internal fields.', cmd: 'curl -s localhost:5201/v1/restaurants/R-4 | grep -o gstin\ncurl -s localhost:5221/restaurant-page/R-4 | grep -c gstin', expect: 'gstin    (core mein hai)\n0        (web BFF ne hataya)' },
          ],
          observe: {
            q: 'Voice BFF ko pichhla order kahan se mila jabki web/mobile BFF ne orders-service call nahi kiya?',
            choices: [
              'services/bff.js mein KIND=voice branch restaurant + orders call karti hai — har BFF apni zaroorat ki services chunta hai',
              'Core restaurant response mein tha',
              'Alexa ne bheja',
              'Cache se',
            ],
            answer: 0,
            explain: 'Per-client fetch plan — BFF ka core idea.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — BFF',
        instructions: 'Pattern ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "BFF pattern samjhao aur kab use karoge."',
            choices: [
              'Har client type ka dedicated backend jo core services aggregate karke client-specific response, format, protocol aur security deta hai; business logic services mein; jab clients ki UI/format zaroorat kaafi alag ho',
              'Frontend ka cache',
              'Database ka read replica',
              'Mobile app ka SDK',
            ],
            answer: 0,
            explain: 'Definition + trigger.',
          },
          {
            q: 'Interviewer: "BFF ka owner kaun?"',
            choices: [
              'Usi client ki team (mobile team mobile BFF) — client aur uska backend saath evolve karein; core team services ki owner',
              'Hamesha platform team',
              'Koi nahi',
              'DBA',
            ],
            answer: 0,
            explain: '"You build it, you run it" client ke liye.',
          },
          {
            q: 'Interviewer: "GraphQL vs BFF?"',
            choices: [
              'GraphQL client ko fields chunne deta hai (over-fetching kam); BFF client-specific aggregation, format (speech/XML), security aur protocol deta hai; GraphQL server aksar ek BFF ki tarah deploy hota hai',
              'GraphQL ne BFF khatam kar diya',
              'Dono same',
              'BFF sirf REST ke liye',
            ],
            answer: 0,
            explain: 'Overlap + farak.',
          },
        ],
      },
      success: [
        'Main BFF pattern aur uski zimmedari (presentation only) samjha sakta hoon',
        'Main per-client fetch plan microservices ke saath bana sakta hoon',
        'Main BFF ke faayde KhanaKart examples ke saath gina sakta hoon',
        'Main BFF ko gateway aur GraphQL se alag kar sakta hoon',
      ],
      homework: '<p>Apne product ke har client type ke liye ek BFF design likho: kaunse endpoints, har endpoint kaunsi services call karega, kaunse fields trim/strip, kaunsa security check, aur owner team. Ek business rule dhoondho jo galti se client/BFF mein likha hai — usse kahan le jaoge?</p>',
      cards: [
        { front: 'BFF?', back: '<b>Har client type ka apna backend</b> — client aur core services ke beech.' },
        { front: 'BFF mein kya?', back: 'Kya fetch, kaise jodo, kya bhejo, client security. <b>Business logic nahi.</b>' },
        { front: 'BFF ke 3 bade faayde?', back: 'Isolation + tez client tweaks, <b>sensitive fields chhupana</b>, <b>sahi format/protocol</b>.' },
        { front: 'Core generic kyun rahe?', back: 'Ek shape → <b>poora response cache</b>, sab clients ke liye stable.' },
      ],
    },

    /* =================================================================
       LEVEL: When BFF
       ================================================================= */
    {
      id: 'ms-bff-when',
      icon: '⚖️',
      title: 'BFF Kab, Kab Nahi — Keemat aur Triggers',
      badge: 'BFF Budhhiman',
      source: Object.assign({ at: 1287 }, SRC),
      hook: {
        when: 'KhanaKart · 6 mahine BFFs ke baad',
        title: 'Alexa ne ₹250 ke order par delivery fee maangi — web aur app ne nahi',
        text: 'Product team ne niyam badla: ₹299 ki jagah ₹199 se upar free delivery. Web BFF aur mobile BFF update hue. Voice BFF ki team us sprint mein chhutti par thi — voice BFF mein niyam ki purani copy reh gayi. Alexa users ko ₹30 fee sunayi gayi. Upar se mobile BFF Python threads par chalta tha, Diwali par har request 6 services ko fan-out karti thi — 40 instances lage. Kisi ne poocha: "BFF lagana galti thi?"',
      },
      objectives: [
        'Keemat 1: <b>fan-out network heavy</b> — BFF phool sakta hai; concurrent I/O mein achhi stack chuno',
        'Keemat 2: <b>code duplication</b> BFFs mein — shared niyam library mein',
        'Keemat 3: <b>aur moving parts</b> (deploy, monitor) aur <b>ek extra hop</b>',
        'Triggers: clients ke <b>UI bahut alag</b> ya <b>format alag</b> (Alexa, XML partner) — tabhi BFF',
      ],
      steps: [
        {
          q: 'BFF phoolta kyun hai?',
          body: 'Har page request 4-6 services ko call karti hai. 1,000 req/s = 6,000 outgoing calls/s. Thread-per-call stack (jaise sync Python threads) mein har call ek thread pakde intezaar karta hai → memory aur instances badhte hain. Async I/O stacks (Node, Go, async Python) intezaar mein thread nahi pakadte.',
          asli: 'BFF ka kaam zyaadatar <b>intezaar</b> (I/O) hai — isliye concurrent I/O mein achhi stack, per-dependency timeouts aur concurrency limits.',
        },
        {
          q: 'Duplication kaise hota hai aur kaise rokein?',
          body: 'Teeno BFFs restaurant, reviews ko call karte hain, teeno delivery fee dikhate hain. Har BFF ne call code aur niyam copy kiye. Niyam badla → har BFF mein badlo → koi ek bhoola → <b>drift</b>.',
          points: [
            '<b>Niyam</b> (₹199 free delivery) → pricing service ya shared library. BFF sirf wording.',
            '<b>Service clients</b> (restaurant/reviews ke gRPC clients, retries, timeouts) → shared client library.',
            'Consistency test: teeno BFFs se wahi cart poochho, jawab compare (CI mein).',
          ],
        },
        {
          q: 'Moving parts aur extra hop ki keemat?',
          points: [
            'Har BFF: alag deploy pipeline, dashboards, alerts, on-call.',
            'Client → BFF → services: data center ke andar ek hop ~5-15 ms. E-commerce/food page ke liye theek.',
            '5 ms budget wale paths (trading, real-time gaming) mein extra hop mat lagao.',
          ],
        },
        {
          q: 'BFF kab lagayein?',
          body: 'Do saaf triggers:',
          points: [
            '<b>UI bahut alag</b>: web 50 cheezein dikhata hai, app 10 — ek response sab par bhaari.',
            '<b>Format alag</b>: Alexa ko speech, purane bank partner ko XML, baaki sab JSON — us client ka BFF.',
          ],
          example: 'Kab nahi: sirf ek web client; web aur app lagbhag same screens; internal admin tool; ultra-low-latency path.',
          asli: 'BFF ek jawab hai "clients alag" problem ka — problem na ho toh BFF sirf ek aur cheez chalane ko hai.',
        },
      ],
      myth: [
        { myth: 'BFFs mein duplication hai, isliye ek hi BFF banao.', sach: 'Ek BFF sab clients ke liye = wahi generic API aur if-else. Duplication ka ilaaj shared library/service hai, ek BFF nahi.' },
        { myth: 'Extra hop se latency hamesha kharab.', sach: 'Extra hop ~10 ms, par mobile ke round trips aur payload kam karke user ka total time aksar ghat-ta hai. Naapo, maano mat.' },
      ],
      playbook: {
        title: 'BFF kab aur kaise sasta',
        use: [
          'Trigger: clients ki UI bahut alag ya format alag',
          'Async I/O stack BFF ke liye',
          'Shared rules/service-clients library',
          'Consistency tests BFFs ke beech',
        ],
        avoid: [
          'Ek client ke liye BFF',
          'Business rules har BFF mein copy',
          'Ultra-low-latency path par extra hop',
          'Thread-per-call BFF bina capacity plan',
        ],
        how: [
          'BFF lagane se pehle: har client ki screens + format ka farak likho',
          'Shared library: service clients, retries, timeouts, rules',
          'BFF load test: fan-out × peak req/s',
          'CI consistency test: same input → sab BFFs same business result',
        ],
        redflags: [
          'Alag clients ek hi cart ka alag total dikhate hain',
          'BFF instances service instances se zyada',
          'BFF hai par web aur app ke responses lagbhag same',
        ],
        rule: 'BFF tab jab clients sach mein alag hon — aur niyam ek jagah, wording BFF mein.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — BFFs ka sahi setup',
          goal: 'Web + app + Alexa: payload waste <b>≤ 10%</b>, Alexa <b>sahi format</b>, niyam drift <b>0</b>, aur Diwali peak par BFF instances <b>≤ 10</b>.',
          scenario: 'Clients ki UI bahut alag, Alexa ka format alag. Har page 6 services ko fan-out. Har quarter ~3 shared niyam badalte hain.',
          knobs: [
            { id: 'bffs', label: 'BFF', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'koi nahi (generic API)', 1: 'ek BFF sab ke liye', 2: 'har client ka BFF' } },
            { id: 'sharedLib', label: 'Shared niyam + service clients library', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'har BFF apna copy', 1: 'shared library' } },
            { id: 'async', label: 'BFF stack', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'thread-per-call', 1: 'async I/O' } },
          ],
          nodes: [N('web', 150, 80), N('app', 150, 260), N('alexa', 150, 440), N('bff', 480, 260, { label: 'BFF layer' }), N('restaurant', 840, 90, { label: '6 services' }), N('coupon', 830, 430, { id: 'lib', icon: '📚', label: 'shared library' })],
          edges: [{ from: 'web', to: 'bff' }, { from: 'app', to: 'bff' }, { from: 'alexa', to: 'bff' }, { from: 'bff', to: 'restaurant' }, { from: 'bff', to: 'lib', dashed: true }],
          model: k => {
            const m = bffCostModel(k);
            const okW = m.waste <= 10, okA = m.alexaOk, okD = m.drift === 0, okI = m.instances <= 10;
            return {
              nodes: {
                bff: { tone: k.bffs === 0 ? 'idle' : okI ? 'ok' : 'bad', badge: k.bffs === 0 ? 'nahi hai' : `${k.bffs === 2 ? '3 BFFs' : '1 BFF'} · ${m.instances} instances` },
                app: { tone: okW ? 'ok' : 'bad', badge: `waste ${m.waste}%` },
                alexa: { tone: okA ? 'ok' : 'bad', badge: okA ? 'speech ✅' : 'format galat' },
                web: { tone: 'ok', badge: 'poora page' },
                lib: { tone: k.sharedLib ? 'ok' : m.perClient ? 'bad' : 'idle', badge: k.sharedLib ? 'niyam ek jagah' : m.perClient ? `${m.drift} drift bugs/quarter` : '—' },
                restaurant: { tone: 'ok', badge: 'generic' },
              },
              flows: [
                ...(k.bffs === 0 ? [] : [{ from: 'web', to: 'bff', tone: 'ok' }, { from: 'app', to: 'bff', tone: okW ? 'ok' : 'bad' }, { from: 'alexa', to: 'bff', tone: okA ? 'ok' : 'bad' }]),
                ...(k.bffs === 0 ? [] : [{ from: 'bff', to: 'restaurant', label: `fan-out ×6 (+${m.hopMs} ms hop)`, tone: okI ? 'ok' : 'slow', rate: 0.9 }]),
                ...(k.sharedLib && k.bffs ? [{ from: 'bff', to: 'lib', tone: 'ok', rate: 0.2 }] : []),
              ],
              readouts: [
                { label: 'App payload waste', value: m.waste + '%', tone: okW ? 'ok' : 'bad' },
                { label: 'Alexa format', value: okA ? 'sahi' : 'galat', tone: okA ? 'ok' : 'bad' },
                { label: 'Niyam drift bugs / quarter', value: String(m.drift), tone: okD ? 'ok' : 'bad' },
                { label: 'BFF instances (Diwali)', value: String(m.instances), tone: okI ? 'ok' : 'bad' },
                { label: 'Extra hop', value: m.hopMs + ' ms', tone: 'ok' },
              ],
              bars: [{ label: 'BFF instances', pct: Math.min(100, m.instances * 2.5), text: String(m.instances), tone: okI ? 'ok' : 'bad' }],
              verdict: k.bffs === 0
                ? { ok: false, text: 'Generic API: app 90% bekaar data, Alexa ko JSON. Clients sach mein alag hain — trigger poora.' }
                : k.bffs === 1
                  ? { ok: false, text: 'Ek BFF sab ke liye = generic API ek naye naam se. If-else ab BFF mein, Alexa format phir bhi uljha.' }
                  : !okD
                    ? { ok: false, text: `Teen BFFs, teen copies: har quarter ~${m.drift} drift bugs (Alexa ne ₹30 fee maangi). Niyam shared library mein.` }
                    : !okI
                      ? { ok: false, text: `Thread-per-call: fan-out ×6 par ${m.instances} instances. BFF ka kaam intezaar hai — async I/O stack.` }
                      : { ok: true, text: `3 BFFs + shared library + async: waste ${m.waste}%, drift 0, ${m.instances} instances, +${m.hopMs} ms hop.` },
            };
          },
          check: k => { const m = bffCostModel(k); return m.waste <= 10 && m.alexaOk && m.drift === 0 && m.instances <= 10; },
          lesson: '✅ <b>BFF ki keemat sambhali.</b> Per-client BFF ne clients ko sahi jawab diya, shared library ne duplication drift roka, aur async stack ne fan-out ko sasta rakha.',
          quiz: {
            q: 'Agar web aur app ki screens lagbhag same hoti aur Alexa na hota?',
            choices: [
              'BFF ka trigger kamzor — ek achha API (ya gateway composition) kaafi; BFF sirf ek aur component hota',
              'Phir bhi 3 BFFs',
              'Har screen ka BFF',
              'Core mein if-else',
            ],
            answer: 0,
            explain: 'Problem nahi toh pattern nahi.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — free delivery niyam ka drift',
          goal: 'Ek niyam badlaav teen BFFs tak kaise pahuncha (ya nahi) — aur fix.',
          nodes: [N('coupon', 150, 90, { id: 'pm', icon: '📋', label: 'product team' }), N('web', 520, 60, { label: 'web BFF' }), N('app', 520, 260, { label: 'mobile BFF' }), N('alexa', 520, 440, { label: 'voice BFF' }), N('coupon', 830, 310, { id: 'lib', icon: '📚', label: 'shared library' })],
          edges: [{ from: 'pm', to: 'web' }, { from: 'pm', to: 'app' }, { from: 'pm', to: 'alexa' }, { from: 'web', to: 'lib', dashed: true }, { from: 'app', to: 'lib', dashed: true }, { from: 'alexa', to: 'lib', dashed: true }],
          panels: [{ id: 'rule', title: 'Niyam kahan likha hai' }, { id: 'cart', title: '₹250 ka cart' }],
          steps: [
            {
              say: 'Pehle: teeno BFFs mein apni copy — <code>total > 299 ? free : ₹30</code>. Sab ek jaisa bolte hain kyunki copy ek jaisi hai.',
              flows: [],
              nodes: { web: { tone: 'ok', badge: '> 299' }, app: { tone: 'ok', badge: '> 299' }, alexa: { tone: 'ok', badge: '> 299' }, lib: { tone: 'idle', badge: 'use nahi' } },
              panels: { rule: ['web BFF: 299', 'mobile BFF: 299', 'voice BFF: 299'], cart: ['sab: ₹30 fee'] },
            },
            {
              say: 'Product team: "₹199 se upar free". Web team aur mobile team apne BFF update karti hain. Voice team us sprint chhutti par.',
              flows: [{ from: 'pm', to: 'web', label: '199', tone: 'ok' }, { from: 'pm', to: 'app', label: '199', tone: 'ok' }, { from: 'pm', to: 'alexa', label: '(ticket pending)', tone: 'slow' }],
              nodes: { web: { tone: 'ok', badge: '> 199' }, app: { tone: 'ok', badge: '> 199' }, alexa: { tone: 'bad', badge: '> 299 (purana)' } },
              panels: { rule: ['web BFF: 199', 'mobile BFF: 199', 'voice BFF: 299 ❌'], cart: ['web: free', 'app: free', 'Alexa: ₹30 ❌'] },
              ask: {
                q: 'Yeh bug kis cheez ka nateeja hai?',
                choices: ['Business niyam teen BFFs mein duplicate — badlaav ko teen jagah yaad rakhna', 'Voice team ki laparwahi, bas', 'Alexa ka bug', 'Pricing service down'],
                answer: 0,
                explain: 'Design ne bhoolne ki gunjaaish banayi.',
              },
            },
            {
              say: 'Fix: niyam <b>shared library</b> mein — <code>isFreeDelivery(total)</code>. Teeno BFFs isi ko call karte hain; wording apni ("Free delivery" / "delivery free hai").',
              flows: [{ from: 'web', to: 'lib', tone: 'ok' }, { from: 'app', to: 'lib', tone: 'ok' }, { from: 'alexa', to: 'lib', tone: 'ok' }],
              nodes: { lib: { tone: 'ok', badge: 'isFreeDelivery > 199' }, alexa: { tone: 'ok', badge: '"delivery free hai"' } },
              panels: { rule: ['shared library: 199 (ek jagah)', 'BFFs: sirf wording'], cart: ['sab: free ✅'] },
              ask: {
                q: 'Wording bhi library mein kyun nahi daali?',
                choices: ['Wording presentation hai — voice ko bolne wala, app ko chhota label; niyam shared, bhasha client ki', 'Library chhoti rakhni thi', 'Galti hai', 'Alexa library nahi padh sakta'],
                answer: 0,
                explain: 'Share logic, not presentation.',
              },
            },
            {
              say: 'Guard: CI mein <b>consistency test</b> — ₹150, ₹199, ₹250 ke cart teeno BFFs se, "free hai ya nahi" compare. Agla niyam badlaav drift ke saath merge hi nahi hoga.',
              flows: [{ from: 'pm', to: 'lib', label: 'niyam badlo → ek PR', tone: 'acc' }],
              nodes: { pm: { tone: 'ok', badge: 'ek PR' } },
              panels: { rule: ['CI: consistency test ✅'] },
            },
          ],
          lesson: '<b>Asli baat:</b> BFFs ki duplication asli hai. Niyam aur service clients share karo, presentation BFF mein rakho, aur consistency test se drift ko merge se pehle pakdo.',
        },
        {
          type: 'bins',
          title: 'BFF lagao ya nahi?',
          instructions: 'Har situation ko sahi dabbe mein daalo.',
          bins: [{ id: 'yes', label: '✅ BFF lagao' }, { id: 'no', label: '❌ Abhi nahi' }],
          items: [
            { text: 'Web 50 cheezein dikhata hai, app sirf 10', bin: 'yes', explain: 'UI bahut alag — trigger.' },
            { text: 'Purana bank partner XML maangta hai, baaki sab JSON', bin: 'yes', explain: 'Format alag — us client ka BFF.' },
            { text: 'Sirf ek React web app', bin: 'no', explain: 'Ek client — ek achha API.' },
            { text: 'Internal admin dashboard, 20 users', bin: 'no', explain: 'Ek aur component ki zaroorat nahi.' },
            { text: 'Alexa skill aur smartwatch app launch', bin: 'yes', explain: 'Bilkul alag format/screens.' },
            { text: 'Rider live location ka 5 ms latency path', bin: 'no', explain: 'Extra hop se bacho.' },
            { text: 'Web aur app ki screens lagbhag same, same fields', bin: 'no', explain: 'Trigger kamzor.' },
          ],
        },
        {
          type: 'quiz',
          title: 'BFF kab — quick check',
          questions: [
            {
              q: 'BFF ke do main triggers?',
              choices: ['Clients ki UI bahut alag; communication format alag', 'Team bada ho; cloud naya ho', 'Latency kam karni ho; DB badalna ho', 'Microservices hon; Kubernetes ho'],
              answer: 0,
              explain: 'Video ke do saaf triggers.',
            },
            {
              q: 'BFF stack chunne mein sabse zaroori?',
              choices: ['Concurrent I/O achha ho (fan-out intezaar sasta)', 'Sabse naya framework', 'Frontend jaisi language hi', 'Sabse kam memory wali language'],
              answer: 0,
              explain: 'BFF zyaadatar intezaar karta hai.',
            },
            {
              q: 'BFF duplication ka sahi ilaaj?',
              choices: ['Shared library/service niyam aur clients ke liye + consistency tests', 'Sab BFFs merge karke ek', 'Duplication ignore', 'Core mein if-else wapas'],
              answer: 0,
              explain: 'Ek BFF = generic API dobara.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — drift aur extra hop',
          project: '10-bff',
          exercise: 'ex3-bff-costs',
          goal: 'Apni-apni copy ke saath drift pakdo, extra hop naapo, phir shared library se drift khatam karo.',
          steps: [
            { text: 'Copy mode + consistency.', cmd: 'SHARED_LIB=0 npm start ex3-bff-costs\nnpm run consistency', expect: 'web    "Free delivery"\nmobile "Free delivery"\nvoice  "delivery ke 30 rupaye lagenge"\n❌ BFFs alag bol rahe hain (duplication drift)' },
            { text: 'Extra hop.', cmd: 'npm run hop', expect: 'seedha restaurant-service   p50 ~43 ms\nmobile BFF (2 calls + trim)  p50 ~55 ms' },
            { text: 'Ctrl+C. Shared library.', cmd: 'SHARED_LIB=1 npm start ex3-bff-costs\nnpm run consistency', expect: 'voice "delivery free hai" (shared lib)\n✅ teeno ek jaisa' },
          ],
          observe: {
            q: 'SHARED_LIB=1 par voice ne "Free delivery" nahi, "delivery free hai" kyun bola?',
            choices: [
              'lib/display.js sirf niyam (isFreeDelivery) share karta hai; wording har BFF ki apni — services/bff.js mein KIND=voice ki bhasha',
              'Bug hai',
              'Library mein do wording hain',
              'Alexa ne translate kiya',
            ],
            answer: 0,
            explain: 'Share logic, not presentation.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — BFF trade-offs',
        instructions: 'Final judgement sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "BFF ke nuksaan?"',
            choices: [
              'Fan-out network/resource heavy, code duplication BFFs mein, zyada components to deploy/monitor, extra hop latency; mitigations: async I/O stack, shared libraries, consistency tests, clear ownership',
              'Koi nuksaan nahi',
              'Sirf cost',
              'Security kam',
            ],
            answer: 0,
            explain: 'Nuksaan + ilaaj.',
          },
          {
            q: 'Interviewer: "Startup ke paas sirf web app hai. BFF lagaoge?"',
            choices: [
              'Nahi — ek well-designed API; jab mobile/voice aaye aur zaroorat alag ho tab BFF; API ko generic rakho taaki baad mein BFF lagana aasaan ho',
              'Haan, pehle din se',
              'Haan, har screen ka',
              'Nahi, kabhi nahi',
            ],
            answer: 0,
            explain: 'Trigger ka intezaar, taiyaari rakho.',
          },
          {
            q: 'Interviewer: "BFFs ke beech business consistency kaise ensure karoge?"',
            choices: [
              'Business rules services/shared libraries mein, BFF presentation only, contract/consistency tests CI mein, shared service clients',
              'Code review se',
              'Ek hi BFF',
              'Manual QA har release',
            ],
            answer: 0,
            explain: 'Design + automation.',
          },
        ],
      },
      success: [
        'Main BFF ki chaar keematein aur unke ilaaj bata sakta hoon',
        'Main BFF lagane ke do triggers pehchaan sakta hoon',
        'Main niyam aur presentation ko alag rakh kar duplication rok sakta hoon',
        'Main bata sakta hoon kab BFF nahi lagana',
      ],
      homework: '<p>Apne product ke clients ki list banao aur har client ke liye likho: UI kitni alag, format alag hai ya nahi, latency budget. Is list se faisla karo: BFF chahiye ya nahi. Agar BFFs hain, toh ek business niyam dhoondho jo ek se zyada BFF mein copy hai — use shared library mein le jaane ka plan likho.</p>',
      cards: [
        { front: 'BFF ke triggers?', back: 'Clients ki <b>UI bahut alag</b> ya <b>format alag</b> (Alexa, XML partner).' },
        { front: 'BFF ki keematein?', back: 'Fan-out heavy, <b>duplication</b>, zyada components, <b>extra hop</b>.' },
        { front: 'Duplication ka ilaaj?', back: '<b>Niyam + service clients shared library</b>; wording BFF mein; consistency tests.' },
        { front: 'BFF kab nahi?', back: 'Ek client, lagbhag same screens, admin tools, <b>ultra-low latency</b> paths.' },
      ],
    },
  ]);
})();
