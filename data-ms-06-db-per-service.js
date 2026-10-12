/* =====================================================================
   Video 6 — Database per Service
   Source concept: Arpit Bhayani — "Database per Service pattern" (youtube la2q1vFA5q0)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'la2q1vFA5q0', title: 'Database per Service pattern in Microservices' };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

  /* ---------------- models ---------------- */
  function searchModel(k) {
    const lakh = k.rows;
    const index = k.engine === 1;
    const p99 = index ? 18 + (k.typo ? 6 : 0) : Math.round(lakh * 9);
    const typoHits = index && k.typo ? 'mil gaye' : '0 results';
    const cpu = index ? 2 : Math.min(100, Math.round(lakh * 0.9));
    return { p99, typoHits, cpu, index };
  }
  function gainsModel(k) {
    const per = k.arch === 1;
    const revenue = per ? 97 : 0;
    const payP50 = per ? 26 : 160;
    const chatRate = per ? Math.round(27.7 * k.chatPool) : 369;
    const enc = k.enc === 2 && !per ? 1 : k.enc;              // shared DB mein "sirf payments" = poore DB par
    const menuMs = enc === 1 ? 26 : 18;
    const paymentsEncrypted = enc >= 1;
    const auditGb = enc === 0 ? 0 : enc === 1 ? 2000 : 10;
    return { per, revenue, payP50, chatRate, enc, menuMs, paymentsEncrypted, auditGb };
  }
  function txnModel(k) {
    const cap = [520, 500, 45][k.approach];
    const served = Math.min(k.load, cap);
    const mismatch = k.approach === 0 ? 30 : 0;
    const crashHit = k.crash ? (k.approach === 2 ? k.load * 8 : 1) : 0;
    return { cap, served, mismatch, crashHit };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-db-per-service'] = {
    t: 'Har service ka apna database — kaam ke hisaab se',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">💬</span><span class="nl">chat</span><span class="ns">Cassandra</span></div>
      <div class="dg-node is-accent"><span class="ni">🔐</span><span class="nl">auth</span><span class="ns">Postgres + replicas</span></div>
      <div class="dg-node is-accent"><span class="ni">👤</span><span class="nl">profile</span><span class="ns">MongoDB</span></div>
      <div class="dg-node is-accent"><span class="ni">🔍</span><span class="nl">search</span><span class="ns">Elasticsearch</span></div>
    </div>
    <div class="dg-flow" style="margin-top:8px">
      <div class="dg-node is-gold"><span class="ni">🕸️</span><span class="nl">"dosto ne order kiya"</span><span class="ns">Neo4j / Neptune</span></div>
      <div class="dg-node is-gold"><span class="ni">📍</span><span class="nl">rider location</span><span class="ns">Redis</span></div>
      <div class="dg-node is-gold"><span class="ni">📈</span><span class="nl">analytics</span><span class="ns">warehouse</span></div>
      <div class="dg-node is-gold"><span class="ni">🖼️</span><span class="nl">menu photos</span><span class="ns">S3 + metadata DB</span></div>
    </div>
    <div class="dg-cap">Doosri service ko data chahiye? Owner ki API se — DB ko seedha kabhi nahi.</div>`,
  };
  VISUALS['ms-db-per-service-gains'] = {
    t: 'Apne DB ke 5 faayde',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-good"><span class="bx-label">1. Loose coupling — DB badlo, API same</span></div>
      <div class="dg-box is-good"><span class="bx-label">2. Kaam ke hisaab se DB — graph, search, time-series</span></div>
      <div class="dg-box is-good"><span class="bx-label">3. Alag scaling — chat partition, payments vertical</span></div>
      <div class="dg-box is-good"><span class="bx-label">4. Failure isolation — profile DB gira, payments chalu</span></div>
      <div class="dg-box is-good"><span class="bx-label">5. Alag compliance — sirf 10 GB payments encrypt</span></div>
    </div>`,
  };
  VISUALS['ms-db-per-service-cost'] = {
    t: 'Apne DB ki 3 keematein',
    html: `
    <div class="dg-stack">
      <div class="dg-box is-bad"><span class="bx-label">1. Services ke paar transaction — 2PC dheema, saga mein undo khud likho</span></div>
      <div class="dg-box is-bad"><span class="bx-label">2. Updates doosri services tak — events, thodi der purana data</span></div>
      <div class="dg-box is-bad"><span class="bx-label">3. Kai DB technologies chalana — SRE skills, on-call, upgrades</span></div>
    </div>
    <div class="dg-cap">Hybrid theek hai: jahan zaroorat ho wahan alag, baaki ek jaane-pehchaane DB mein.</div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Har service ka apna DB
       ================================================================= */
    {
      id: 'ms-db-per-service',
      icon: '🗄️',
      title: 'Har Service ka Apna Database — Kaam ke Hisaab se Chuno',
      badge: 'DB Darzi',
      source: Object.assign({ at: 30 }, SRC),
      hook: {
        when: 'KhanaKart · ek bada Postgres',
        title: '2 TB ka "khanakart-main" — aur har team ki alag shikaayat',
        text: 'KhanaKart ka sab kuch ek Postgres mein hai. Rider-customer chat raat 9 baje 40,000 messages/second likhti hai. Search "panner tikka" (typo) par kuch nahi dikhata kyunki query <code>LIKE \'%panner%\'</code> hai. Analytics team subah 11 baje 50 tables ka join chalati hai aur checkout dheema ho jaata hai. Menu photos bhi DB mein blob bankar pade hain, isliye backup 9 ghante leta hai. Ek hi database se chaar alag kaam karwaaye ja rahe hain.',
      },
      objectives: [
        '<b>Database per service</b>: har service ka apna DB, baaki sirf owner ki API se',
        'Faayda: har service apna DB <b>kaam ke hisaab se</b> chune',
        'KhanaKart ke 8 kaam aur unke liye sahi DB type',
        'Search aur graph jaise specialised kaam SQL par kyun mehenge padte hain',
      ],
      steps: [
        {
          q: 'Database per service ka matlab kya hai?',
          body: 'Har microservice ka <b>apna, alag database</b>. Profile ka data sirf profile-service padhti-likhti hai. Recommendation-service ko profile chahiye toh profile-service ki <b>API</b> call kare — profile DB ko seedha kabhi nahi.',
          points: [
            'Services <b>loosely coupled</b> — DB andar kya hai, bahar kisi ko nahi pata.',
            'Har team apni service <b>akele</b> build, test, deploy aur scale kare.',
            'Har team apne kaam ke hisaab se <b>DB technology</b> chune.',
          ],
        },
        {
          q: 'KhanaKart mein kaunse kaam ke liye kaunsa DB?',
          body: '<table><tr><th>Kaam</th><th>Kya chahiye</th><th>DB type</th></tr>' +
            '<tr><td>Rider-customer chat</td><td>Bahut zyada writes, "is chat ke messages" jaisi seedhi reads</td><td>Partitioned NoSQL (Cassandra)</td></tr>' +
            '<tr><td>Login / auth</td><td>Chhota, pakka data</td><td>Relational + read replicas (Postgres)</td></tr>' +
            '<tr><td>User profile, preferences</td><td>Har user ke alag fields</td><td>Document DB (MongoDB)</td></tr>' +
            '<tr><td>Dish / restaurant search</td><td>Typo, ranking, "paneer" se "Paneer Tikka"</td><td>Search engine (Elasticsearch)</td></tr>' +
            '<tr><td>"Aapke dosto ne yahan order kiya"</td><td>Dost ke dost ke dost</td><td>Graph DB (Neo4j, Neptune)</td></tr>' +
            '<tr><td>Rider live location</td><td>Har 3 second update, "2 km mein riders"</td><td>In-memory + geo (Redis)</td></tr>' +
            '<tr><td>Business analytics</td><td>50-60 tables ke join</td><td>Data warehouse (Redshift, BigQuery)</td></tr>' +
            '<tr><td>Menu photos</td><td>Badi files</td><td>Blob storage (S3) + metadata DB mein</td></tr></table>',
        },
        {
          q: 'Search ke liye SQL LIKE kyun nahi?',
          analogy: 'Kitaab mein "paneer" dhoondhna ho toh do tareeke: har page padho (LIKE), ya peeche ka <b>index</b> dekho jahan likha hai "paneer — page 12, 48, 90" (Elasticsearch).',
          body: '<code>LIKE \'%paneer%\'</code> har row padhta hai — 50 lakh dishes = 50 lakh rows har search par. Typo ("panner") par kuch nahi milta. Search engine pehle se <b>word → dishes</b> ka index banata hai, typo sambhalta hai, aur ranking deta hai.',
        },
        {
          q: 'Friends-of-friends ke liye graph DB kyun?',
          body: 'SQL mein har degree ek JOIN hai. Dost (40) → dost ke dost (1,600 rows) → teesri degree (64,000 rows) → chauthi (25 lakh rows) — aur dost-circles milte-julte hain, isliye bahut rows duplicate. Graph DB har insaan se seedha uske dosto par jaata hai aur har insaan ko ek hi baar dekhta hai.',
          asli: 'Specialised DB tab lo jab kaam ki shape relational se sach mein alag ho. "Naya hai" wajah nahi hai.',
        },
        {
          q: 'Kya har service ko alag technology chahiye?',
          body: 'Nahi. "Apna DB" ka matlab "apna data aur apni ownership" hai. 10 services ke 10 alag Postgres databases (ya ek Postgres server par alag schemas + alag users) bhi database per service hai. Alag technology sirf wahan jahan kaam maange.',
        },
      ],
      myth: [
        { myth: 'Database per service matlab har service ke liye naya database server aur nayi technology.', sach: 'Asli niyam ownership hai: doosri service ka data sirf API se. Ek hi Postgres cluster par alag databases/schemas aur alag users se bhi shuruaat ho sakti hai.' },
        { myth: 'Elasticsearch ko main database bana do, sab kuch wahi se.', sach: 'Search engine search ke liye hai. Order aur payment jaise pakke data ka source of truth transactional DB rahe; search index usse copy hota hai.' },
      ],
      playbook: {
        title: 'database per service',
        use: [
          'Services alag teams ki hain aur alag raftaar se badalti hain',
          'Kaam ki shape alag hai (search, graph, bahut writes, analytics)',
          'Ek service ka load/incident doosri ko nahi chhoona chahiye',
        ],
        avoid: [
          'Har service ke liye naya DB technology bina zaroorat',
          'Doosri service ke DB ko seedha padhna "bas ek query ke liye"',
          'Badi files (videos, photos) transactional DB mein',
          'Analytics joins production DB par',
        ],
        how: [
          'Har table ka owner service likho',
          'Cross-service reads API (ya events se copy) se',
          'Kaam ki shape dekho: writes/sec, query type, consistency, size',
          'Default: jaana-pehchaana relational DB; specialised sirf saaf zaroorat par',
          'Photos/videos blob storage mein, DB mein sirf URL + metadata',
        ],
        redflags: [
          'Search typo par khaali',
          '"Report chalti hai toh checkout dheema"',
          'Backup ghanton lambe kyunki blobs DB mein',
          'Ek service doosre ke tables join kar rahi hai',
        ],
        rule: 'Data ka ek maalik, baaki API se — aur DB kaam ki shape se chuno, fashion se nahi.',
      },
      stages: [
        {
          type: 'design',
          title: '🏗️ Design canvas — KhanaKart ke 5 kaam, 5 databases',
          instructions: 'Har kaam ke liye database chuno. Review mein har option ka "kyun" khulega.',
          brief: 'KhanaKart "khanakart-main" Postgres ko tod raha hai. 2 crore orders/month, raat 9 baje peak.',
          requirements: ['Chat raat 9 baje 40,000 writes/second', 'Search typo sambhale', 'Analytics checkout ko dheema na kare'],
          slots: [
            {
              id: 'chat', label: 'Rider-customer chat', icon: '💬',
              options: [
                { id: 'cassandra', label: 'Partitioned NoSQL (Cassandra / DynamoDB), key = chatId', score: 3, why: 'Writes partitions mein bant-ti hain; "is chat ke messages" seedhi query.' },
                { id: 'pg', label: 'Main Postgres ki ek badi table', score: -2, why: 'Ek primary par 40k writes/s — checkout ke saath ladai.' },
                { id: 'es', label: 'Elasticsearch', score: -1, why: 'Search engine source of truth ke liye nahi; heavy writes par mehenga.' },
              ],
            },
            {
              id: 'search', label: 'Dish aur restaurant search', icon: '🔍',
              options: [
                { id: 'es', label: 'Elasticsearch / OpenSearch (menu DB se events ke through sync)', score: 3, why: 'Inverted index, typo, ranking.' },
                { id: 'like', label: "Postgres LIKE '%q%'", score: -2, why: 'Har search = full scan, typo par khaali.' },
              ],
            },
            {
              id: 'social', label: '"Aapke dosto ne yahan order kiya"', icon: '🕸️',
              options: [
                { id: 'graph', label: 'Graph DB (Neo4j / Neptune)', score: 3, why: 'Degree-by-degree traversal, har insaan ek baar.' },
                { id: 'sql', label: 'Postgres self-joins', score: 0, why: '2 degree tak chal jaata hai; 3-4 degree par rows phat jaati hain. Shuruaat ke liye theek, badhne par dikkat.' },
              ],
            },
            {
              id: 'analytics', label: 'Business analytics (50 tables join)', icon: '📈',
              options: [
                { id: 'wh', label: 'Data warehouse (Redshift / BigQuery), raat ko ya stream se load', score: 3, why: 'Columnar, bade joins ke liye bana; production se alag.' },
                { id: 'replica', label: 'Postgres read replica', score: 1, why: 'Primary bachta hai, par 50-table joins replica par bhi ghanton chal sakte hain.' },
                { id: 'main', label: 'Main Postgres par', score: -3, why: 'Subah 11 baje checkout dheema.' },
              ],
            },
            {
              id: 'photos', label: 'Menu photos', icon: '🖼️',
              options: [
                { id: 's3', label: 'S3 / blob storage + CDN; DB mein sirf URL', score: 3, why: 'Sasta, tez, DB halka aur backup chhota.' },
                { id: 'blob', label: 'Postgres BYTEA column', score: -3, why: '2 TB DB, 9 ghante ka backup.' },
              ],
            },
          ],
          pass: 12,
          verdicts: {
            great: '🌟 Har kaam ko uske layak DB — aur har DB ka ek maalik.',
            ok: '👍 Kareeb — laal slots ka "kyun" padho.',
            bad: '😅 Ek hi DB se sab kaam karwaane ki aadat abhi gayi nahi.',
          },
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — search ka database',
          goal: '<b>50 lakh</b> dishes par search p99 <b>≤ 100 ms</b>, aur "panner tikka" (typo) par results <b>mil jaayein</b>.',
          scenario: 'LIKE har row padhta hai (≈ 9 ms har lakh rows). Search index word → dishes ka map rakhta hai.',
          knobs: [
            { id: 'rows', label: 'Dishes (lakh)', min: 1, max: 100, step: 1, value: 2 },
            { id: 'engine', label: 'Search kahan se', min: 0, max: 1, step: 1, value: 0, labels: { 0: "Postgres LIKE '%q%'", 1: 'Elasticsearch index' } },
            { id: 'typo', label: 'Typo tolerance (fuzzy)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
          ],
          nodes: [N('app', 110, 250), N('search', 400, 250), N('db', 720, 110, { id: 'pg', label: 'Postgres (menu)' }), N('es', 720, 400, { label: 'Elasticsearch' })],
          edges: [{ from: 'app', to: 'search' }, { from: 'search', to: 'pg', dashed: true }, { from: 'search', to: 'es', dashed: true }, { from: 'pg', to: 'es', dashed: true }],
          model: k => {
            const m = searchModel(k);
            const okP = m.p99 <= 100, okT = m.typoHits === 'mil gaye', okR = k.rows >= 50;
            return {
              nodes: {
                search: { tone: okP ? 'ok' : 'bad', badge: `p99 ${m.p99.toLocaleString('en-IN')} ms` },
                pg: { tone: m.index ? 'ok' : (m.cpu > 60 ? 'bad' : 'busy'), badge: m.index ? 'source of truth' : `CPU ${m.cpu}%` },
                es: { tone: m.index ? 'ok' : 'idle', badge: m.index ? `${k.rows} lakh indexed` : 'use nahi' },
                app: { tone: okT ? 'ok' : 'slow', badge: `"panner": ${m.typoHits}` },
              },
              flows: m.index
                ? [{ from: 'app', to: 'search', label: 'panner tikka', tone: 'acc' }, { from: 'search', to: 'es', label: 'index lookup', tone: 'ok' }, { from: 'pg', to: 'es', label: 'menu_updated events', tone: 'ok', rate: 0.2 }]
                : [{ from: 'app', to: 'search', label: 'panner tikka', tone: 'acc' }, { from: 'search', to: 'pg', label: `${k.rows} lakh rows scan`, tone: okP ? 'slow' : 'bad' }],
              readouts: [
                { label: 'Search p99', value: m.p99.toLocaleString('en-IN') + ' ms', tone: okP ? 'ok' : 'bad' },
                { label: '"panner tikka"', value: m.typoHits, tone: okT ? 'ok' : 'bad' },
                { label: 'Menu DB CPU (search ki wajah se)', value: m.cpu + '%', tone: m.cpu > 60 ? 'bad' : 'ok' },
              ],
              bars: [{ label: 'p99', pct: Math.min(100, m.p99 / 5), text: m.p99.toLocaleString('en-IN') + ' ms', tone: okP ? 'ok' : 'bad' }],
              verdict: !okR
                ? { ok: false, text: 'Aaj 2 lakh dishes hain, agle saal 50 lakh. Slider 50 ya upar le jao.' }
                : !m.index
                  ? { ok: false, text: `LIKE: har search ${k.rows} lakh rows padhta hai → ${m.p99.toLocaleString('en-IN')} ms, aur menu DB ka CPU ${m.cpu}%. Typo par kuch nahi.` }
                  : !okT
                    ? { ok: false, text: 'Index tez hai, par "panner" par abhi bhi khaali. Fuzzy on karo.' }
                    : { ok: true, text: `Elasticsearch: ${m.p99} ms, typo theek, menu DB azaad. Postgres source of truth, index events se sync.` },
            };
          },
          check: k => { const m = searchModel(k); return k.rows >= 50 && m.p99 <= 100 && m.typoHits === 'mil gaye'; },
          lesson: '✅ <b>Search ko uska DB mila.</b> Menu data ka maalik Postgres hi hai; search-service apna index rakhti hai aur menu_updated events se sync karti hai.',
          quiz: {
            q: 'Elasticsearch index mein naya dish kab dikhega?',
            choices: [
              'Menu DB mein save ke thodi der (seconds) baad, jab menu_updated event process ho — eventual consistency',
              'Usi millisecond',
              'Kabhi nahi',
              'Raat ke batch mein hamesha',
            ],
            answer: 0,
            explain: 'Alag DB = copy. Copy thodi der baad pahunchti hai — Level "Apne DB ki Keemat" mein yahi dard.',
          },
        },
        {
          type: 'match',
          title: 'Kaam → database type',
          pairs: [
            { left: 'Rider ki location har 3 second, "2 km mein riders"', right: 'Redis (in-memory + geo commands)', explain: 'Bahut tez updates, chhota data, geo queries.' },
            { left: 'Payment ledger — ek paisa bhi galat nahi', right: 'Relational DB (Postgres/MySQL) ACID transactions', explain: 'Consistency sabse pehle.' },
            { left: 'Har restaurant ke alag-alag attributes (Jain, halal, outdoor seating...)', right: 'Document DB (MongoDB)', explain: 'Flexible schema.' },
            { left: 'Pichhle 2 saal ke orders ka city-wise trend', right: 'Data warehouse (BigQuery/Redshift)', explain: 'Columnar, bade scans.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Apna DB — quick check',
          questions: [
            {
              q: 'Recommendation-service ko user ki veg/non-veg pasand chahiye. Sahi raasta?',
              choices: ['Profile-service ki API call (ya profile_updated events se apni copy)', 'Profile DB ka read-only user le lo', 'Profile table ko recommendation DB mein roz raat copy karo bina bataye', 'Profile team se SQL query maango'],
              answer: 0,
              explain: 'Owner ki API contract hai. DB internals kabhi nahi.',
            },
            {
              q: '2 GB ke restaurant promo videos kahan?',
              choices: ['Blob storage (S3) + CDN; DB mein sirf URL aur metadata', 'Postgres BYTEA', 'Redis', 'Elasticsearch'],
              answer: 0,
              explain: 'Transactional DB badi files ke liye nahi.',
            },
            {
              q: '10 services ke 10 databases ek hi Postgres cluster par (alag DB + alag user). Kya yeh database per service hai?',
              choices: ['Haan — ownership aur access alag hai; technology same ho sakti hai', 'Nahi, har service ka alag server chahiye', 'Nahi, alag technology chahiye', 'Sirf agar Kubernetes par ho'],
              answer: 0,
              explain: 'Pattern ownership ka hai. Cluster share karne se noisy-neighbour risk rehta hai — agle level mein.',
            },
            {
              q: '"Dost ke dost ke dost" query SQL par kyun mehengi hoti hai?',
              choices: ['Har degree ek JOIN, intermediate rows guna hoti hain aur dost-circles ki wajah se bahut duplicates', 'SQL graph data store nahi kar sakta', 'Index nahi lag sakta', 'SQL mein 3 JOIN allowed nahi'],
              answer: 0,
              explain: '40 → 1,600 → 64,000 → 25 lakh rows.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — LIKE vs index, JOIN vs graph',
          project: '06-db-per-service',
          exercise: 'ex1-right-db',
          goal: 'Wahi sawaal do "databases" se poochho aur rows padhi + ms dekho.',
          steps: [
            { text: 'Install karo, LIKE + SQL engine chalao.', cmd: 'cd arpitbhayaniclasses/docker-labs/06-db-per-service\nnpm install\nENGINE_SEARCH=like ENGINE_SOCIAL=sql npm start ex1-right-db' },
            { text: 'Search aur social query.', cmd: 'curl "localhost:4801/search?q=panner%20tikka"\ncurl "localhost:4802/friends-ordered?depth=4"', expect: '{"engine":"like","typoFix":null,"results":0,"rowsRead":200000,...}\n{"engine":"sql","depth":4,"rowsTouched":~2625640,"ms":~250}' },
            { text: 'Ctrl+C. Index + graph engine.', cmd: 'ENGINE_SEARCH=index ENGINE_SOCIAL=graph npm start ex1-right-db\ncurl "localhost:4801/search?q=panner%20tikka"\ncurl "localhost:4802/friends-ordered?depth=4"', expect: '{"engine":"index","typoFix":"panner→paneer","results":~900,"rowsRead":~26000,...}\n{"engine":"graph","depth":4,"rowsTouched":~396720,"ms":~30}' },
          ],
          observe: {
            q: 'Depth 4 par dono engines ka "orderedHere" same tha. Toh farak kya tha?',
            choices: [
              'Jawab same, kaam alag — JOIN wale tareeke ne ~6 guna zyada rows padhi aur ~9 guna time liya',
              'Graph engine galat jawab deta hai',
              'SQL engine tez tha',
              'Koi farak nahi',
            ],
            answer: 0,
            explain: 'services/social-service.js: sql branch duplicates ke saath har degree aage badhata hai; graph branch visited set se har user ek baar.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Database per service',
        instructions: 'Data ownership ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Database per service pattern aur uske fayde?"',
            choices: [
              'Har service apna data own karti hai, doosre sirf API/events se; loose coupling, independent deploy/scale, polyglot persistence (kaam ke hisaab se DB), failure isolation, scoped compliance',
              'Sab services ek DB share karti hain par alag tables',
              'Har service ka alag server',
              'Microservices ka sirf deployment pattern',
            ],
            answer: 0,
            explain: 'Ownership + unke faayde.',
          },
          {
            q: 'Interviewer: "Polyglot persistence kab galat decision hai?"',
            choices: [
              'Jab kaam ki shape relational mein theek baithti ho aur team ke paas naya DB chalane ki skills/on-call capacity na ho',
              'Kabhi nahi',
              'Jab data bada ho',
              'Jab services zyada hon',
            ],
            answer: 0,
            explain: 'Har nayi technology operational bojh hai.',
          },
          {
            q: 'Interviewer: "Search ke liye Elasticsearch le liya. Source of truth kaun?"',
            choices: [
              'Transactional DB (menu-service ka Postgres); Elasticsearch derived index, events/CDC se sync; index kabhi bhi dobara banaya ja sake',
              'Elasticsearch',
              'Dono barabar',
              'Client cache',
            ],
            answer: 0,
            explain: 'Derived stores rebuild ho sakne chahiye.',
          },
        ],
      },
      success: [
        'Main database per service ka niyam (ownership + API) samjha sakta hoon',
        'Main KhanaKart ke kaamon ke liye sahi DB type chun sakta hoon',
        'Main search aur graph kaam SQL par mehenge kyun hain, numbers se bata sakta hoon',
        'Main "alag DB ≠ alag technology" samajhta hoon',
      ],
      homework: '<p>Apne project ke 5 bade data kaam lo. Har kaam ke liye likho: writes/sec, query ki shape, consistency zaroorat, data size — aur sahi DB type. Kahin blobs DB mein ya analytics production DB par toh nahi?</p>',
      cards: [
        { front: 'Database per service?', back: 'Har service ka <b>apna DB</b>; doosre sirf <b>owner ki API/events</b> se.' },
        { front: 'Search ke liye LIKE kyun nahi?', back: 'Har row padhta hai, <b>typo par khaali</b>. Search engine = inverted index + fuzzy + ranking.' },
        { front: 'Graph DB kab?', back: 'Dost-ke-dost jaisi <b>multi-degree traversal</b> — SQL JOINs mein rows phat jaati hain.' },
        { front: 'Photos/videos kahan?', back: '<b>Blob storage (S3) + CDN</b>; DB mein sirf URL + metadata.' },
        { front: 'Alag DB = alag technology?', back: '<b>Nahi</b> — ownership alag. Technology sirf zaroorat par alag.' },
      ],
    },

    /* =================================================================
       LEVEL: Faayde
       ================================================================= */
    {
      id: 'ms-db-per-service-gains',
      icon: '🛡️',
      title: 'Apne DB ke Faayde — Scaling, Failure Isolation, Compliance',
      badge: 'Blast Radius Baba',
      source: Object.assign({ at: 330 }, SRC),
      hook: {
        when: 'KhanaKart · IPL final · 9:40 PM',
        title: 'Profile team ka migration, aur payments bhi band',
        text: 'IPL final ke dauraan profile team ek purana migration chala rahi thi. Migration ne shared "khanakart-main" DB ki disk bhar di. Database ruk gaya. Profile nahi khul raha tha — theek hai. Par checkout, payments, restaurant app, rider app — sab band, kyunki sab usi DB par the. 22 minute mein ₹1.4 crore ke orders gaye. Profile ka migration tha, payments ki galti nahi thi.',
      },
      objectives: [
        '<b>Granular scaling</b>: API servers elastic hain, databases nahi — har DB ki alag strategy',
        '<b>Failure isolation</b>: zyaadatar outages DNS ya DB se; apna DB = chhota blast radius',
        '<b>Noisy neighbour</b>: chat ka load payments ko dheema na kare',
        '<b>Alag compliance</b>: sirf payments ka 10 GB encrypt, poora 2 TB nahi',
      ],
      steps: [
        {
          q: 'Database scale karna mushkil kyun hai?',
          body: 'API servers <b>stateless</b> hain — load balancer ke peeche 4 se 40 kar do, autoscaling. Database mein <b>data</b> hai: naya server = data copy, replication, partitioning. Database elastic nahi hai.',
          points: [
            'Chat DB: bahut writes → <b>partitioning</b> (chatId se shards).',
            'Payments DB: ACID, ek consistent view → aksar <b>vertical scaling</b> (bada machine) + read replicas.',
            'Menu DB: reads zyada → <b>read replicas + cache</b>.',
          ],
          asli: 'Apna DB = har service apni scaling strategy chune aur kharcha apne hisaab se rakhe.',
        },
        {
          q: 'Failure isolation kaise milti hai?',
          body: 'Bade outages ke do sabse aam kaaran: <b>DNS</b> aur <b>database</b>. Shared DB gira = poori site giri. Apne DB ke saath: profile DB gira → profile-service aur jo services profile ko <b>sync</b> call karti hain woh prabhavit. Payments apne DB par — paise aate rahe.',
          example: 'Checkout ko address chahiye (profile se)? Checkout mein pichhla address cache karke rakho — profile DB down ho toh bhi 97% orders chalte rahein.',
        },
        {
          q: 'Noisy neighbour kya hai?',
          analogy: 'Hostel mein ek hi geyser — ek ladka 40 minute naha raha hai, baaki sab thande paani mein. Har kamre ka apna geyser ho toh kisi ki lambi shower doosre ko nahi chhooti.',
          body: 'IPL par chat writes shared DB ke saare connections le leti hain. Payments line mein lagte hain: p50 26 ms se 160 ms. Apne DB ke saath chat apne pool mein ladti hai, payments apne mein.',
          asli: 'Keemat: chat DB ab chhota hai — chat ko alag se size karna padega (pool, partitions).',
        },
        {
          q: 'Compliance alag kyun?',
          body: 'Payment aur PII data ko <b>encryption at rest</b>, audit logs, access controls chahiye (PCI DSS, RBI guidelines). Encryption har read/write par thoda CPU aur latency jodta hai.',
          points: [
            'Shared 2 TB DB → encryption aur audit <b>poore</b> DB par; menu reads bhi dheeme, audit scope bada.',
            'Apna DB → sirf <b>10 GB payments DB</b> encrypt; menu aur chat tez.',
          ],
        },
      ],
      myth: [
        { myth: 'Apne DB ka matlab koi bhi incident doosri service ko nahi chhoo sakta.', sach: 'Jo services profile ko sync call karti hain, profile DB down par woh bhi prabhavit. Isolation ke liye fallback/cache bhi chahiye.' },
        { myth: 'DB alag kiye, toh scaling apne aap aa gayi.', sach: 'Ab har DB ko alag size, monitor aur scale karna hai. Chat DB chhota pada toh chat hi dheema.' },
      ],
      playbook: {
        title: 'apne DB ke faayde lena',
        use: [
          'Revenue path (payments, orders) ko baaki load se bachana hai',
          'Kisi service ka load pattern bilkul alag hai (chat writes, analytics scans)',
          'Kuch data par kadak compliance hai',
        ],
        avoid: [
          'Alag DB bana ke sync dependency bina fallback ke chhod dena',
          'Sab DBs ek jaisi size aur scaling policy',
          'Encryption/audit poore data par jab zaroorat sirf ek hisse ki',
        ],
        how: [
          'Revenue path ke DBs pehle alag karo',
          'Har DB ki scaling strategy likho: replicas, partitions, vertical',
          'Sync dependencies par cache/fallback (pichhla address)',
          'Compliance data ko ek chhote DB mein ikattha karo, wahi encrypt + audit',
        ],
        redflags: [
          'Ek team ka migration/report sabki latency badhata hai',
          'Poore DB ka audit scope har saal badh raha hai',
          'Ek DB outage = poori site down',
        ],
        rule: 'Paise wale raaste ka DB alag rakho — baaki ki galti ka bill payments na bharein.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — IPL final ki raat',
          goal: 'Profile DB gire toh revenue <b>≥ 95%</b>. Chat flood mein payment p50 <b>≤ 40 ms</b> aur chat <b>≥ 350 msg/s</b>. Payments <b>encrypted</b>, par menu reads <b>≤ 25 ms</b>.',
          scenario: 'Shared DB ka pool 15 connections. Per-service mein payments aur profile ke 5-5, chat ka pool aap chuno. Encryption har read/write par ~8 ms jodta hai.',
          knobs: [
            { id: 'arch', label: 'Architecture', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'ek shared DB', 1: 'har service ka apna DB' } },
            { id: 'chatPool', label: 'Chat DB pool (per-service)', min: 5, max: 20, step: 5, value: 5 },
            { id: 'enc', label: 'Encryption at rest', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'kahin nahi', 1: 'poore data par', 2: 'sirf payments DB' } },
          ],
          nodes: [N('profile', 170, 70), N('notification', 170, 210, { id: 'chat', icon: '💬', label: 'chat' }), N('restaurant', 480, 330, { id: 'menu', icon: '📋', label: 'menu' }), N('payment', 170, 450), N('db', 820, 70, { id: 'db1', label: 'profile DB' }), N('db', 820, 210, { id: 'db2', label: 'chat DB' }), N('db', 820, 450, { id: 'db3', label: 'payments DB' })],
          edges: [{ from: 'profile', to: 'db1' }, { from: 'chat', to: 'db2' }, { from: 'payment', to: 'db3' }],
          model: k => {
            const m = gainsModel(k);
            const okRev = m.revenue >= 95, okPay = m.payP50 <= 40, okChat = m.chatRate >= 350, okEnc = m.paymentsEncrypted, okMenu = m.menuMs <= 25;
            return {
              nodes: {
                db1: { tone: 'bad', badge: m.per ? '💥 disk full (sirf profile)' : '💥 SHARED DB disk full' },
                db2: { tone: m.per ? (okChat ? 'ok' : 'slow') : 'bad', badge: m.per ? `pool ${k.chatPool} · ${m.chatRate} msg/s` : 'shared (wahi DB)' },
                db3: { tone: m.per ? 'ok' : 'bad', badge: m.per ? (okEnc ? '🔒 encrypted' : 'unencrypted') : 'shared (wahi DB)' },
                payment: { tone: okRev && okPay ? 'ok' : 'bad', badge: `p50 ${m.payP50} ms · revenue ${m.revenue}%` },
                menu: { tone: okMenu ? 'ok' : 'slow', badge: `reads ${m.menuMs} ms` },
                profile: { tone: 'bad', badge: 'down' },
                chat: { tone: okChat ? 'ok' : 'slow', badge: `${m.chatRate} msg/s` },
              },
              flows: [
                { from: 'profile', to: 'db1', tone: 'bad', rate: 0.2 },
                { from: 'chat', to: 'db2', label: 'IPL flood', tone: okChat ? 'acc' : 'slow', rate: 1 },
                { from: 'payment', to: 'db3', tone: m.per ? 'ok' : 'bad', rate: 0.6 },
              ],
              readouts: [
                { label: 'Revenue jab profile DB gire', value: m.revenue + '%', tone: okRev ? 'ok' : 'bad' },
                { label: 'Payment p50 (chat flood)', value: m.payP50 + ' ms', tone: okPay ? 'ok' : 'bad' },
                { label: 'Chat throughput', value: m.chatRate + ' msg/s', tone: okChat ? 'ok' : 'bad' },
                { label: 'Payments encrypted', value: okEnc ? 'haan' : 'nahi', tone: okEnc ? 'ok' : 'bad' },
                { label: 'Menu read', value: m.menuMs + ' ms', tone: okMenu ? 'ok' : 'bad' },
                { label: 'Audit scope', value: m.auditGb ? m.auditGb.toLocaleString('en-IN') + ' GB' : '—', tone: m.auditGb > 100 ? 'warn' : 'ok' },
              ],
              bars: [
                { label: '22 min ka revenue', pct: m.revenue, text: inr(14000000 * m.revenue / 100), tone: okRev ? 'ok' : 'bad' },
              ],
              verdict: !m.per
                ? { ok: false, text: `Shared DB: profile ka disk full = sab band (${inr(14000000)} gaye). Chat flood mein payments ${m.payP50} ms.${k.enc === 2 ? ' Aur shared DB mein encryption poore DB par lagta hai — menu bhi dheema.' : ''}` }
                : !okChat
                  ? { ok: false, text: `Payments bache, par chat DB pool ${k.chatPool} par sirf ${m.chatRate} msg/s. Chat ko alag se scale karo.` }
                  : !okEnc
                    ? { ok: false, text: 'Payments DB unencrypted — PCI audit fail.' }
                    : !okMenu
                      ? { ok: false, text: `Poore data par encryption: menu reads ${m.menuMs} ms aur audit scope ${m.auditGb.toLocaleString('en-IN')} GB. Sirf payments encrypt karo.` }
                      : { ok: true, text: `Profile gira, payments ${m.revenue}% chale. Chat apne ${k.chatPool}-pool DB par ${m.chatRate} msg/s. Sirf 10 GB encrypted, menu ${m.menuMs} ms.` },
            };
          },
          check: k => { const m = gainsModel(k); return m.revenue >= 95 && m.payP50 <= 40 && m.chatRate >= 350 && m.paymentsEncrypted && m.menuMs <= 25; },
          lesson: '✅ <b>Chaar faayde ek saath.</b> Failure isolation (profile gira, payments chale), noisy neighbour se bachaav, chat ki alag scaling, aur sirf payments par compliance.',
          quiz: {
            q: 'Revenue 100% nahi, 97% kyun?',
            choices: [
              'Checkout jin users ka address profile se sync maangta hai aur cache mein nahi, unke orders fail — sync dependency abhi bhi hai',
              'Payments DB bhi thoda gira',
              'Encryption ki wajah se',
              'Chat ki wajah se',
            ],
            answer: 0,
            explain: 'Apna DB blast radius chhota karta hai, zero nahi. Sync dependencies par fallback chahiye.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — 9:40 PM, do duniya',
          goal: 'Wahi incident (profile migration se disk full) — pehle shared DB par, phir apne DB par. Har step par dekho kaun prabhavit hai.',
          nodes: [N('app', 125, 260), N('profile', 400, 80), N('order', 400, 260, { label: 'checkout' }), N('payment', 400, 440), N('db', 800, 80, { id: 'dbA', label: 'shared / profile DB' }), N('db', 800, 260, { id: 'dbB', label: 'orders DB' }), N('db', 800, 440, { id: 'dbC', label: 'payments DB' })],
          edges: [{ from: 'app', to: 'profile' }, { from: 'app', to: 'order' }, { from: 'order', to: 'payment' }, { from: 'profile', to: 'dbA' }, { from: 'order', to: 'dbB' }, { from: 'payment', to: 'dbC' }],
          panels: [{ id: 'world', title: 'Duniya' }, { id: 'money', title: 'Orders / minute' }],
          steps: [
            {
              say: '<b>Duniya 1 — shared DB.</b> orders DB aur payments DB asal mein usi "khanakart-main" ke tables hain. Profile team ka migration chal raha hai, disk 97%.',
              flows: [{ from: 'profile', to: 'dbA', label: 'migration: ALTER TABLE...', tone: 'slow' }],
              nodes: { dbA: { tone: 'slow', badge: 'disk 97% (shared)' }, dbB: { tone: 'idle', badge: '= khanakart-main' }, dbC: { tone: 'idle', badge: '= khanakart-main' } },
              panels: { world: ['Shared DB'], money: ['6,400 / min'] },
            },
            {
              say: 'Disk 100%. Database writes band. Checkout order save nahi kar paata, payment ledger nahi likh paata. Login bhi (session table) atka.',
              flows: [{ from: 'order', to: 'dbB', label: 'INSERT fail', tone: 'bad' }, { from: 'payment', to: 'dbC', label: 'INSERT fail', tone: 'bad' }],
              nodes: { dbA: { tone: 'bad', badge: '💥 disk full' }, dbB: { tone: 'bad', badge: 'wahi DB' }, dbC: { tone: 'bad', badge: 'wahi DB' }, order: { tone: 'bad' }, payment: { tone: 'bad' }, profile: { tone: 'bad' } },
              panels: { money: ['0 / min', '22 min × ₹6.4 lakh/min ≈ ₹1.4 crore'] },
              ask: {
                q: 'Payments team ki koi galti nahi thi. Phir payments kyun giri?',
                choices: ['Payments ka data usi DB mein tha jiski disk profile migration ne bhari — shared DB = shared kismat', 'Payment gateway down tha', 'Network issue', 'Payments team ne deploy kiya'],
                answer: 0,
                explain: 'Blast radius = jo bhi us DB par hai.',
              },
            },
            {
              say: '<b>Duniya 2 — apna DB.</b> Profile DB, orders DB, payments DB alag-alag. Wahi migration, wahi disk full — par sirf <b>profile DB</b> ki.',
              flows: [{ from: 'profile', to: 'dbA', label: 'disk full', tone: 'bad' }, { from: 'order', to: 'dbB', tone: 'ok' }, { from: 'payment', to: 'dbC', tone: 'ok' }],
              nodes: { dbA: { tone: 'bad', badge: '💥 profile DB' }, dbB: { tone: 'ok', badge: 'orders DB ✅' }, dbC: { tone: 'ok', badge: 'payments DB ✅' }, profile: { tone: 'bad', badge: 'down' }, order: { tone: 'ok' }, payment: { tone: 'ok' } },
              panels: { world: ['Apna DB'], money: ['? / min'] },
            },
            {
              say: 'Checkout address ke liye profile ko sync call karta hai. Profile down → checkout apna <b>pichhla address cache</b> use karta hai. 3% users (naya address, cache nahi) ko "address dobara daalein" dikhta hai.',
              flows: [{ from: 'order', to: 'profile', label: 'address? → fail → cache', tone: 'slow' }, { from: 'order', to: 'payment', label: 'pay ✅', tone: 'ok' }],
              nodes: { order: { tone: 'ok', badge: 'cached address' } },
              panels: { money: ['6,200 / min (97%)'] },
              ask: {
                q: 'Agar checkout mein address ka cache/fallback na hota?',
                choices: ['Checkout bhi profile ke saath gir jaata — alag DB ka faayda sync dependency ne kha liya', 'Kuch farak nahi', 'Payments gir jaate', 'Orders DB gir jaata'],
                answer: 0,
                explain: 'Isolation data layer par + call layer par (fallback) dono chahiye.',
              },
            },
            {
              say: 'Profile team disk badhati hai, 25 minute mein profile wapas. Is dauraan KhanaKart ne ~₹1.36 crore ke orders liye.',
              flows: [{ from: 'profile', to: 'dbA', tone: 'ok' }],
              nodes: { dbA: { tone: 'ok', badge: 'wapas' }, profile: { tone: 'ok', badge: 'wapas' } },
              panels: { money: ['Duniya 1: ₹0', 'Duniya 2: ~₹1.36 crore'] },
            },
          ],
          lesson: '<b>Asli baat:</b> apna DB incident ka blast radius us service tak seemit karta hai — agar callers ke paas fallback ho.',
        },
        {
          type: 'bins',
          title: 'Kaunsa faayda?',
          instructions: 'Har KhanaKart situation ko us faayde mein daalo jo usse bachata hai.',
          bins: [{ id: 'iso', label: '🛡️ Failure / noisy neighbour isolation' }, { id: 'scale', label: '📈 Alag scaling' }, { id: 'comp', label: '🔒 Alag compliance' }],
          items: [
            { text: 'Analytics ki report se checkout dheema nahi hona chahiye', bin: 'iso', explain: 'Load ek DB ka, asar doosre par nahi.' },
            { text: 'Chat ko 20 shards chahiye, payments ko ek bada machine', bin: 'scale', explain: 'Har DB ki apni strategy.' },
            { text: 'Card tokens ka DB PCI audit mein, menu DB nahi', bin: 'comp', explain: 'Audit scope chhota.' },
            { text: 'Review DB ka upgrade fail hua, orders chalte rahe', bin: 'iso', explain: 'Blast radius.' },
            { text: 'Menu reads ke liye 5 read replicas, auth ke liye 1', bin: 'scale', explain: 'Kharcha kaam ke hisaab se.' },
            { text: 'User KYC documents ka DB encrypted + 7 saal retention', bin: 'comp', explain: 'Sirf us data par kadak niyam.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Faayde — quick check',
          questions: [
            {
              q: 'API servers ko autoscale karna aasaan, database ko mushkil kyun?',
              choices: ['API servers stateless; database mein data hai jise copy/replicate/partition karna padta hai', 'Databases mehenge hain', 'Load balancer DB ke aage nahi lagta', 'Database multi-thread nahi hote'],
              answer: 0,
              explain: 'State hi scaling ko mushkil banata hai.',
            },
            {
              q: 'Payments DB ko aksar vertical scale kyun karte hain?',
              choices: ['ACID aur ek consistent view chahiye — sharding se transactions mushkil', 'Vertical hamesha sasta hai', 'Payments data chhota hai isliye', 'Replicas allowed nahi'],
              answer: 0,
              explain: 'Consistency zaroorat scaling strategy tay karti hai.',
            },
            {
              q: 'Shared DB par "sirf payments tables encrypt" karne mein dikkat?',
              choices: ['Aksar encryption, backups aur audit poore DB/instance par lagte hain — scope aur latency sab par', 'Koi dikkat nahi', 'Payments tables encrypt nahi ho sakti', 'Menu data gayab ho jaata'],
              answer: 0,
              explain: 'Compliance scope DB boundary ke saath chalta hai.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — shared DB vs apna DB',
          project: '06-db-per-service',
          exercise: 'ex2-isolation',
          goal: 'Chat flood aur DB crash — dono architecture mein payments par asar naapo.',
          steps: [
            { text: 'Shared DB ke saath chalao aur flood.', cmd: 'DB_MODE=shared npm start ex2-isolation\nnpm run flood 60', expect: 'Flood se pehle      — payment p50 ~26 ms\nChat flood (60 log) — payment p50 ~160 ms' },
            { text: 'Shared DB crash karo aur payment karo.', cmd: 'curl -X POST localhost:5500/admin/crash\ncurl -X POST localhost:4813/pay', expect: '{"ok":false,"service":"payment-service","error":"database: HTTP 503"}' },
            { text: 'Ctrl+C. Apne DB ke saath dohraao.', cmd: 'DB_MODE=per-service npm start ex2-isolation\nnpm run flood 60\ncurl -X POST localhost:5501/admin/crash\ncurl localhost:4811/profile/42\ncurl -X POST localhost:4813/pay', expect: 'Chat flood — payment p50 ~26 ms, chat kam msg/s\nprofile: 503\npay: {"ok":true,"db":"payment-db",...}' },
          ],
          observe: {
            q: 'Per-service mode mein chat ne flood ke dauraan kam messages kyun bheje?',
            choices: [
              'Chat DB ka pool ab sirf 5 hai (shared mein 15 sabke liye tha) — alag DB ko alag size karna padta hai',
              'Chat service mein bug',
              'Payments ne chat ko roka',
              'Flood tool ne kam bheja',
            ],
            answer: 0,
            explain: 'start.js: per-service mein db("chat-db", 5502, 5). Isolation mila, par sizing ki zimmedari bhi mili.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Isolation aur scaling',
        instructions: 'SRE + architecture sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Ek service ka DB gira toh baaki services kaise bachengi?"',
            choices: [
              'Alag DB se data-layer isolation; callers mein timeouts, circuit breakers, cache/fallback; critical flows ko non-critical sync dependencies se hatao',
              'Sirf alag DB kaafi hai',
              'DB kabhi nahi girta',
              'Sab services ek hi DB mein rakho taaki ek saath recover',
            ],
            answer: 0,
            explain: 'Data isolation + call isolation.',
          },
          {
            q: 'Interviewer: "Noisy neighbour problem kya hai?"',
            choices: [
              'Shared resource (DB, cluster) par ek workload saare connections/CPU/IO le leta hai aur doosre workloads dheeme ho jaate hain; alag resources, quotas ya pools se bachaav',
              'Pados ki service ke logs zyada hain',
              'Network latency',
              'Do teams ka jhagda',
            ],
            answer: 0,
            explain: 'IPL chat vs payments.',
          },
          {
            q: 'Interviewer: "PCI scope kaise chhota karoge?"',
            choices: [
              'Card data ek dedicated payments service + DB (ya tokenization provider) mein; baaki services sirf tokens dekhein; encryption, audit, access sirf us scope par',
              'Poore platform ko PCI mein daal do',
              'Card data logs mein bhi rakho',
              'Encryption band',
            ],
            answer: 0,
            explain: 'Scope boundary = service + DB boundary.',
          },
        ],
      },
      success: [
        'Main samjha sakta hoon databases elastic kyun nahi aur har DB ki scaling strategy kaise alag hoti hai',
        'Main failure isolation aur noisy neighbour ko numbers se dikha sakta hoon',
        'Main bata sakta hoon ki alag DB ke baad bhi sync dependencies par fallback kyun chahiye',
        'Main compliance scope chhota karne ka tareeka bata sakta hoon',
      ],
      homework: '<p>Apne system ke pichhle 3 incidents lo. Har incident mein: kaunsa DB/resource shared tha, kitni services prabhavit hui, aur apne DB + fallback ke saath kitni hoti? Revenue path ka ek DB chuno jise sabse pehle alag karoge.</p>',
      cards: [
        { front: 'DB elastic kyun nahi?', back: 'Data hai — replicate/partition karna padta hai. API servers <b>stateless</b>, aasaan autoscale.' },
        { front: 'Failure isolation ki shart?', back: 'Alag DB <b>+</b> callers mein timeout/breaker/<b>fallback</b>.' },
        { front: 'Noisy neighbour?', back: 'Ek workload shared resource kha jaaye → doosre dheeme. Apna DB/pool se bachaav.' },
        { front: 'Compliance faayda?', back: 'Sirf sensitive DB (10 GB) encrypt + audit; baaki tez aur scope chhota.' },
      ],
    },

    /* =================================================================
       LEVEL: Keemat
       ================================================================= */
    {
      id: 'ms-db-per-service-cost',
      icon: '💸',
      title: 'Apne DB ki Keemat — Distributed Transactions, Propagation, Ops',
      badge: 'Saga Sipahi',
      source: Object.assign({ at: 828 }, SRC),
      hook: {
        when: 'KhanaKart · Instamart · subah 7 baje',
        title: 'Doodh ke 50 packet, 57 orders — aur 3 SREs ke paas 7 databases',
        text: 'Instamart ne inventory aur delivery ke databases alag kiye. Pehle ek transaction mein "stock kam karo + rider assign karo" hota tha. Ab do alag databases hain. Subah 7 baje doodh ke 50 packets par 57 orders confirm ho gaye, aur 5 packets "reserved" pade rahe jinka koi order hi nahi tha. Upar se platform team ke 3 SREs ab Postgres, MongoDB, Cassandra, Redis, Elasticsearch, Neo4j aur BigQuery sambhaal rahe hain — aur raat 3 baje Cassandra alert ka matlab kisi ko nahi pata.',
      },
      objectives: [
        'Keemat 1: <b>services ke paar transaction</b> — 2PC dheema aur fragile, saga mein undo khud likho',
        'Keemat 2: <b>updates doosri services tak pahunchana</b> — events aur eventual consistency',
        'Keemat 3: <b>kai DB technologies chalana</b> — skills, on-call, upgrades',
        'Hybrid approach: jahan zaroori wahan alag, baaki jaana-pehchaana',
      ],
      steps: [
        {
          q: 'Services ke paar transaction kyun mushkil hai?',
          body: 'Ek DB mein: <code>BEGIN; stock--; rider assign; COMMIT;</code> — dono ya koi nahi, DB guarantee deta hai. Alag DBs mein koi ek <code>BEGIN</code> dono ko nahi dhakta.',
          points: [
            '<b>Two-phase commit (2PC)</b>: coordinator dono se "prepare" (lock pakdo, yes/no), dono yes → "commit". Sahi hai, par locks rider dhoondhne tak pakde rehte hain → throughput kaafi gir jaata hai. Coordinator prepare ke baad crash = locks atke.',
            '<b>Saga</b>: har step apna local commit. Aage fail → pichhle steps ka <b>compensation</b> (doodh wapas stock mein). Tez, par beech mein thodi der data "aadha" dikhta hai aur undo khud likhna padta hai.',
          ],
          asli: 'Pehla sawaal: kya yeh kaam sach mein "dono ya koi nahi" hai? Aksar reservation + compensation kaafi hai.',
        },
        {
          q: 'Updates doosri services tak kaise pahunchte hain?',
          analogy: 'Society ka notice board: secretary ne water timing badli aur notice lagaya. Har ghar notice apne time par padhta hai — tab tak kuch log purani timing maan ke chal rahe hote hain.',
          body: 'Restaurant ne "Paneer Tikka" ₹240 se ₹260 kiya. Menu DB update. Search-service ka apna index hai — use <b>menu_updated</b> event se pata chalta hai (Kafka/SQS). Event pahunchne tak search ₹240 dikhata hai. Yeh <b>eventual consistency</b> hai — delay kitna hoga, pakka nahi.',
          example: 'Bachaav: checkout par price hamesha menu-service (source of truth) se lo, aur badla ho toh "price update hua" dikhao.',
        },
        {
          q: 'Kai databases chalana kyun mehenga hai?',
          points: [
            'Har DB ki apni <b>query language</b>, tuning, backup, upgrade.',
            '<b>Observability</b>: har DB ke metrics, alerts, dashboards.',
            '<b>Bina downtime scale</b> karna har DB mein alag tareeke se.',
            '<b>Incident</b>: raat 3 baje Cassandra compaction ya Elasticsearch shard red — kaun jaanta hai?',
          ],
          asli: 'Engineering leaders naye DB se isliye hichkichaate hain — technology nahi, <b>chalane</b> ka bojh. Managed services (RDS, DynamoDB, Elastic Cloud) bojh ghatati hain, khatam nahi karti.',
        },
        {
          q: 'Toh kya karein — sab alag ya sab ek?',
          body: 'Hybrid theek hai. KhanaKart ka practical plan: zyaadatar services Postgres (alag databases, alag users). Search ke liye managed Elasticsearch. Chat ke liye DynamoDB. Analytics BigQuery. Graph feature abhi Postgres 2-degree query se — 4-degree zaroorat aaye tab graph DB.',
        },
      ],
      myth: [
        { myth: 'Microservices mein data consistency ke liye 2PC hi sahi tareeka hai.', sach: '2PC sahi hai par locks aur coordinator crash ki wajah se high-throughput flows mein mehenga. Zyaadatar product flows saga + reservation + idempotency se chalte hain.' },
        { myth: 'Eventual consistency matlab data galat.', sach: 'Data thodi der baad sahi hota hai. Galti tab hoti hai jab paise/stock jaisa faisla purani copy se liya jaaye — faisla hamesha source of truth se.' },
      ],
      playbook: {
        title: 'apne DB ki keemat sambhalna',
        use: [
          'Saga + compensation jab steps alag services mein hon',
          'Reservation with expiry (doodh 10 minute ke liye hold)',
          'Events (outbox pattern) se doosri services ki copies update',
          'Managed DB services jab team chhoti ho',
        ],
        avoid: [
          'High-throughput flow mein 2PC bina naape',
          'Purani copy (search index) se paisa/stock ka faisla',
          'Naya DB technology bina on-call aur runbook ke',
        ],
        how: [
          'Har cross-service kaam: "dono ya koi nahi" sach mein chahiye? Undo kya hai?',
          'Saga steps + compensations likho, har step idempotent',
          'Events DB write ke saath outbox table se publish (event khoye nahi)',
          'Har copy ka max delay SLA + lag alert',
          'DB estate list: har DB ka owner, on-call, runbook, backup test',
        ],
        redflags: [
          'Stock/paisa ke numbers services ke beech match nahi karte',
          '"Search mein price alag, checkout mein alag" complaints bina "price updated" UX',
          'Koi DB jiska koi owner ya runbook nahi',
        ],
        rule: 'Alag DB ka bill teen jagah aata hai — transactions, copies, aur on-call. Bill dekh ke hi alag karo.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Instamart subah 7 baje',
          goal: 'Rush <b>≥ 60 orders/sec</b>: sab serve ho, stock mismatch <b>0</b>, aur coordinator/order-service crash ho toh <b>≤ 1 order</b> prabhavit.',
          scenario: 'Doodh (inventory DB) aur rider (delivery DB) — dono ya koi nahi. Rider search 3% fail. 2PC mein doodh ki row ka lock rider milne tak pakda rehta hai; lock timeout 8 second.',
          knobs: [
            { id: 'approach', label: 'Tareeka', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'naive (koi undo nahi)', 1: 'saga (compensation)', 2: 'two-phase commit' } },
            { id: 'load', label: 'Orders/sec', min: 10, max: 100, step: 10, value: 20 },
            { id: 'crash', label: 'Order-service beech mein crash', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi', 1: 'haan' } },
          ],
          nodes: [N('order', 170, 260), N('inventory', 520, 110), N('delivery', 520, 420), N('db', 860, 110, { id: 'invdb', label: 'inventory DB' }), N('db', 860, 420, { id: 'deldb', label: 'delivery DB' })],
          edges: [{ from: 'order', to: 'inventory' }, { from: 'order', to: 'delivery' }, { from: 'inventory', to: 'invdb' }, { from: 'delivery', to: 'deldb' }],
          model: k => {
            const m = txnModel(k);
            const okServe = m.served >= k.load && k.load >= 60, okMis = m.mismatch === 0, okCrash = m.crashHit <= 1;
            const name = ['naive', 'saga', '2PC'][k.approach];
            return {
              nodes: {
                order: { tone: okServe ? 'ok' : 'bad', badge: `${m.served}/${k.load} per sec` },
                invdb: { tone: okMis ? 'ok' : 'bad', badge: k.approach === 2 ? (k.crash ? '🔒 lock atka' : '🔒 row lock') : (okMis ? 'stock sahi' : `${m.mismatch}/1000 atke`) },
                inventory: { tone: k.approach === 2 && k.crash ? 'bad' : 'ok', badge: k.approach === 1 ? 'reserve / release' : k.approach === 2 ? 'prepare / commit' : 'reserve' },
                delivery: { tone: 'ok', badge: '3% fail' },
              },
              flows: [
                { from: 'order', to: 'inventory', label: k.approach === 2 ? 'prepare' : 'reserve', tone: 'acc' },
                { from: 'order', to: 'delivery', label: k.approach === 2 ? 'prepare' : 'assign', tone: 'acc' },
                k.approach === 1 ? { from: 'order', to: 'inventory', label: 'release (fail par)', tone: 'slow', offset: 22 } : null,
              ].filter(Boolean),
              readouts: [
                { label: 'Capacity', value: m.cap + '/sec', tone: m.cap >= k.load ? 'ok' : 'bad' },
                { label: 'Stock mismatch / 1000', value: String(m.mismatch), tone: okMis ? 'ok' : 'bad' },
                { label: 'Crash par prabhavit orders', value: k.crash ? m.crashHit.toLocaleString('en-IN') : '—', tone: okCrash ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'Served', pct: Math.min(100, m.served / k.load * 100), text: `${m.served}/${k.load}`, tone: okServe ? 'ok' : 'bad' }],
              verdict: k.load < 60
                ? { ok: false, text: 'Subah 7 baje ka rush 60/sec hai — slider 60 ya upar.' }
                : !okMis
                  ? { ok: false, text: `${name}: rider fail hone par doodh reserve hi reh jaata hai — har 1000 mein ${m.mismatch} packet atke.` }
                  : !okServe
                    ? { ok: false, text: `${name}: sahi, par locks ki wajah se sirf ${m.cap}/sec. ${k.load - m.served} orders/sec line mein.` }
                    : !k.crash
                      ? { ok: false, text: `${name} theek chal raha hai. Ab crash on karke dekho — beech mein order-service mar jaaye toh?` }
                      : !okCrash
                        ? { ok: false, text: `Crash: lock 8 s atka → ~${m.crashHit.toLocaleString('en-IN')} orders fail.` }
                        : { ok: true, text: `Saga: ${m.served}/sec, stock sahi, crash par sirf 1 order aadha — saga log se restart par retry/compensate.` },
            };
          },
          check: k => { const m = txnModel(k); return k.load >= 60 && k.crash === 1 && m.served >= k.load && m.mismatch === 0 && m.crashHit <= 1; },
          lesson: '✅ <b>Saga jeeta.</b> Har step ka local commit, fail par compensation, aur crash par sirf ek order ka aadha kaam jo saga log se poora ya undo hota hai. 2PC sahi tha, par locks ne rush mein saath nahi diya.',
          quiz: {
            q: 'Saga mein beech ke 150 ms mein kya "galat" dikh sakta hai?',
            choices: [
              'Doodh stock se kam dikhega jabki order abhi pakka nahi — rider fail hua toh wapas aayega (thodi der ka aadha state)',
              'Kuch nahi',
              'Double payment',
              'Rider do orders le lega',
            ],
            answer: 0,
            explain: 'Saga isolation nahi deta. Reservation ko "hold" dikhana aur expiry rakhna UX ka hissa hai.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — saga: doodh aur rider',
          goal: 'Order IM-77 ke har step par dono DBs ka haal dekho — success aur failure dono.',
          nodes: [N('order', 170, 260, { label: 'order (saga)' }), N('inventory', 560, 100), N('delivery', 560, 420), N('db', 880, 100, { id: 'invdb', label: 'inventory DB' }), N('db', 880, 420, { id: 'deldb', label: 'delivery DB' })],
          edges: [{ from: 'order', to: 'inventory' }, { from: 'order', to: 'delivery' }, { from: 'inventory', to: 'invdb' }, { from: 'delivery', to: 'deldb' }],
          panels: [{ id: 'log', title: 'Saga log (order-service)' }, { id: 'stock', title: 'Doodh stock' }],
          steps: [
            {
              say: 'IM-77: order-service saga log mein likhti hai "IM-77 STARTED". Step 1: inventory ko "doodh reserve karo". Inventory apne DB mein local commit: stock 12 → 11, reservation IM-77 (10 minute expiry).',
              flows: [{ from: 'order', to: 'inventory', label: 'reserve IM-77', tone: 'acc' }, { from: 'inventory', to: 'invdb', label: 'COMMIT', tone: 'ok' }],
              nodes: { invdb: { tone: 'ok', badge: 'stock 11 · hold IM-77' } },
              panels: { log: ['IM-77 STARTED', 'step1 reserve ✅'], stock: ['12 → 11 (hold)'] },
            },
            {
              say: 'Step 2: delivery ko "rider do". Rider search 150 ms. Is dauraan kisi aur user ko doodh stock <b>11</b> dikhta hai — IM-77 abhi pakka nahi hua.',
              flows: [{ from: 'order', to: 'delivery', label: 'assign rider', tone: 'acc' }],
              nodes: { delivery: { tone: 'busy', badge: 'dhoondh raha hai' } },
              panels: { log: ['IM-77 STARTED', 'step1 reserve ✅', 'step2 rider ⏳'] },
              ask: {
                q: 'Is waqt stock 11 dikhna — galat hai?',
                choices: ['Ek hold hai; UX mein "12 mein se 1 kisi ki cart mein" jaisa chal sakta hai. Saga beech ka state chhupata nahi.', 'Haan, bug hai', 'Stock 12 dikhna chahiye', 'Order place ho chuka'],
                answer: 0,
                explain: 'Saga mein isolation nahi — design mein maan ke chalo.',
              },
            },
            {
              say: 'Rider mila. Delivery apne DB mein commit. Saga log: "IM-77 COMPLETED". Inventory ka hold "sold" ban jaata hai.',
              flows: [{ from: 'delivery', to: 'deldb', label: 'COMMIT rider Suresh', tone: 'ok' }, { from: 'order', to: 'inventory', label: 'confirm hold', tone: 'ok' }],
              nodes: { delivery: { tone: 'ok', badge: 'Suresh' }, deldb: { tone: 'ok', badge: 'rider busy' }, invdb: { tone: 'ok', badge: 'stock 11 · sold' } },
              panels: { log: ['IM-77 COMPLETED'], stock: ['11'] },
            },
            {
              say: 'Agla order IM-78: doodh reserve (11 → 10). Rider search <b>fail</b> — 2 km mein koi nahi. Saga ka compensation: inventory ko "release IM-78".',
              flows: [{ from: 'order', to: 'delivery', label: 'assign ❌', tone: 'bad' }, { from: 'order', to: 'inventory', label: 'release IM-78', tone: 'slow' }],
              nodes: { delivery: { tone: 'bad', badge: 'rider nahi' }, invdb: { tone: 'slow', badge: 'stock 10 → 11' } },
              panels: { log: ['IM-78 STARTED', 'step1 reserve ✅', 'step2 rider ❌', 'compensate: release'], stock: ['10 → 11 (wapas)'] },
              ask: {
                q: 'Release call bhi fail ho jaaye (inventory down) toh?',
                choices: ['Saga log mein "release pending" — retry karte raho (release idempotent), aur 10 minute expiry backup hai', 'Doodh hamesha ke liye gaya', 'User ko charge karo', 'Kuch nahi karo'],
                answer: 0,
                explain: 'Compensation bhi fail ho sakta hai: retry + idempotency + expiry.',
              },
            },
            {
              say: 'Order-service IM-79 ke beech crash hui (reserve ho gaya, rider call nahi hui). Restart par saga log padhti hai: "IM-79 step1 done, step2 pending" → rider step retry karti hai. Sirf IM-79 prabhavit — koi lock kisi ko nahi rok raha.',
              flows: [{ from: 'order', to: 'delivery', label: 'resume IM-79', tone: 'acc' }],
              nodes: { order: { tone: 'ok', badge: 'restart → resume' } },
              panels: { log: ['IM-79 step1 ✅', 'CRASH', 'restart: resume step2'] },
            },
          ],
          lesson: '<b>Asli baat:</b> saga = local commits + compensations + saga log. Tez aur crash-safe, par beech ka state dikhta hai aur undo aapki zimmedari hai.',
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — price badla, search ko kab pata chala?',
          goal: 'Menu DB se search index tak update ka safar, aur beech mein user kya dekhta hai.',
          nodes: [N('restaurant', 140, 50, { label: 'restaurant app' }), N('restaurant', 440, 50, { id: 'menu', icon: '📋', label: 'menu-service' }), N('broker', 780, 50), N('search', 780, 320), N('app', 140, 320), N('order', 440, 450, { label: 'checkout' })],
          edges: [{ from: 'restaurant', to: 'menu' }, { from: 'menu', to: 'broker' }, { from: 'broker', to: 'search' }, { from: 'app', to: 'search' }, { from: 'app', to: 'order' }, { from: 'order', to: 'menu' }],
          panels: [{ id: 'menu', title: 'Menu DB (source of truth)' }, { id: 'idx', title: 'Search index (copy)' }],
          steps: [
            {
              say: '7:00:00 — Sharma Dhaba ne Paneer Tikka ₹240 → ₹260 kiya. menu-service apne DB mein save karti hai aur <b>outbox</b> table mein "menu_updated" likhti hai — ek hi local transaction mein.',
              flows: [{ from: 'restaurant', to: 'menu', label: '₹260', tone: 'acc' }],
              nodes: { menu: { tone: 'ok', badge: 'saved + outbox' } },
              panels: { menu: ['Paneer Tikka ₹260'], idx: ['Paneer Tikka ₹240'] },
            },
            {
              say: '7:00:01 — Outbox publisher event broker par daalta hai. Search-service ke consumer ke aage 2 second ka backlog hai.',
              flows: [{ from: 'menu', to: 'broker', label: 'menu_updated', tone: 'acc' }],
              nodes: { broker: { tone: 'busy', badge: 'backlog 2 s' } },
              ask: {
                q: 'Outbox table kyun, seedha broker ko publish kyun nahi?',
                choices: ['DB save ho gaya aur publish se pehle crash hua toh event kho jaata — outbox DB transaction ke saath likha jaata hai, baad mein publish', 'Broker slow hai', 'Outbox tez hai', 'Koi wajah nahi'],
                answer: 0,
                explain: 'Dual write problem — outbox pattern.',
              },
            },
            {
              say: '7:00:02 — Priya search karti hai "paneer tikka". Search index abhi purana: <b>₹240</b>. Priya item cart mein daalti hai.',
              flows: [{ from: 'app', to: 'search', label: 'paneer tikka', tone: 'acc' }, { from: 'search', to: 'app', label: '₹240 (purana)', tone: 'slow', back: true }],
              nodes: { search: { tone: 'slow', badge: '₹240' }, app: { tone: 'slow', badge: 'cart ₹240?' } },
            },
            {
              say: '7:00:03 — Checkout price <b>menu-service (source of truth)</b> se leta hai: ₹260. App dikhata hai "Price update hua: ₹260". Priya ko galat charge nahi hota.',
              flows: [{ from: 'app', to: 'order', label: 'checkout', tone: 'acc' }, { from: 'order', to: 'menu', label: 'price?', tone: 'ok' }],
              nodes: { order: { tone: 'ok', badge: '₹260 · "price updated"' } },
              ask: {
                q: 'Checkout agar search index se price leta toh?',
                choices: ['Restaurant ko ₹20 kam milte ya dispute — paise ka faisla purani copy se', 'Kuch nahi', 'Search tez ho jaata', 'Price double'],
                answer: 0,
                explain: 'Copies dikhane ke liye, faisle source of truth se.',
              },
            },
            {
              say: '7:00:04 — Event process hua, search index ₹260. Delay ~4 second. Dashboard par "search index lag" metric aur 30 second par alert.',
              flows: [{ from: 'broker', to: 'search', label: 'menu_updated ✅', tone: 'ok' }],
              nodes: { search: { tone: 'ok', badge: '₹260' }, broker: { tone: 'ok', badge: 'lag 0' } },
              panels: { idx: ['Paneer Tikka ₹260'] },
            },
          ],
          lesson: '<b>Asli baat:</b> apna DB = doosri services ke paas copies. Copies events se thodi der baad sahi hoti hain. Paisa aur stock ke faisle source of truth se, aur lag par alert.',
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — 3 SREs, kitne databases?',
          instructions: 'KhanaKart platform team chhoti hai. Har zaroorat ke liye option chuno.',
          brief: 'Platform team: 3 SREs, 45 engineers. 2 crore orders/month. On-call rotation 3 logon ki.',
          requirements: ['Har DB ka owner, backup test aur runbook ho', 'Search typo sambhale', 'Chat raat 9 baje 40k writes/s'],
          slots: [
            {
              id: 'core', label: 'Orders, payments, menu, profile', icon: '🗄️',
              options: [
                { id: 'pg', label: 'Managed Postgres (RDS), har service ka alag database + user', score: 3, why: 'Ek technology, alag ownership. Team jaanti hai.' },
                { id: 'mix', label: 'Har team apni pasand: Mongo, MySQL, Cockroach, Postgres', score: -2, why: '4 technologies, 3 SREs — koi bhi gahraai se nahi jaanega.' },
              ],
            },
            {
              id: 'search', label: 'Search', icon: '🔍',
              options: [
                { id: 'managed', label: 'Managed Elasticsearch/OpenSearch', score: 3, why: 'Zaroorat saaf; managed se ops kam.' },
                { id: 'self', label: 'Self-hosted Elasticsearch on VMs', score: 0, why: 'Chalega, par shard rebalancing aur upgrades 3 SREs par bhaari.' },
                { id: 'pgfts', label: 'Postgres full-text search', score: 1, why: 'Chhote scale par achha shuruaati option; typo aur ranking seemit.' },
              ],
            },
            {
              id: 'chat', label: 'Chat', icon: '💬',
              options: [
                { id: 'dynamo', label: 'DynamoDB (managed, partition key chatId)', score: 3, why: 'Write scale bina cluster chalaye.' },
                { id: 'cass', label: 'Self-hosted Cassandra', score: -1, why: 'Sahi shape, par compaction, repairs, raat 3 baje alerts — team ke paas skill nahi.' },
              ],
            },
            {
              id: 'graph', label: '"Dosto ne yahan order kiya" (abhi 2-degree)', icon: '🕸️',
              options: [
                { id: 'pg2', label: 'Abhi Postgres 2-degree query; 4-degree zaroorat aaye tab graph DB', score: 3, why: 'Aaj ki zaroorat ke liye kaafi; ek naya DB bacha.' },
                { id: 'neo', label: 'Abhi se self-hosted Neo4j', score: -1, why: 'Ek chhote feature ke liye poora naya DB aur on-call.' },
              ],
            },
          ],
          pass: 10,
          verdicts: {
            great: '🌟 Hybrid: jahan zaroorat saaf wahan specialised (managed), baaki ek jaana-pehchaana DB.',
            ok: '👍 Theek — laal slots mein ops ka bojh dekho.',
            bad: '😅 3 SREs ke liye yeh DB estate raat ki neend kha jaayega.',
          },
        },
        {
          type: 'quiz',
          title: 'Keemat — quick check',
          questions: [
            {
              q: '2PC throughput kyun girata hai?',
              choices: ['Prepare se commit tak participants locks pakde rehte hain — doosre transactions line mein', '2PC mein network nahi hota', 'Commit do baar hota hai', 'Data double likha jaata hai'],
              answer: 0,
              explain: 'Lock ka samay = sabse dheeme participant ka samay.',
            },
            {
              q: 'Saga compensation ka example?',
              choices: ['Rider nahi mila → doodh ka reservation release', 'Order retry', 'DB backup', 'Cache clear'],
              answer: 0,
              explain: 'Pichhle local commit ka ulta kaam.',
            },
            {
              q: 'Outbox pattern kya problem solve karta hai?',
              choices: ['DB write aur event publish ek saath — crash par event na khoye', 'Search tez', 'Encryption', 'Load balancing'],
              answer: 0,
              explain: 'Dual write problem.',
            },
            {
              q: 'Naya DB technology lene se pehle sabse zaroori sawaal?',
              choices: ['Kaun chalayega — on-call, backups, upgrades, scaling ki skill aur samay hai?', 'Kya naya hai?', 'GitHub stars kitne?', 'Kya free hai?'],
              answer: 0,
              explain: 'Ops bojh sabse badi keemat.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — naive vs saga vs 2PC',
          project: '06-db-per-service',
          exercise: 'ex3-distributed-txn',
          goal: '20 orders ek saath — teeno tareeke. Stock sahi raha? Kitne orders/sec? Coordinator crash par kya hua?',
          steps: [
            { text: 'Naive.', cmd: 'MODE=naive RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn\nnpm run load 20', expect: 'placed 15, failed 5\ndoodh stock: 30 (hona chahiye 35) ❌ 5 packet atke/gayab' },
            { text: 'Ctrl+C. Saga.', cmd: 'MODE=saga RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn\nnpm run load 20', expect: '~70 orders/sec · doodh stock: 35 ✅ sahi' },
            { text: 'Ctrl+C. 2PC.', cmd: 'MODE=twopc RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn\nnpm run load 20', expect: '~5 orders/sec · doodh stock: 35 ✅ sahi' },
            { text: 'Ctrl+C. 2PC + coordinator crash.', cmd: 'MODE=twopc COORD_CRASH_ON=3 npm start ex3-distributed-txn\nnpm run load 20', expect: 'placed 2, failed 17, crashed 1 (lock wait timeout)\n🔒 inventory lock abhi bhi IM-3 ke paas\nek naya order ab: failed — ~4000 ms' },
          ],
          observe: {
            q: 'Coordinator crash ke baad 17 orders kyun fail hue jabki doodh stock mein tha?',
            choices: [
              'IM-3 ne doodh ki row ka lock prepare mein pakda aur commit/abort kabhi nahi aaya — baaki orders lock ka 4 s intezaar karke timeout',
              'Stock khatam tha',
              'Rider nahi mile',
              'Broker down tha',
            ],
            answer: 0,
            explain: 'services/participant.js: LOCK=1 par getLock() 4 s wait; lock TTL 8 s tak IM-3 ke paas. 2PC ki "blocking" problem.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Data consistency',
        instructions: 'Distributed data ke classic sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "2PC vs Saga?"',
            choices: [
              '2PC: atomic, locks prepare-commit tak, coordinator failure par blocking, throughput kam. Saga: local transactions + compensations, tez aur available, par isolation nahi aur undo logic likhna padta hai',
              'Dono same',
              'Saga atomic hai, 2PC nahi',
              '2PC sirf NoSQL mein',
            ],
            answer: 0,
            explain: 'Trade-off: consistency guarantee vs availability/throughput.',
          },
          {
            q: 'Interviewer: "Service A ka DB update aur event publish reliably kaise?"',
            choices: [
              'Transactional outbox (same DB transaction mein outbox row, alag publisher/CDC jaise Debezium), consumers idempotent',
              'Pehle publish phir DB',
              'Pehle DB phir publish, bas',
              'Distributed lock',
            ],
            answer: 0,
            explain: 'Outbox + idempotent consumers.',
          },
          {
            q: 'Interviewer: "Database per service ka sabse under-rated nuksaan?"',
            choices: [
              'Operational load — kai DB technologies ke backups, upgrades, monitoring, incident skills; isliye hybrid aur managed services',
              'Latency',
              'Security',
              'Koi nuksaan nahi',
            ],
            answer: 0,
            explain: 'Leaders isi se hichkichaate hain.',
          },
        ],
      },
      success: [
        'Main 2PC aur saga ka farak aur trade-off bata sakta hoon',
        'Main saga steps, compensations aur saga log design kar sakta hoon',
        'Main eventual consistency aur outbox pattern samjha sakta hoon',
        'Main team ke size ke hisaab se DB estate (hybrid, managed) chun sakta hoon',
      ],
      homework: '<p>Apne system ka ek cross-service kaam (jaise order + payment + stock) lo. Saga likho: steps, har step ka compensation, kya idempotent hai, aur crash par resume kaise hoga. Phir apne DB estate ki list banao: har DB ka owner, backup test ki last date, aur runbook hai ya nahi.</p>',
      cards: [
        { front: '2PC kaise kaam karta hai?', back: 'Coordinator: sabse <b>prepare</b> (lock + vote), sab yes → <b>commit</b>, warna abort. Locks aur coordinator crash = blocking.' },
        { front: 'Saga?', back: 'Har step <b>local commit</b>; aage fail → pichhle steps ka <b>compensation</b>. Saga log se crash-safe.' },
        { front: 'Outbox pattern?', back: 'DB write ke <b>same transaction</b> mein outbox row; publisher baad mein event bhejta hai.' },
        { front: 'Copies se faisla?', back: '<b>Nahi</b> — dikhane ke liye copy, paise/stock ka faisla source of truth se.' },
        { front: 'Apne DB ki 3 keematein?', back: 'Distributed transactions, <b>update propagation</b> (eventual), <b>kai DBs chalana</b>.' },
      ],
    },
  ]);
})();
