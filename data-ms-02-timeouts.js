/* =====================================================================
   Video 2 — Microservices mein timeouts ko safely handle karna
   Source concept: Arpit Bhayani — "How to safely and gracefully handle
   timeouts in a microservices" (youtube Hxja4crycBg)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'Hxja4crycBg', title: 'How to safely and gracefully handle timeouts in a microservices' };

  /* ---------------- models (lab aur validator dono yahi use karte hain) ---------------- */
  function timeoutModel(k) {
    const T = k.timeout, incident = k.mode === 1;
    const falseTimeoutPct = T >= 60 ? 50 * Math.exp(-(T - 60) / 26) : 100 - (T / 60) * 50;
    const waitMs = incident ? Math.min(8000, T) : Math.min(T, 75);
    const busy = Math.round(400 * (80 + waitMs) / 1000);
    const p99 = incident ? 80 + Math.min(8000, T) : 80 + Math.min(T, 180);
    const timeoutPct = incident ? (T < 8000 ? 100 : 0) : falseTimeoutPct;
    return { T, incident, falseTimeoutPct, waitMs, busy, p99, timeoutPct, pool: 200 };
  }
  function stormModel(k) {
    const cap = k.mode === 1 ? 60 : 100;
    const r = k.retries, backoff = k.backoff === 1, fallback = k.fallback === 1;
    let f = 0.02, load = 100;
    for (let it = 0; it < 60; it++) {
      const attempts = f >= 0.999 ? r + 1 : (1 - Math.pow(f, r + 1)) / (1 - f);
      load = 100 * (1 + (attempts - 1) * (backoff ? 0.35 : 1));
      const nf = load <= cap ? 0.02 : Math.min(0.97, 0.02 + (load - cap) / load);
      f = f * 0.5 + nf * 0.5;
    }
    const real = (1 - Math.pow(f, r + 1)) * 100;
    return { cap, load: Math.round(load), real, visible: fallback ? 100 : real };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-timeout-basics'] = {
    t: 'Timeout — apne threads ko doosri service ki susti se bachao',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">📱</span><span class="nl">app</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-good"><span class="ni">🔎</span><span class="nl">search</span><span class="ns">timeout 300 ms</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-bad"><span class="ni">📊</span><span class="nl">analytics</span><span class="ns">DB slow: 8 s</span></div>
    </div>
    <div class="dg-flow" style="margin-top:12px">
      <div class="dg-pill bad">bina timeout: har search 8 s, threads full</div>
      <div class="dg-pill good">300 ms timeout: results bina count ke, threads free</div>
    </div>
    <div class="dg-cap">Timeout ek khatarnak "pata nahi" ko ek saaf faisle mein badalta hai.</div>`,
  };
  VISUALS['ms-timeout-handling'] = {
    t: 'Timeout ke baad teen raaste',
    html: `
    <div class="dg-split">
      <div class="dg-col"><div class="dg-pill">🙈 Ignore</div><div class="dg-box is-gold"><span class="bx-label">analytics event — chalega</span></div><div class="dg-box is-bad"><span class="bx-label">"order confirmed" maan lena — khatarnak</span></div></div>
      <div class="dg-col"><div class="dg-pill good">🧩 Default value</div><div class="dg-box is-good"><span class="bx-label">"aaj X orders" badge chhupao</span></div><div class="dg-box is-good"><span class="bx-label">ETA: "~30 min"</span></div></div>
      <div class="dg-col"><div class="dg-pill acc">🔁 Retry</div><div class="dg-box is-good"><span class="bx-label">read / idempotent: backoff ke saath</span></div><div class="dg-box is-bad"><span class="bx-label">₹450 debit bina key: double charge</span></div></div>
    </div>`,
  };
  VISUALS['ms-retry-smart'] = {
    t: 'Retry sirf zaroorat par — aur behtar: dependency hi hata do',
    html: `
    <div class="dg-split">
      <div class="dg-col">
        <div class="dg-pill acc">🔍 Pehle check, phir retry</div>
        <div class="dg-flow"><div class="dg-node is-accent"><span class="ni">📱</span><span class="nl">double tap</span></div><div class="dg-arrow flow"></div><div class="dg-node is-good"><span class="ni">⚡</span><span class="nl">Redis</span><span class="ns">user42:cart-hash (60s)</span></div></div>
        <div class="dg-cap">Same order 60 second mein dobara aaya → purana order lautao.</div>
      </div>
      <div class="dg-col">
        <div class="dg-pill good">🏗️ Design badlo</div>
        <div class="dg-flow"><div class="dg-node is-good"><span class="ni">📊</span><span class="nl">analytics</span></div><div class="dg-arrow flow"></div><div class="dg-node is-good"><span class="ni">🔍</span><span class="nl">search index</span><span class="ns">counts har minute</span></div></div>
        <div class="dg-cap">Search ab analytics ko call hi nahi karti — timeout ka sawaal khatam.</div>
      </div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Timeout basics
       ================================================================= */
    {
      id: 'ms-timeout-basics',
      icon: '⏱️',
      title: 'Timeout — Kitna Intezaar Karein?',
      badge: 'Timeout Tapasvi',
      source: Object.assign({ at: 67 }, SRC),
      hook: {
        when: 'KhanaKart · IPL final · 9:40 PM',
        title: 'Analytics slow hui, aur search bhi saath doob gayi',
        text: 'KhanaKart search har restaurant ke saath ek chhota badge dikhata hai: "aaj 1,240 orders". Yeh number <b>analytics-service</b> deti hai. IPL final ke break mein analytics ka database 8 second ki queries dene laga. Search-service ne analytics ka intezaar karna shuru kiya — bina kisi time limit ke. 20 second mein search-service ke saare threads bhar gaye, aur KhanaKart par koi restaurant dhoondh hi nahi pa raha tha. Search ka apna code bilkul theek tha.',
      },
      objectives: [
        '<b>Synchronous dependency</b> kya hai aur caller doosri service ki susti kaise "pakad" leta hai',
        'Network call ke <b>teen failure cases</b> — aur caller unhe alag kyun nahi pehchaan sakta',
        '<b>Timeout</b> ka matlab aur <b>sahi value</b> kaise chunein (bahut chhota vs bahut lamba)',
        'Timeout ke baad kya dikhana hai — yeh faisla <b>pehle</b> kyun lena padta hai',
      ],
      steps: [
        {
          q: 'Synchronous dependency kya hoti hai?',
          body: 'Jab service A kaam poora karne ke liye service B ke jawab ka <b>intezaar</b> karti hai, toh A ki B par synchronous dependency hai.',
          example: 'User "biryani" search karta hai → search-service Elasticsearch se restaurants nikaalti hai → har restaurant ke "aaj ke orders" ke liye analytics-service ko call karti hai → jawab aane par hi user ko results bhejti hai.',
          asli: 'Synchronous dependency ka matlab: B slow = A slow. B ka problem A ka problem ban jaata hai — jab tak A khud ko bachaye nahi.',
        },
        {
          q: 'Network call mein kya-kya galat ho sakta hai?',
          points: [
            '<b>Request pahunchi hi nahi</b> — network congestion ya packet drop.',
            '<b>Request pahunchi, kaam hua, par jawab raaste mein kho gaya</b> — connection reset, load balancer ka issue.',
            '<b>Doosri service slow hai</b> — DB outage, bhari processing, ya servers overload.',
          ],
          asli: 'Caller ke liye teeno ek jaise dikhte hain: "jawab nahi aaya". Caller nahi jaanta ki kaam hua ya nahi. Yahi baat retry ko khatarnak banati hai (agla level).',
        },
        {
          q: 'Timeout kya hai?',
          analogy: 'Tumne dost ko Majestic bus stand par 6 baje bulaya. Dost nahi aaya. Tum raat bhar wahin nahi khade rahoge — 15 minute wait karoge, phir call karoge ya ghar chale jaoge. Woh 15 minute tumhara <b>timeout</b> hai.',
          body: 'Timeout = <b>zyada se zyada kitna intezaar</b>. Us time ke baad caller maan leta hai "jawab nahi aayega" aur apna plan B chalata hai. <b>Har network call par timeout hona chahiye</b> — HTTP, database, cache, message broker, sab par.',
        },
        {
          q: 'Timeout ki value kaise chunein?',
          body: '<table><tr><th>Timeout</th><th>Kya hota hai</th></tr>' +
            '<tr><td>Bahut chhota (analytics p99 180 ms, timeout 40 ms)</td><td>Healthy analytics bhi "fail" dikhti hai — <b>false alarms</b>, bina wajah degraded results</td></tr>' +
            '<tr><td>Bahut lamba (10 second)</td><td>Analytics slow hui toh search ke threads 10 second tak phanse — <b>search khud down</b></td></tr>' +
            '<tr><td>Theek (~200–400 ms)</td><td>Normal din mein lagbhag kabhi timeout nahi; incident mein threads jaldi free</td></tr></table>',
          asli: 'Shuruaati rule: timeout = <b>callee ka p99 + thoda margin</b>, aur <b>caller ke apne latency budget</b> ke andar. Search ko 500 ms mein jawab dena hai toh analytics ka intezaar 2 second nahi ho sakta.',
        },
        {
          q: 'Timeout ke baad kya karein — yeh pehle kyun sochna padta hai?',
          body: 'Timeout aane par caller ke paas do raaste hain: <b>partial jawab</b> (restaurants dikhao, "aaj ke orders" badge chhupa do) ya <b>error</b>. Yeh faisla product ka hai, code ka nahi. Search mein partial jawab behtar hai. Payment mein "pata nahi" ko "success" maan lena galat hai.',
          asli: 'Timeout lagana aadha kaam hai. Timeout ke baad ka behaviour likhna baaki aadha — agla level usi ka hai.',
        },
      ],
      myth: [
        { myth: 'Library ka default timeout theek hi hoga.', sach: 'Kai HTTP clients ka default timeout <b>infinite</b> ya bahut lamba hota hai (jaise kuch clients mein koi limit hi nahi). Har call par apni value khud set karo.' },
        { myth: 'Timeout jitna chhota, system utna tez.', sach: 'Bahut chhota timeout healthy service ko bhi fail dikhata hai aur retries ki bheed badhata hai. Value callee ke p99 se nikaalo.' },
      ],
      playbook: {
        title: 'timeouts',
        use: [
          'Har synchronous network call par — HTTP, gRPC, DB, Redis, broker publish',
          'Caller ke latency budget ke hisaab se: search 500 ms budget → analytics call ~300 ms',
          'Connect timeout aur read timeout dono alag set karo',
        ],
        avoid: [
          'Library ke default (aksar infinite) par bharosa',
          'Callee ke p99 se kam timeout (false alarms)',
          'Har service par same 30 second ka "safe" timeout',
        ],
        how: [
          'Callee ka p99 latency dashboard se dekho (normal din + peak)',
          'Timeout = p99 + margin, par caller ke budget se kam',
          'Timeout par kya hoga likho: partial response, default, ya error',
          'Timeout count ko metric banao — badhe toh alert',
        ],
        redflags: [
          'Ek slow service ke saath uske callers ke threads/connection pool bhi full',
          'Dashboard par "timeouts" 0 hain kyunki timeout set hi nahi',
          'Normal din mein bhi 1%+ timeouts (value bahut chhoti)',
        ],
        rule: 'Har network call ka timeout ho, aur timeout ke baad ka plan pehle se likha ho.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — IPL final par search ka dum ghutna',
          goal: 'Dekho bina timeout ke analytics ki susti search ke threads kaise kha jaati hai — aur 300 ms timeout kya bachata hai.',
          nodes: [
            N('app', 120, 250),
            N('search', 440, 250),
            N('es', 440, 440, { label: 'Elasticsearch' }),
            N('analytics', 800, 250),
            N('db', 800, 440, { id: 'adb', label: 'analytics DB' }),
          ],
          edges: [{ from: 'app', to: 'search' }, { from: 'search', to: 'es' }, { from: 'search', to: 'analytics' }, { from: 'analytics', to: 'adb' }],
          panels: [{ id: 'threads', title: 'search worker threads (200)' }, { id: 'user', title: 'User ki screen' }],
          steps: [
            {
              clock: '9:38 PM',
              say: 'Normal haalat. 400 searches per second. Har search: Elasticsearch ~30 ms + analytics ~60 ms. Poora jawab ~150 ms mein.',
              flows: [{ from: 'app', to: 'search', label: '400 req/s', tone: 'ok' }, { from: 'search', to: 'analytics', label: '60 ms', tone: 'ok' }],
              nodes: { search: { tone: 'ok', badge: 'p99 180 ms' }, analytics: { tone: 'ok' }, adb: { tone: 'ok' }, es: { tone: 'ok' } },
              panels: { threads: ['busy: ~60 / 200 ✅'], user: ['Meghana Foods · aaj 1,240 orders', 'Truffles · aaj 870 orders'] },
            },
            {
              clock: '9:40 PM',
              say: 'IPL break. Analytics DB par ek bhari report query lock le leti hai. Analytics ki har query ab <b>8 second</b> leti hai.',
              flows: [{ from: 'analytics', to: 'adb', label: '8 s query', tone: 'bad' }],
              nodes: { adb: { tone: 'bad', badge: 'locked · 8 s' }, analytics: { tone: 'slow', badge: 'jawab 8 s mein' } },
            },
            {
              clock: '9:40:01 PM',
              say: 'Search-service ka code analytics ko call karta hai <b>bina timeout</b>. Har search request 8 second tak ek thread pakad ke baithi hai. 400 naye searches har second aa rahe hain.',
              flows: [{ from: 'search', to: 'analytics', label: 'wait... wait...', tone: 'slow' }],
              nodes: { search: { tone: 'busy', badge: 'threads bhar rahe' } },
              panels: { threads: ['busy: 200 / 200 🔴', 'har request 8 s tak phansi'] },
              ask: {
                q: '400 requests/second aur har request 8 second phansi. Search ke 200 threads kitni der mein bhar jaayenge?',
                choices: ['Aadhe second mein (400/s × 0.5 s = 200)', '8 second mein', '1 minute mein', 'Kabhi nahi bharenge'],
                answer: 0,
                explain: 'Threads khali hone ki raftaar (8 s mein ek) bhare jaane ki raftaar (400/s) se bahut dheemi hai. Aadhe second mein pool full.',
              },
            },
            {
              clock: '9:40:20 PM',
              say: 'Pool full. Naye searches line mein lagte hain, phir fail hote hain. Jin restaurants ko analytics ki zaroorat bhi nahi thi, woh bhi nahi dikhte. <b>Search ka code theek tha — search phir bhi down hai.</b>',
              flows: [{ from: 'app', to: 'search', label: '❌ 504 / spinner', tone: 'bad' }],
              nodes: { search: { tone: 'bad', badge: 'down (analytics ki wajah se)' }, app: { tone: 'bad', badge: 'search nahi chal raha' } },
              panels: { user: ['⏳ ...loading', '❌ Kuch galat hua, dobara try karein'] },
              ask: {
                q: 'Is incident mein sabse bada nuksaan kya hua?',
                choices: [
                  'Healthy search-service doosri service ki susti mein phans kar khud down ho gayi',
                  'Analytics ka data delete ho gaya',
                  'Elasticsearch crash ho gaya',
                  'User ka phone hang ho gaya',
                ],
                answer: 0,
                explain: 'Bina timeout, caller callee ki bimaari pakad leta hai. Asli nuksaan: poora search down, sirf ek badge ki wajah se.',
              },
            },
            {
              clock: '9:45 PM (fix)',
              say: 'Fix deploy: analytics call par <b>300 ms timeout</b>. Timeout aaya toh "aaj X orders" badge chhupao, restaurants phir bhi dikhao. Ab har search max 80 + 300 ms thread pakadti hai.',
              flows: [{ from: 'search', to: 'analytics', label: 'max 300 ms', tone: 'slow' }, { from: 'app', to: 'search', label: 'results (badge ke bina)', tone: 'ok' }],
              nodes: { search: { tone: 'ok', badge: 'degraded par zinda' }, app: { tone: 'ok', badge: 'search chal raha' } },
              panels: { threads: ['busy: ~152 / 200 ✅', '400/s × 0.38 s = 152'], user: ['Meghana Foods', 'Truffles', '(order count badge chhupa)'] },
              ask: {
                q: '300 ms timeout ke saath search ke threads full kyun nahi hue?',
                choices: [
                  'Har request ab max ~380 ms thread pakadti hai: 400/s × 0.38 s = 152 threads, pool 200 se kam',
                  'Analytics apne aap tez ho gayi',
                  'Users ne search karna band kar diya',
                  'Threads badha ke 10,000 kar diye',
                ],
                answer: 0,
                explain: 'Timeout ne har request ke "intezaar" ki upar ki seema bandh di. Busy threads ≈ requests/second × har request ka time.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> timeout doosri service ko theek nahi karta — timeout <b>tumhe</b> bachata hai. Aur timeout ke baad kya dikhana hai (badge chhupao, results do) woh pehle se tay tha, isliye incident mein bhi user ko kaam ka jawab mila.',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — timeout ki sahi value dhoondho',
          goal: 'Ek hi timeout value dhoondho jo <b>dono</b> haalaton mein kaam kare: normal din mein false timeouts <b>1% se kam</b>, aur incident (analytics 8 s) mein search ke busy threads <b>200 se kam</b>. Incident mode on karke check karo.',
          scenario: 'search-service: 400 searches/second, 200 worker threads, apna kaam 80 ms. analytics-service normal din: p50 60 ms, p99 ~180 ms. Incident: har jawab 8 second.',
          knobs: [
            { id: 'timeout', label: 'Analytics call ka timeout', min: 50, max: 3000, step: 50, value: 3000, unit: ' ms' },
            { id: 'mode', label: 'Analytics ki haalat', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'normal din', 1: '🔥 incident (8 s)' } },
          ],
          nodes: [N('app', 120, 250), N('search', 440, 250), N('analytics', 820, 250), N('db', 820, 440, { id: 'adb', label: 'analytics DB' })],
          edges: [{ from: 'app', to: 'search' }, { from: 'search', to: 'analytics' }, { from: 'analytics', to: 'adb' }],
          model: k => {
            const m = timeoutModel(k);
            const sat = m.busy > m.pool;
            const falseOk = m.falseTimeoutPct < 1;
            const nodes = {
              search: { tone: sat ? 'bad' : 'ok', badge: `threads ${Math.min(m.busy, 999)} / 200` },
              analytics: { tone: m.incident ? 'bad' : 'ok', badge: m.incident ? 'jawab 8 s' : 'p99 180 ms' },
              adb: { tone: m.incident ? 'bad' : 'ok' },
              app: { tone: sat ? 'bad' : 'ok', badge: sat ? 'search down' : 'results aa rahe' },
            };
            return {
              nodes,
              flows: [
                { from: 'app', to: 'search', label: `p99 ${m.p99} ms`, tone: sat ? 'bad' : 'ok', rate: 0.8 },
                { from: 'search', to: 'analytics', label: `wait max ${m.T} ms`, tone: m.incident ? 'slow' : (falseOk ? 'ok' : 'slow'), rate: 0.6 },
              ],
              readouts: [
                { label: m.incident ? 'Timeouts (analytics sach mein slow)' : 'False timeouts (analytics theek hai)', value: m.timeoutPct.toFixed(m.timeoutPct < 1 ? 2 : 1) + '%', tone: m.incident ? 'warn' : (falseOk ? 'ok' : 'bad') },
                { label: 'Search busy threads', value: `${m.busy} / 200`, tone: sat ? 'bad' : 'ok' },
                { label: 'Search p99', value: m.p99 + ' ms', tone: m.p99 <= 500 ? 'ok' : m.p99 <= 1500 ? 'warn' : 'bad' },
              ],
              bars: [
                { label: 'Thread pool', pct: Math.min(100, m.busy / 2), text: `${m.busy} / 200`, tone: sat ? 'bad' : 'ok' },
                { label: 'Normal din ke false timeouts', pct: Math.min(100, m.falseTimeoutPct * 10), text: m.falseTimeoutPct.toFixed(2) + '%', tone: falseOk ? 'ok' : 'bad' },
              ],
              verdict: !m.incident
                ? { ok: falseOk, text: falseOk ? `Normal din theek (false timeouts ${m.falseTimeoutPct.toFixed(2)}%). Ab incident mode on karke dekho threads ka kya hota hai.` : `Timeout ${m.T} ms analytics ke p99 (180 ms) se kam ya bahut paas — healthy analytics bhi fail dikh rahi hai.` }
                : { ok: !sat && falseOk, text: sat ? `Incident mein har search ${m.waitMs} ms tak phansi — ${m.busy} threads chahiye, pool sirf 200. Search down.` : !falseOk ? `Incident mein search bach gayi, par normal din mein ${m.falseTimeoutPct.toFixed(1)}% false timeouts honge.` : `Timeout ${m.T} ms dono haalaton mein kaam karta hai.` },
            };
          },
          check: k => {
            const m = timeoutModel(k);
            const inc = timeoutModel({ timeout: k.timeout, mode: 1 });
            return k.mode === 1 && m.falseTimeoutPct < 1 && inc.busy <= 200;
          },
          lesson: '✅ <b>Timeout window mil gayi (~200–400 ms).</b> Neeche ki seema callee ka p99 decide karta hai (false alarms). Upar ki seema caller ka thread pool aur traffic decide karta hai (incident mein survive).',
          quiz: {
            q: 'Traffic 400 se 800 searches/second ho jaaye (IPL final). Timeout ki upar ki seema ka kya hoga?',
            choices: [
              'Aadhi ho jaayegi — 800/s × (0.08 + T) ≤ 200 matlab T ≤ ~170 ms, jo p99 se kam hai; timeout akele kaafi nahi, threads/fallback/async sochna padega',
              'Double ho jaayegi',
              'Koi farak nahi padega',
              'Timeout hata dena chahiye',
            ],
            answer: 0,
            explain: 'Busy threads = traffic × har request ka time. Traffic double = har request ka allowed time aadha. Isliye bade events se pehle capacity aur dependency dono dekhne padte hain.',
          },
        },
        {
          type: 'match',
          title: 'Kya toota? — failure case pehchaano',
          pairs: [
            { left: 'Search ne request bheji, ek network switch ne packet gira diya', right: 'Request doosri service tak pahunchi hi nahi', explain: 'Analytics ko pata bhi nahi ki koi request aayi thi.' },
            { left: 'Bank ne ₹450 kaat liye, par load balancer ne connection reset kar diya', right: 'Kaam ho gaya, jawab raaste mein kho gaya', explain: 'Sabse khatarnak case — caller ko lagta hai fail hua, par paisa kat chuka hai.' },
            { left: 'Analytics DB par lock, har query 8 second', right: 'Doosri service slow hai', explain: 'Request pahunchi, kaam bhi hoga — bas bahut der se.' },
            { left: 'Caller ko teeno cases mein kya dikhta hai?', right: 'Sirf "jawab nahi aaya" — farak pata nahi chalta', explain: 'Isliye timeout ke baad retry karna har request par safe nahi hota.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Timeouts — quick check',
          questions: [
            {
              q: 'Coupon-service ka p99 latency 120 ms hai. Order-service ke paas coupon ke liye 400 ms ka budget hai. Achha timeout?',
              choices: ['~200 ms', '50 ms', '5 second', 'Koi timeout nahi'],
              answer: 0,
              explain: 'p99 (120) se upar thoda margin, budget (400) se kaafi neeche. 50 ms = false alarms, 5 s = incident mein threads phanse.',
            },
            {
              q: 'Kaunsi call par timeout ki zaroorat NAHI hai?',
              choices: ['Aisi koi network call nahi — har call par timeout chahiye', 'Redis call', 'Database query', 'Message broker publish'],
              answer: 0,
              explain: 'Redis, DB, broker — sab network ke peeche hain aur sab slow ho sakte hain.',
            },
            {
              q: 'Normal din mein analytics call ke 3% timeouts ho rahe hain, analytics dashboard sab green. Sabse pehle kya shak karoge?',
              choices: ['Timeout value analytics ke p99 se kam hai — false alarms', 'Analytics mein chupa bug', 'Users bahut zyada hain', 'Network bilkul down hai'],
              answer: 0,
              explain: 'Callee healthy + caller par timeouts = timeout bahut chhota.',
            },
            {
              q: 'Timeout aane par search ko kya karna chahiye?',
              choices: ['Restaurants dikhao, "aaj ke orders" badge chhupao', 'Poore page par error dikhao', 'Analytics ko 10 baar turant dobara call karo', 'Request ko hamesha ke liye hold karo'],
              answer: 0,
              explain: 'Badge "nice to have" hai. Main kaam (restaurants dhoondhna) bachao — partial response.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — bina timeout vs 300 ms timeout',
          project: '02-timeouts',
          exercise: 'ex1-timeout',
          goal: 'Analytics ko 8 second slow karo. Pehle search bina timeout chalao, phir 300 ms timeout + fallback ke saath. Phir timeout bahut chhota karke false alarm dekho.',
          steps: [
            { text: 'Lab folder mein jao aur install karo.', cmd: 'cd arpitbhayaniclasses/docker-labs/02-timeouts\nnpm install' },
            { text: 'Bina timeout chalao aur search karo — doosre terminal mein stats dekho.', cmd: 'SLOW_MS=8000 TIMEOUT_MS=0 npm start ex1-timeout\ncurl localhost:4402/search\ncurl localhost:4402/stats', expect: '(search 8+ second tak atka)\n{"waitingOnAnalytics":1,"timeoutMs":0,"fallback":false}' },
            { text: 'Ctrl+C. Ab 300 ms timeout aur fallback ke saath.', cmd: 'SLOW_MS=8000 TIMEOUT_MS=300 FALLBACK=1 npm start ex1-timeout\ncurl localhost:4402/search', expect: '{"tookMs":305,"degraded":true,"note":"analytics nahi mila — count chhupa diya, results diye",...}' },
            { text: 'Ctrl+C. Analytics theek (60 ms) par timeout sirf 40 ms.', cmd: 'SLOW_MS=60 TIMEOUT_MS=40 FALLBACK=1 npm start ex1-timeout\ncurl localhost:4402/search', expect: '{"tookMs":4x,"degraded":true,...}  ← healthy analytics phir bhi degraded' },
          ],
          observe: {
            q: 'Aakhri step (SLOW_MS=60, TIMEOUT_MS=40) mein search degraded kyun aaya?',
            choices: [
              'Analytics 60 ms leti hai aur timeout 40 ms tha — healthy service bhi timeout ho gayi (false alarm)',
              'Analytics crash ho gayi thi',
              'Fallback ne jaan-boojh ke count chhupaya',
              'curl ka apna timeout tha',
            ],
            answer: 0,
            explain: 'Timeout callee ke normal latency se kam ho toh har call "fail" dikhti hai. Value hamesha callee ke p99 se upar rakho.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Timeouts',
        instructions: 'Resilience ke sawaal SRE aur backend interviews mein pakke aate hain. 🎤',
        questions: [
          {
            q: 'Interviewer: "Service A ka thread pool full ho gaya par CPU 15% hai. Kya shak hai?"',
            choices: [
              'A kisi slow downstream (DB/service) ka bina timeout ya lambe timeout ke saath intezaar kar rahi hai — threads waiting mein hain, CPU kaam nahi kar raha',
              'A ka code bahut CPU-heavy hai',
              'A ko zyada CPU chahiye',
              'Memory leak',
            ],
            answer: 0,
            explain: 'Kam CPU + full pool = threads kisi ka intezaar kar rahe hain. Traces mein slow downstream dhoondho, timeouts check karo.',
          },
          {
            q: 'Interviewer: "Timeout ki value kaise decide karoge?"',
            choices: [
              'Callee ka p99 (normal + peak) dekh ke margin jodunga, caller ke latency budget aur thread/connection pool ke andar rakhunga, aur timeout rate ko monitor karunga',
              'Hamesha 30 second',
              'Jitna chhota utna achha',
              'Library ka default',
            ],
            answer: 0,
            explain: 'Neeche ki seema callee se, upar ki seema caller ke budget aur capacity se — aur data se tune.',
          },
          {
            q: 'Interviewer: "Timeout hua. Kya kaam hua ya nahi?"',
            choices: [
              'Pata nahi — request na pahunchi ho, kaam hua ho par jawab khoya ho, ya kaam abhi chal raha ho. Isliye non-idempotent kaam ke liye status check ya idempotency key chahiye',
              'Kaam fail hua',
              'Kaam success hua',
              'Timeout matlab callee crash hua',
            ],
            answer: 0,
            explain: 'Timeout = "unknown". Yeh ek line agle level ke saare retry rules ki neev hai.',
          },
        ],
      },
      success: [
        'Main bata sakta hoon ki synchronous dependency caller ko kaise doobo sakti hai',
        'Main teen failure cases aur "unknown" result samjha sakta hoon',
        'Main callee ke p99 aur caller ke budget se timeout value chun sakta hoon',
        'Main timeout ke baad partial response ka plan bana sakta hoon',
      ],
      homework: '<p>Apne project ke HTTP client code mein dhoondho: <code>timeout</code> kahan set hai? Har outgoing call (HTTP, DB, Redis) ki list banao aur likho: timeout value kya hai, callee ka p99 kya hai, aur timeout ke baad kya hota hai. Jahan timeout nahi hai, wahan value propose karo.</p>',
      cards: [
        { front: 'Timeout kya bachata hai?', back: 'Callee ko nahi — <b>caller ko</b>. Caller ke threads/connections doosri service ki susti mein phanse nahi rehte.' },
        { front: 'Network call ke 3 failure cases?', back: '1) Request pahunchi hi nahi 2) Kaam hua, jawab kho gaya 3) Callee slow. Caller ko teeno "jawab nahi aaya" dikhte hain.' },
        { front: 'Timeout value ki neeche aur upar ki seema?', back: 'Neeche: <b>callee ka p99</b> (warna false alarms). Upar: <b>caller ka budget + thread pool</b> (busy threads = rps × time).' },
        { front: 'Busy threads ka hisaab?', back: '<b>requests/second × har request ka time</b>. 400/s × 8 s = 3,200 (pool 200 = down). 400/s × 0.38 s = 152 ✅.' },
        { front: 'Timeout ke baad search kya kare?', back: '<b>Partial response</b> — restaurants dikhao, analytics wala badge chhupao. Main kaam bachao.' },
      ],
    },

    /* =================================================================
       LEVEL: Timeout ke baad — ignore / default / retry
       ================================================================= */
    {
      id: 'ms-timeout-handling',
      icon: '🔁',
      title: 'Timeout ke Baad Kya? — Ignore, Default ya Retry',
      badge: 'Retry Rakshak',
      source: Object.assign({ at: 466 }, SRC),
      hook: {
        when: 'KhanaKart · Diwali sale · 8:05 PM',
        title: 'Customer ka ₹450 teen baar kata, aur retries ne analytics ko aur dabaaya',
        text: 'Diwali sale mein do incidents ek saath hue. Pehla: payment-service ne bank ko ₹450 debit bheja, bank ne paisa kaat liya par jawab der se aaya. Payment-service ne timeout maana aur 2 baar retry kiya — customer ke ₹1,350 kate. Doosra: analytics-service 60% capacity par chal rahi thi. Search-service har timeout par 3 baar turant retry kar rahi thi — analytics par load 380% ho gaya aur analytics poori tarah gir gayi.',
      },
      objectives: [
        'Timeout ke baad <b>teen raaste</b>: ignore, default value, retry',
        '"Ignore" kab theek hai aur "success maan lena" kab khatarnak',
        'Retry kab <b>khatarnak</b> hai: non-idempotent, mehenga, overloaded callee',
        '<b>Exponential backoff</b>, <b>jitter</b> aur <b>idempotency key</b> se retry safe banana',
      ],
      steps: [
        {
          q: 'Timeout ke baad caller ke paas kaunse raaste hain?',
          points: [
            '<b>Ignore</b> — jawab ke bina aage badho.',
            '<b>Default value</b> — asli value ki jagah ek safe default use karo.',
            '<b>Retry</b> — maan lo kaam fail hua, dobara bhejo.',
          ],
          asli: 'Kisi bhi raaste se pehle: <b>exception pakdo</b>. Timeout, connection refused, 503 — har error type ka apna faisla ho. Bina pakde error ya toh process gira dete hain ya chupchaap galat haalat chhod dete hain.',
        },
        {
          q: 'Ignore kab chalega, kab nahi?',
          example: 'Chalega: user ne restaurant page khola, "page_view" analytics event bhejna tha, analytics ne time par jawab nahi diya. Event chhoot gaya — koi user nuksaan nahi.',
          body: '<b>Khatarnak ignore</b> = jawab na aane ko "success" maan lena. Order-service ne broker ko "order_confirmed" message bheja, acknowledgement nahi aaya, aur order-service ne maan liya message pahunch gaya. Asal mein message kho gaya → restaurant ko order mila hi nahi → user 45 minute intezaar karta raha.',
        },
        {
          q: 'Default value kab kaam aati hai?',
          analogy: 'Mausam app ko aaj ka forecast nahi mila, toh app "kal ka forecast" ya "data abhi update nahi hua" dikha deta hai — app band nahi hota.',
          example: 'Analytics timeout → "aaj X orders" badge ki jagah kuch nahi. Delivery ETA service timeout → "~30 min" dikhao. Recommendation timeout → "popular near you" ki fixed list.',
          asli: 'Default value tab achhi hai jab galat-sa default <b>koi nuksaan nahi</b> karta. Paise, stock, ya OTP jaisi cheezon ka default nahi hota.',
        },
        {
          q: 'Retry kab khatarnak hai?',
          body: '<table><tr><th>Situation</th><th>Retry ka nuksaan</th></tr>' +
            '<tr><td><b>Non-idempotent</b> — ₹450 debit</td><td>Pehla attempt kaam kar chuka tha → retry = ₹900/₹1,350 kata</td></tr>' +
            '<tr><td><b>Mehenga</b> — 20 second ki monthly report, GPU inference</td><td>Har retry = poora kharcha dobara</td></tr>' +
            '<tr><td><b>Callee overloaded</b> — analytics 60% capacity par</td><td>Retries load badhate hain → callee kabhi recover nahi karti (retry storm)</td></tr></table>',
          asli: '<b>Idempotent</b> ka matlab: same request 1 baar bhejo ya 5 baar, nateeja ek jaisa. GET menu idempotent hai. "₹450 kaato" idempotent nahi — jab tak idempotency key na ho.',
        },
        {
          q: 'Retry safe kaise banayein?',
          points: [
            '<b>Exponential backoff</b>: 200 ms, 400 ms, 800 ms... har attempt ke beech intezaar double.',
            '<b>Jitter</b>: intezaar mein thoda random jodo, taaki 10,000 clients ek hi millisecond par retry na karein.',
            '<b>Max attempts / retry budget</b>: 2-3 se zyada nahi; ya kul traffic ka max 10% retries.',
            '<b>Idempotency key</b>: har payment attempt ek hi key bheje (<code>Idempotency-Key: 7f3a...</code>). Server same key dobara dekhe toh naya debit nahi, purana result lautaye.',
          ],
          code: 'wait = min(cap, base * 2^attempt) + random(0, base)\n// base 200 ms: ~200, ~400, ~800 ms ...',
        },
      ],
      myth: [
        { myth: 'Timeout aaya matlab request fail hui — retry kar do.', sach: 'Timeout = "pata nahi". Kaam ho chuka ho sakta hai. Non-idempotent request par bina key retry = double charge.' },
        { myth: 'Zyada retries = zyada reliable system.', sach: 'Overloaded callee par retries load 2-4 guna kar dete hain. Retries sirf backoff, jitter aur budget ke saath madad karte hain — aur default/fallback ke bina users phir bhi errors dekhte hain.' },
      ],
      playbook: {
        title: 'timeout ke baad kya karein',
        use: [
          'Read/idempotent calls par 1-2 retries, exponential backoff + jitter ke saath',
          'Non-critical data (badges, recommendations, ETA) par default value',
          'Paise/stock jaisi calls par idempotency key + status check',
        ],
        avoid: [
          'Non-idempotent call par bina key retry',
          'Turant (bina backoff) loop mein retry',
          'Callee overload mein retries badhana — pehle load kam karo',
          'Timeout ko chupchaap "success" maan lena',
        ],
        how: [
          'Har call ke liye tay karo: idempotent? mehenga? default possible?',
          'Retry policy: max 2-3 attempts, backoff base ~200 ms, jitter, total time budget ke andar',
          'Payment/order APIs par Idempotency-Key header support karo (server key store kare, 24 h)',
          'Retries ka metric rakho — retry rate badhe toh alert (storm ki pehli nishani)',
        ],
        redflags: [
          'Downstream incident ke waqt us par traffic normal se kai guna',
          'Customer "paisa do baar kata" complaints',
          'Retry loop jisme sleep nahi hai',
        ],
        rule: 'Timeout = pata nahi. Retry tabhi jab dobara bhejna safe ho — warna default ya status check.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — retry storm ko roko',
          goal: 'Analytics ko <b>degraded (60% capacity)</b> par rakho. Users ko <b>99%+ jawab</b> milne chahiye aur analytics par load <b>normal ke 120% se kam</b> rehna chahiye.',
          scenario: 'search-service har request par analytics se counts maangti hai. Normal traffic = 100%. Degraded analytics sirf 60% traffic sambhaal sakti hai — usse zyada aane par failures badhte hain.',
          knobs: [
            { id: 'mode', label: 'Analytics ki haalat', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'normal (100%)', 1: '🔥 degraded (60%)' } },
            { id: 'retries', label: 'Retries per request', min: 0, max: 4, step: 1, value: 3 },
            { id: 'backoff', label: 'Exponential backoff + jitter', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off (turant retry)', 1: 'on' } },
            { id: 'fallback', label: 'Fail par default (badge chhupao)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off (error dikhao)', 1: 'on' } },
          ],
          nodes: [N('app', 120, 250), N('search', 440, 250), N('analytics', 800, 250)],
          edges: [{ from: 'app', to: 'search' }, { from: 'search', to: 'analytics' }],
          model: k => {
            const m = stormModel(k);
            const over = m.load > m.cap;
            const loadOk = m.load <= 120;
            return {
              nodes: {
                analytics: { tone: over ? 'bad' : 'ok', badge: `load ${m.load}% / capacity ${m.cap}%` },
                search: { tone: m.visible >= 99 ? 'ok' : 'bad', badge: `retries ${k.retries}${k.backoff ? ' + backoff' : ''}` },
                app: { tone: m.visible >= 99 ? 'ok' : 'bad', badge: `${m.visible.toFixed(1)}% jawab mile` },
              },
              flows: [
                { from: 'app', to: 'search', label: m.visible >= 99 ? 'results' : 'errors', tone: m.visible >= 99 ? 'ok' : 'bad', rate: 0.6 },
                { from: 'search', to: 'analytics', label: `${m.load}% traffic`, tone: over ? 'bad' : 'ok', rate: Math.min(1, m.load / 300) },
              ],
              readouts: [
                { label: 'Analytics par load', value: m.load + '%', tone: loadOk ? 'ok' : 'bad' },
                { label: 'Asli data ke saath success', value: m.real.toFixed(1) + '%', tone: m.real >= 95 ? 'ok' : m.real >= 80 ? 'warn' : 'bad' },
                { label: 'User ko jawab mila (default samet)', value: m.visible.toFixed(1) + '%', tone: m.visible >= 99 ? 'ok' : 'bad' },
              ],
              bars: [
                { label: 'Analytics load vs capacity', pct: Math.min(100, m.load / 4), text: `${m.load}% (cap ${m.cap}%)`, tone: over ? 'bad' : 'ok' },
                { label: 'User success', pct: m.visible, text: m.visible.toFixed(1) + '%', tone: m.visible >= 99 ? 'ok' : 'bad' },
              ],
              verdict: k.mode === 0
                ? { ok: false, text: 'Normal din mein sab theek dikhta hai. Asli test degraded mode mein hai — analytics ki haalat badlo.' }
                : (!loadOk ? { ok: false, text: `Retries ne analytics par load ${m.load}% kar diya — capacity sirf 60%. Retry storm.` }
                  : m.visible < 99 ? { ok: false, text: `Load theek hai (${m.load}%), par ${(100 - m.visible).toFixed(1)}% users ko error dikh raha hai. Default value socho.` }
                  : { ok: true, text: `Load ${m.load}%, users ko ${m.visible.toFixed(0)}% jawab. Analytics ko saans lene ki jagah mili.` }),
            };
          },
          check: k => { const m = stormModel(k); return k.mode === 1 && m.load <= 120 && m.visible >= 99; },
          lesson: '✅ <b>Storm ruk gaya.</b> Degraded callee par retries madad nahi karte — load badhate hain. Kam retries + backoff callee ko recover hone dete hain, aur default value users ko error se bachati hai.',
          quiz: {
            q: 'Backoff ON, retries 4, fallback OFF — asli success ~91% aur load ~148%. Is setup mein sabse bada khatra?',
            choices: [
              'Analytics capacity (60%) se kaafi zyada load — analytics recover nahi karegi aur gir sakti hai',
              'Users ko 100% jawab mil raha hai',
              'Backoff se latency zero ho gayi',
              'Koi khatra nahi',
            ],
            answer: 0,
            explain: 'Retries ne asli success thoda badhaya, par degraded service par 148% load chadha diya. Pehle load kam karo (kam retries, fallback), phir capacity badhao.',
          },
        },
        {
          type: 'dryrun',
          title: '🔍 Dry run — ₹450 teen baar kaise kate',
          goal: 'Timeout + retry + non-idempotent debit ka safar dekho — phir idempotency key ke saath dobara.',
          nodes: [N('app', 120, 250), N('payment', 450, 250), N('db', 800, 250, { id: 'bank', icon: '🏦', label: 'bank', kind: undefined })],
          edges: [{ from: 'app', to: 'payment' }, { from: 'payment', to: 'bank' }],
          panels: [{ id: 'stmt', title: 'Customer ka bank statement' }, { id: 'pay', title: 'payment-service log' }],
          steps: [
            {
              clock: '8:05:00.000',
              say: 'User ₹450 ka order place karta hai. payment-service bank ko debit bhejti hai. Timeout 1 second, max 2 retries. <b>Koi idempotency key nahi.</b>',
              flows: [{ from: 'app', to: 'payment', label: 'Pay ₹450', tone: 'acc' }, { from: 'payment', to: 'bank', label: 'debit ₹450 (attempt 1)', tone: 'acc' }],
              nodes: { payment: { tone: 'acc' }, bank: { tone: 'ok' } },
              panels: { stmt: ['balance ₹5,000'], pay: ['attempt 1 bheja'] },
            },
            {
              clock: '8:05:00.050',
              say: 'Sale ki bheed se bank slow hai. Bank <b>paisa kaat leta hai</b>, par jawab bhejne mein 1.5 second lagte hain.',
              nodes: { bank: { tone: 'slow', badge: 'debit ho gaya, jawab 1.5 s mein' } },
              panels: { stmt: ['− ₹450 (T1)', 'balance ₹4,550'] },
            },
            {
              clock: '8:05:01.000',
              say: 'payment-service ka 1 second ka timeout khatam. payment-service ko lagta hai attempt fail hua. 200 ms backoff ke baad <b>attempt 2</b>.',
              flows: [{ from: 'payment', to: 'bank', label: 'debit ₹450 (attempt 2)', tone: 'slow' }],
              nodes: { payment: { tone: 'slow', badge: 'timeout → retry' } },
              panels: { pay: ['attempt 1: timeout (1000 ms)', 'attempt 2 bheja'] },
              ask: {
                q: 'Attempt 1 ke timeout ke waqt asal haalat kya thi?',
                choices: ['Paisa kat chuka tha — sirf jawab raaste mein tha', 'Bank tak request pahunchi hi nahi thi', 'Bank ne debit reject kar diya tha', 'Debit abhi shuru bhi nahi hua tha'],
                answer: 0,
                explain: 'Yahi "kaam hua, jawab nahi aaya" case hai. payment-service ko yeh pata nahi chal sakta tha.',
              },
            },
            {
              clock: '8:05:02.600',
              say: 'Bank attempt 2 ko bhi naya debit maanta hai. Attempt 2 bhi timeout, phir attempt 3 — aur teesra debit. Customer ke <b>₹1,350</b> kate, order ek.',
              flows: [{ from: 'payment', to: 'bank', label: 'debit ₹450 (attempt 3)', tone: 'bad' }, { from: 'payment', to: 'app', label: 'status: unknown', tone: 'bad' }],
              nodes: { bank: { tone: 'bad', badge: '3 debits' }, app: { tone: 'bad', badge: '₹1,350 kata!' } },
              panels: { stmt: ['− ₹450 (T1)', '− ₹450 (T2)', '− ₹450 (T3)', 'balance ₹3,650'], pay: ['attempt 1, 2, 3: timeout'] },
              ask: {
                q: 'Bank ne har attempt ko naya debit kyun maana?',
                choices: ['Teeno requests ek jaisi thi par unhe jodne wali koi pehchaan (idempotency key) nahi thi', 'Bank ka bug', 'User ne teen baar button dabaaya', 'Network ne request copy kar di'],
                answer: 0,
                explain: 'Server ko kaise pata ki teen requests ek hi "irade" ki hain? Ek unique key se.',
              },
            },
            {
              clock: 'Fix ke baad',
              say: 'Ab payment-service har payment ke liye ek <b>Idempotency-Key</b> banati hai aur har retry mein <b>same key</b> bhejti hai. Bank key yaad rakhta hai: same key dobara aayi → naya debit nahi, purana result.',
              flows: [{ from: 'payment', to: 'bank', label: 'attempt 2 · key 7f3a…', tone: 'ok' }, { from: 'bank', to: 'payment', label: 'T1 (purana result)', tone: 'ok', back: true }],
              nodes: { bank: { tone: 'ok', badge: 'key 7f3a = T1' }, payment: { tone: 'ok', badge: 'paid (attempt 2)' }, app: { tone: 'ok', badge: '₹450 sirf ek baar' } },
              panels: { stmt: ['− ₹450 (T1)', 'balance ₹4,550 ✅'], pay: ['attempt 1: timeout', 'attempt 2: key 7f3a → T1 ✅'] },
              ask: {
                q: 'Idempotency key ke saath retry safe kyun ho gaya?',
                choices: ['Bank same key par pehla result lautata hai — kitni bhi baar bhejo, debit ek hi', 'Key se bank tez ho gaya', 'Key se timeout lamba ho gaya', 'Key se retries band ho gaye'],
                answer: 0,
                explain: 'Idempotency key non-idempotent kaam ko idempotent bana deti hai. Ab retry "pata nahi" ko safely suljha sakta hai.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> paise jaisi call par retry sirf idempotency key ke saath. Key na ho toh retry mat karo — status check karo ("T1 hua ya nahi?") ya user ko "processing" dikhao.',
        },
        {
          type: 'bins',
          title: 'Timeout aaya — kya karein?',
          instructions: 'Har KhanaKart call ke liye timeout ke baad ka sahi raasta chuno.',
          bins: [
            { id: 'retry', label: '🔁 Retry (backoff ke saath)' },
            { id: 'default', label: '🧩 Default / ignore' },
            { id: 'nokey', label: '🛑 Bina safety ke retry mat karo' },
          ],
          items: [
            { text: 'GET /restaurants/42/menu', bin: 'retry', explain: 'Read + idempotent. 1-2 retries backoff ke saath safe.' },
            { text: '"aaj 1,240 orders" badge ke liye analytics call', bin: 'default', explain: 'Nice-to-have data — badge chhupa do.' },
            { text: 'POST /debit ₹450 bina Idempotency-Key', bin: 'nokey', explain: 'Retry = double charge ka risk. Key lagao ya status check.' },
            { text: '"page_view" analytics event bhejna', bin: 'default', explain: 'Event chhoota toh koi user nuksaan nahi — ignore theek.' },
            { text: 'POST /debit ₹450 with same Idempotency-Key', bin: 'retry', explain: 'Key ke saath retry safe hai.' },
            { text: '20 second ki monthly GST report query', bin: 'nokey', explain: 'Mehenga kaam — retry = kharcha dobara. Async job banao.' },
            { text: 'Delivery ETA service', bin: 'default', explain: '"~30 min" default dikhao, order flow mat roko.' },
            { text: 'Send OTP SMS', bin: 'nokey', explain: 'Retry se user ko do OTP aate hain aur SMS ka paisa dobara. Status check ya dedupe ke saath hi.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Retries — quick check',
          questions: [
            {
              q: 'Exponential backoff mein jitter kyun jodte hain?',
              choices: ['Taaki hazaaron clients ek hi pal par retry karke nayi bheed na banayein', 'Taaki retry tez ho', 'Taaki timeout chhota ho', 'Taaki idempotency key na lage'],
              answer: 0,
              explain: 'Bina jitter sab clients 200 ms, 400 ms par ek saath aate hain — lehrein (thundering herd). Random thoda-sa farak bheed ko phaila deta hai.',
            },
            {
              q: 'Idempotent request kaunsi hai?',
              choices: ['PUT /users/42/address (poora address replace)', 'POST /orders (naya order)', 'POST /debit ₹450 bina key', 'POST /sms/send'],
              answer: 0,
              explain: 'Same address 5 baar set karo — nateeja ek. Baaki teeno har baar naya asar karte hain.',
            },
            {
              q: 'Downstream service incident mein hai. Tumhari service par kaunsa change sabse zyada madad karega?',
              choices: ['Retries kam karo aur default/fallback on karo', 'Retries 3 se 10 karo', 'Timeout 1 s se 30 s karo', 'Backoff hata do taaki jaldi retry ho'],
              answer: 0,
              explain: 'Incident mein downstream ko saans chahiye. Load kam karo aur users ko default do.',
            },
            {
              q: 'Broker par "order_confirmed" publish karte waqt ack nahi aaya. Sahi faisla?',
              choices: ['Success mat maano — publish retry karo (message id ke saath) ya outbox pattern se pakka karo', 'Maan lo message pahunch gaya', 'Order cancel kar do', 'Kuch mat karo'],
              answer: 0,
              explain: 'Ack ke bina "success maan lena" wahi khatarnak ignore hai. Message id se duplicate consumer side par pakde ja sakte hain.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — double debit aur idempotency key',
          project: '02-timeouts',
          exercise: 'ex2-idempotency',
          goal: 'Slow bank + timeout + retries se ₹450 kai baar kaato. Phir idempotency key on karke sirf ek debit dekho.',
          steps: [
            { text: 'Bina key chalao.', cmd: 'DELAY_MS=1500 TIMEOUT_MS=1000 RETRIES=2 USE_KEY=0 npm start ex2-idempotency', expect: 'payment-service  http://localhost:4412/pay  (TIMEOUT_MS=1000, RETRIES=2, USE_KEY=false)' },
            { text: 'Payment karo aur statement dekho.', cmd: "curl -X POST localhost:4412/pay -H 'content-type: application/json' -d '{\"amount\":450}'\ncurl localhost:4411/statement", expect: '{"status":"unknown",...}\n{"balance":3650,"debits":[T1, T2, T3]}' },
            { text: 'Ctrl+C. Idempotency key ke saath dobara.', cmd: "DELAY_MS=1500 TIMEOUT_MS=1000 RETRIES=2 USE_KEY=1 npm start ex2-idempotency\ncurl -X POST localhost:4412/pay -H 'content-type: application/json' -d '{\"amount\":450}'\ncurl localhost:4411/statement", expect: '{"status":"paid","attempt":2,...}\n{"balance":4550,"debits":[T1]}' },
          ],
          observe: {
            q: 'USE_KEY=1 wale run mein payment "paid" kaise hua jabki attempt 1 timeout hua tha?',
            choices: [
              'Attempt 2 same key ke saath gaya, bank ne key pehchaan kar T1 ka purana result turant lauta diya',
              'Bank tez ho gaya',
              'Attempt 2 ne naya debit kiya',
              'Timeout band ho gaya',
            ],
            answer: 0,
            explain: 'services/bank.js mein byKey map hai — same key par naya debit nahi. Log mein "🔁 key ... pehle hi process ho chuki" dikhega.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Retries & idempotency',
        instructions: 'Payments aur reliability ke interviews ka pakka sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Payment API ko idempotent kaise banaoge?"',
            choices: [
              'Client har payment intent ke liye unique Idempotency-Key bheje; server key + request hash + result store kare (jaise 24 ghante), same key par purana result lautaye, alag body par 409',
              'Payment API ko GET bana dunga',
              'Retries band kar dunga',
              'Database mein unique amount column',
            ],
            answer: 0,
            explain: 'Key, stored result, aur same key-alag body par error — teeno bolna strong jawab hai.',
          },
          {
            q: 'Interviewer: "Retry storm kya hai aur kaise rokoge?"',
            choices: [
              'Degraded service par callers ke retries load kai guna kar dete hain aur service recover nahi karti; retries limit, exponential backoff + jitter, retry budget, circuit breaker aur fallback se rokunga',
              'Jab retry bahut tez hote hain',
              'Jab database mein retries table bhar jaati hai',
              'Storm matlab network down',
            ],
            answer: 0,
            explain: 'Cause + multiple layers of defence = senior jawab.',
          },
          {
            q: 'Interviewer: "Kab default value dena galat hai?"',
            choices: [
              'Jab galat default nuksaan kare — paisa, stock availability, OTP, authorization jaise faisle',
              'Kabhi galat nahi',
              'Hamesha galat hai',
              'Sirf read APIs mein',
            ],
            answer: 0,
            explain: '"Stock available" ka default "haan" = oversell. Wahan error ya status check sahi hai.',
          },
        ],
      },
      success: [
        'Main timeout ke baad ignore, default aur retry mein sahi raasta chun sakta hoon',
        'Main pehchaan sakta hoon ki retry kab double charge ya storm banayega',
        'Main exponential backoff + jitter + retry budget samjha sakta hoon',
        'Main idempotency key ka flow bata sakta hoon',
      ],
      homework: '<p>Apne project ka retry code dhoondho (HTTP client config, SDK options, ya khud ka loop). Har jagah likho: max attempts, backoff, jitter hai ya nahi, aur call idempotent hai ya nahi. Kisi ek non-idempotent POST ke liye Idempotency-Key ka design likho: key kaun banata hai, server kitni der store karta hai.</p>',
      cards: [
        { front: 'Timeout ke baad 3 raaste?', back: '<b>Ignore</b> (non-critical), <b>default value</b> (safe fallback), <b>retry</b> (sirf safe calls par). Pehle exception pakdo.' },
        { front: 'Retry kab khatarnak?', back: '<b>Non-idempotent</b> (double charge), <b>mehenga</b> kaam, <b>overloaded callee</b> (retry storm).' },
        { front: 'Idempotent ka matlab?', back: 'Same request 1 baar ya N baar — <b>nateeja ek</b>. GET/PUT aam taur par; POST /debit sirf key ke saath.' },
        { front: 'Backoff + jitter formula?', back: '<code>wait = min(cap, base × 2^attempt) + random(0, base)</code> — bheed phaile, callee ko saans mile.' },
        { front: 'Idempotency key server side?', back: 'Key + request hash + result store (jaise 24 h). Same key → purana result. Same key alag body → 409.' },
      ],
    },

    /* =================================================================
       LEVEL: Retry sirf zaroorat par + design badlo
       ================================================================= */
    {
      id: 'ms-retry-smart',
      icon: '🧠',
      title: 'Retry Samajhdaari se — aur Dependency Hi Hata Do',
      badge: 'Dependency Darzi',
      source: Object.assign({ at: 1000 }, SRC),
      hook: {
        when: 'KhanaKart · Monday · slow 3G',
        title: '"Place order" do baar dabaaya, do orders ban gaye',
        text: 'Ek user local train mein slow 3G par tha. "Place order" dabaaya, 6 second kuch nahi hua, phir dobara dabaaya. App ne bhi apne aap ek retry bheja. Restaurant ko 3 biryani ke orders mile. Saath hi search team har incident mein analytics timeouts se pareshaan hai — kab tak timeout tune karte rahenge?',
      },
      objectives: [
        '<b>Retry only if needed</b>: retry se pehle check karo ki pichla kaam hua ya nahi',
        'Duplicate detection: recent-request cache aur client request id',
        '<b>Re-architect</b>: synchronous dependency ko async data flow se hatana',
        'Kab sync dependency rakhni hi padti hai',
      ],
      steps: [
        {
          q: '"Retry only if needed" ka matlab?',
          body: 'Seedha dobara bhejne ki jagah pehle <b>poochho: pichla attempt hua ya nahi?</b> Hua → purana result use karo. Nahi hua → tab retry karo.',
          example: 'App har "Place order" ke saath ek <code>clientRequestId</code> bhejta hai. Timeout ke baad app pehle <code>GET /orders?clientRequestId=abc</code> poochhta hai. Order mil gaya → success dikhao. Nahi mila → tab dobara POST.',
        },
        {
          q: 'Server side par duplicate kaise pakdein?',
          analogy: 'Chai wale bhaiya ko tumne 1 minute pehle "ek cutting" bola. Tum dobara bolte ho. Bhaiya yaad rakhte hain — "abhi toh banayi, wahi le lo" — doosri nahi banate.',
          body: 'order-service har naye order ke liye Redis mein ek chhoti entry rakhti hai: key = <code>user42 + cart ka hash</code>, value = order id, expiry 60 second. Same user, same cart, 60 second ke andar dobara aaya → naya order nahi, <b>purana order id</b> lautao.',
          asli: 'Window chhoti rakho aur cart ka hash include karo — warna user jaan-boojh ke doosra same order kare toh woh bhi block ho jaayega.',
        },
        {
          q: 'Re-architect karna kab behtar hai?',
          body: 'Har timeout ka ilaaj tuning nahi hai. Sawaal poochho: <b>kya is call ka synchronous hona zaroori hai?</b>',
          example: 'Search har request par analytics ko call karti hai sirf "aaj ke orders" badge ke liye. Behtar: analytics har minute counts <b>search ke apne index mein bhej de</b> (event ya batch ingest). Ab search analytics ko call hi nahi karti — analytics down ho toh bhi search chalti hai, bas count ek minute purana.',
          asli: 'Sabse achha timeout woh hai jiski zaroorat hi na pade. Data ko pehle se apne paas le aao (ingest / cache / event).',
        },
        {
          q: 'Toh kya har sync call hata dein?',
          body: 'Nahi. Kuch jawab <b>abhi</b> aur <b>sahi</b> chahiye:',
          points: [
            'Payment ka status — "paisa kata ya nahi" purana data nahi ho sakta.',
            'Login OTP bhejna — user screen par intezaar kar raha hai.',
            'Stock check jahan oversell ka nuksaan bada hai.',
          ],
          asli: 'Rule: data thoda purana chal sakta hai → async/ingest. Data abhi ka aur sahi chahiye → sync, par timeout + idempotency + status check ke saath.',
        },
        {
          q: 'Poore timeout chapter ke 3 sutra kya hain?',
          points: [
            '<b>Har network call par timeout</b> — kabhi infinite nahi.',
            '<b>Value soch ke</b> — neeche callee ka p99, upar caller ka budget.',
            '<b>Retries safe banao</b> — idempotency, backoff, "pehle check karo" — ya dependency hi hata do.',
          ],
        },
      ],
      myth: [
        { myth: 'Double order ka ilaaj: button ko disable kar do.', sach: 'Button disable madad karta hai, par app ka automatic retry, network ka duplicate, ya do devices phir bhi duplicate bhejte hain. Server side dedupe/idempotency zaroori hai.' },
        { myth: 'Async matlab data hamesha purana aur bekaar.', sach: '"Aaj ke orders" jaisa badge 1 minute purana ho toh kisi ko farak nahi padta. Freshness requirement pehle likho — zyadatar badges, counts, recommendations ke liye seconds-minutes ka lag theek hai.' },
      ],
      playbook: {
        title: 'retry only if needed + re-architect',
        use: [
          'Order/payment create par clientRequestId ya Idempotency-Key + status endpoint',
          'Server par short dedupe window (Redis, 60 s) same user + same payload ke liye',
          'Non-critical data (counts, badges, recommendations) ko async ingest/cache se caller ke paas le aao',
        ],
        avoid: [
          'Sirf frontend button disable par bharosa',
          'Freshness requirement jaane bina har cheez async karna',
          'Payment status jaisi "abhi ka sach" wali cheez ko cache se dena',
        ],
        how: [
          'Har sync call ke saath likho: data kitna purana chal sakta hai?',
          '"Seconds-minutes chal jaayega" → events/batch ingest se apni copy',
          '"Abhi ka sach chahiye" → sync + timeout + idempotency + status check',
          'Dedupe window aur key design: user + payload hash, expiry chhoti',
        ],
        redflags: [
          'Support tickets: "order do baar aaya"',
          'Har incident mein ek hi non-critical dependency search/home page girati hai',
          'Timeout values har hafte tune karni padti hain',
        ],
        rule: 'Retry se pehle poochho "kaam hua?" — aur sync call se pehle poochho "kya sync zaroori hai?"',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — double tap, ek hi order',
          goal: 'Dekho order-service Redis dedupe window se duplicate order kaise rokti hai.',
          nodes: [N('app', 120, 250), N('order', 450, 250), N('cache', 780, 110, { label: 'Redis dedupe' }), N('db', 780, 400, { label: 'orders DB' })],
          edges: [{ from: 'app', to: 'order' }, { from: 'order', to: 'cache' }, { from: 'order', to: 'db' }],
          panels: [{ id: 'redis', title: 'Redis (60 s expiry)' }, { id: 'orders', title: 'orders table' }],
          steps: [
            {
              clock: '12:31:00',
              say: 'User slow 3G par "Place order" dabaata hai. Request mein cart: 1 × Chicken Biryani, restaurant 42. order-service cart ka hash banati hai: <code>h9c1</code>.',
              flows: [{ from: 'app', to: 'order', label: 'POST /orders (tap 1)', tone: 'acc' }],
              nodes: { order: { tone: 'acc', badge: 'key user42:h9c1' } },
              panels: { redis: ['(khaali)'], orders: ['(koi order nahi)'] },
            },
            {
              clock: '12:31:00.2',
              say: 'Redis mein <code>user42:h9c1</code> nahi mila → naya order O-901 banao → Redis mein <code>user42:h9c1 = O-901</code> (60 s ke liye) likho.',
              flows: [{ from: 'order', to: 'cache', label: 'GET user42:h9c1 → miss', tone: 'slow' }, { from: 'order', to: 'db', label: 'INSERT O-901', tone: 'ok' }],
              nodes: { cache: { tone: 'ok', badge: 'SET user42:h9c1 = O-901' }, db: { tone: 'ok', badge: 'O-901' } },
              panels: { redis: ['user42:h9c1 → O-901 (60 s)'], orders: ['O-901 · biryani · ₹320'] },
            },
            {
              clock: '12:31:06',
              say: 'Response 3G par atak gaya. User ko 6 second kuch nahi dikha, user dobara dabaata hai. Same cart → same hash <code>h9c1</code>.',
              flows: [{ from: 'app', to: 'order', label: 'POST /orders (tap 2)', tone: 'slow' }],
              nodes: { app: { tone: 'slow', badge: 'double tap' } },
              ask: {
                q: 'Tap 2 par order-service ko sabse pehle kya karna chahiye?',
                choices: ['Redis mein user42:h9c1 dekhna — pehle se order hai kya', 'Seedha naya order banana', 'User ko block karna', 'Restaurant ko call karna'],
                answer: 0,
                explain: '"Retry only if needed" — pehle check, phir kaam.',
              },
            },
            {
              clock: '12:31:06.1',
              say: 'Redis mein key mili: O-901. order-service <b>naya order nahi banati</b>, O-901 hi lautati hai. Restaurant ko ek hi order.',
              flows: [{ from: 'order', to: 'cache', label: 'GET user42:h9c1 → O-901', tone: 'ok' }, { from: 'order', to: 'app', label: '200 · O-901 (same)', tone: 'ok', back: true }],
              nodes: { cache: { tone: 'ok', badge: 'hit → O-901' }, app: { tone: 'ok', badge: 'ek order ✅' } },
              panels: { orders: ['O-901 · biryani · ₹320  (sirf ek)'] },
            },
            {
              clock: '12:33:30',
              say: '2.5 minute baad user dost ke liye <b>jaan-boojh ke</b> wahi biryani dobara order karta hai. Redis entry 60 s mein expire ho chuki → naya order O-907 banta hai.',
              flows: [{ from: 'app', to: 'order', label: 'POST /orders (naya irada)', tone: 'acc' }, { from: 'order', to: 'db', label: 'INSERT O-907', tone: 'ok' }],
              panels: { redis: ['user42:h9c1 → O-907 (60 s)'], orders: ['O-901 · biryani', 'O-907 · biryani (jaan-boojh ke)'] },
              ask: {
                q: 'Dedupe window 60 second kyun rakhi, 1 din kyun nahi?',
                choices: ['Lambi window jaan-boojh ke kiye gaye same order ko bhi block kar degi', 'Redis mein jagah nahi hai', '60 second random number hai', 'Lambi window se order tez banta hai'],
                answer: 0,
                explain: 'Window sirf "galti ke duplicate" pakadne jitni lambi ho — asli naye irade ko rokne jitni nahi.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> retry se pehle check karo. Server side dedupe (key = user + payload hash, chhoti expiry) client ke kisi bhi retry — button, app, network — se bachata hai.',
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — search ko order counts kaise milein?',
          instructions: 'Har slot ke liye option chuno. Review mein saare options ka trade-off khulega.',
          brief: 'KhanaKart search har restaurant ke saath "aaj X orders" badge dikhati hai. Counts analytics-service ke paas hain. Pichhle 3 incidents analytics timeouts se aaye.',
          requirements: ['Search p99 < 500 ms, analytics down ho tab bhi', 'Badge ka count 2 minute tak purana chalega', 'Analytics par search ki wajah se extra load na ho'],
          slots: [
            {
              id: 'path', label: 'Counts search tak kaise pahunchein', icon: '🛣️',
              options: [
                { id: 'ingest', label: 'Analytics har minute counts search index mein bheje (async ingest)', score: 3, why: 'Search analytics ko call hi nahi karti — dependency khatam, 1 minute lag requirement mein.' },
                { id: 'cache', label: 'Har search par analytics call, 60 s cache ke saath', score: 1, why: 'Load kam hota hai, par cache miss par dependency wapas — cold start/expiry par incident phir aayega.' },
                { id: 'sync', label: 'Har search par analytics ko sync call', score: -3, why: 'Wahi setup jisne 3 incidents diye.' },
              ],
            },
            {
              id: 'timeout', label: 'Agar koi sync call bache toh timeout', icon: '⏱️',
              options: [
                { id: 't300', label: '~300 ms (p99 + margin, budget ke andar)', score: 3, why: 'Normal din mein false alarm nahi, incident mein threads jaldi free.' },
                { id: 't10s', label: '10 second', score: -2, why: 'Incident mein search ke threads 10 s phanse — search down.' },
                { id: 'none', label: 'Library default (infinite)', score: -3, why: 'Susti poori tarah caller mein aa jaati hai.' },
              ],
            },
            {
              id: 'fail', label: 'Count na mile toh', icon: '🧩',
              options: [
                { id: 'hide', label: 'Badge chhupao, results do', score: 3, why: 'Main kaam (dhoondhna) bacha, sirf "nice to have" gaya.' },
                { id: 'error', label: 'Search error page', score: -3, why: 'Ek badge ke liye poora search band.' },
                { id: 'zero', label: '"aaj 0 orders" dikhao', score: -1, why: 'Galat jaankari — restaurant bura lagega, user confuse. Chhupana behtar.' },
              ],
            },
            {
              id: 'retry', label: 'Retry policy (analytics call)', icon: '🔁',
              options: [
                { id: 'none', label: 'Koi retry nahi — default do', score: 3, why: 'Badge ke liye retry ka faayda kam, degraded analytics par load ka nuksaan zyada.' },
                { id: 'one', label: '1 retry, backoff + jitter', score: 1, why: 'Chal sakta hai, par latency budget mein jagah kam aur storm ka thoda risk.' },
                { id: 'loop', label: '5 turant retries', score: -3, why: 'Retry storm ka recipe.' },
              ],
            },
          ],
          pass: 10,
          verdicts: {
            great: '🌟 Dependency hata di, bachi hui call surakshit, aur failure par user ko kaam ka jawab.',
            ok: '👍 Theek-thaak — laal slots ke trade-off padho.',
            bad: '😅 Yeh design pichhle incidents dobara laayega. Review padho.',
          },
        },
        {
          type: 'order',
          title: 'Sync call ko async ingest mein badalne ka kram',
          instructions: 'Search → analytics sync call hata ke async ingest lana hai, bina downtime. Kram lagao.',
          steps: [
            { text: 'Badge ki freshness requirement tay karo (jaise 2 minute tak purana chalega)', explain: 'Bina requirement ke async ka lag galat lag sakta hai.' },
            { text: 'Search index mein ordersToday field jodo (khaali rahe toh badge chhupta hai)', explain: 'Reader pehle taiyaar — writer baad mein.' },
            { text: 'Analytics se har minute counts search index mein push/ingest shuru karo', explain: 'Data flow chalu, par search abhi bhi purane raaste se padh rahi hai.' },
            { text: 'Search ko feature flag ke peeche index se count padhne par switch karo', explain: 'Flag se turant wapas ja sakte ho.' },
            { text: 'Dashboards dekho: search p99, badge coverage, ingest lag', explain: 'Data se confirm karo naya raasta sahi hai.' },
            { text: 'Search se analytics ki sync call aur uska timeout code hata do', explain: 'Purana raasta hatao, warna koi na koi wapas use karega.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Smart retries — quick check',
          questions: [
            {
              q: 'App ne "Place order" ke baad timeout dekha. Behtar agla kadam?',
              choices: ['clientRequestId se order ka status poochho, na mile tabhi dobara bhejo', 'Turant 3 baar POST', 'User ko "order fail" dikha do', 'App restart karo'],
              answer: 0,
              explain: 'Timeout = pata nahi. Pehle check, phir retry.',
            },
            {
              q: 'Kaunsa data async ingest ke liye sabse theek hai?',
              choices: ['Restaurant ka "aaj ke orders" count', 'Payment ka status', 'Login OTP', 'Wallet balance debit'],
              answer: 0,
              explain: 'Count minute bhar purana chal sakta hai. Baaki teen "abhi ka sach" maangte hain.',
            },
            {
              q: 'Redis dedupe key mein cart ka hash kyun?',
              choices: ['Taaki same user ka ALAG cart wala asli naya order block na ho', 'Taaki key lambi ho', 'Redis ko hash pasand hai', 'Security ke liye'],
              answer: 0,
              explain: 'Key sirf "same irada" pakde: same user + same cart + chhoti window.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — analytics band, search phir bhi zinda',
          project: '02-timeouts',
          exercise: 'ex3-async-ingest',
          goal: 'Analytics counts push kare, search apni copy se jawab de. Phir analytics band karo aur search dekho.',
          steps: [
            { text: 'Terminal 1 mein search-async chalao.', cmd: 'node services/search-async.js', expect: 'search-async  http://localhost:4403/search  (apne index se — analytics ko call nahi karti)' },
            { text: 'Terminal 2 mein analytics push mode mein chalao, 5 second ruko.', cmd: 'PUSH_TO_SEARCH=1 node services/analytics-service.js', expect: 'analytics-service  counts push kiye → {"r1":1240,...}' },
            { text: 'Terminal 3 se search karo.', cmd: 'curl localhost:4403/search', expect: '{"countsAgeSeconds":1,"results":[{"id":"r1",...,"ordersToday":1240},...]}' },
            { text: 'Terminal 2 mein Ctrl+C (analytics band), 5 second baad dobara search.', cmd: 'curl localhost:4403/search', expect: '{"countsAgeSeconds":6,"results":[...,"ordersToday":1240,...]}' },
          ],
          observe: {
            q: 'Analytics band hone ke baad search response mein kya badla?',
            choices: [
              'Results aur counts aate rahe, sirf countsAgeSeconds badhta gaya (data purana hota gaya)',
              'Search 504 dene lagi',
              'Counts null ho gaye aur search slow',
              'Kuch nahi badla, countsAgeSeconds bhi same raha',
            ],
            answer: 0,
            explain: 'search-async analytics ko call hi nahi karti. Dependency hat gayi — incident sirf "data kitna purana" ban gaya.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Design ka sawaal',
        instructions: 'Yahan interviewer tuning se aage "design" sunna chahta hai. 🎤',
        questions: [
          {
            q: 'Interviewer: "Service A har request par service B ko call karti hai aur B ke incidents A ko girate hain. Timeout ke alawa kya karoge?"',
            choices: [
              'Dekhunga data kitna fresh chahiye; agar thoda purana chalega toh B se events/batch ingest ya cache se A ke paas copy rakhunga taaki hot path par B ki call hi na ho',
              'B ki capacity 10x kar dunga',
              'A mein retries badha dunga',
              'A aur B ko merge kar dunga',
            ],
            answer: 0,
            explain: 'Freshness requirement se design decide karna — yahi re-architect wala jawab hai.',
          },
          {
            q: 'Interviewer: "Duplicate orders ko end-to-end kaise rokoge?"',
            choices: [
              'Client clientRequestId/Idempotency-Key bheje, server key par unique constraint ya dedupe store rakhe, timeout par client pehle status check kare, aur UI button bhi disable kare',
              'Sirf button disable',
              'Database se duplicate rows raat ko delete',
              'Users ko warning dikhana',
            ],
            answer: 0,
            explain: 'Defence in depth: client, API contract, server storage — teeno layers.',
          },
          {
            q: 'Interviewer: "Kab sync call rakhni hi padegi?"',
            choices: [
              'Jab jawab abhi ka aur sahi hona chahiye aur user usi ka intezaar kar raha hai — payment status, OTP, critical stock check — wahan timeout + idempotency + status check ke saath',
              'Kabhi nahi',
              'Hamesha',
              'Sirf internal services mein',
            ],
            answer: 0,
            explain: 'Life non-binary hai: async default nahi, requirement se chuna jaata hai.',
          },
        ],
      },
      success: [
        'Main "retry only if needed" ko status check aur dedupe se laga sakta hoon',
        'Main dedupe key aur window design kar sakta hoon',
        'Main freshness requirement dekh kar sync call ko async ingest mein badal sakta hoon',
        'Main bata sakta hoon kab sync call zaroori hai',
      ],
      homework: '<p>Apne project ki har synchronous call ke saath ek column jodo: "yeh data kitna purana chal sakta hai?" (0 sec / 5 sec / 1 min / 1 ghanta). Jahan jawab 1 minute ya usse zyada hai, wahan async ingest ya cache ka ek line ka plan likho.</p>',
      cards: [
        { front: 'Retry only if needed?', back: 'Timeout ke baad pehle <b>status check</b> (clientRequestId / key) — kaam hua toh purana result, nahi hua toh tab retry.' },
        { front: 'Dedupe key design?', back: '<b>user + payload hash</b>, chhoti expiry (jaise 60 s). Galti ke duplicate pakde, asli naya order na roke.' },
        { front: 'Re-architect ka sawaal?', back: '"Kya yeh call sync hona zaroori hai?" Data thoda purana chalega → <b>async ingest / events / cache</b> se apni copy.' },
        { front: 'Sync kab zaroori?', back: 'Jawab <b>abhi ka aur sahi</b> chahiye aur user intezaar kar raha hai: payment status, OTP, critical stock.' },
        { front: 'Timeout chapter ke 3 sutra?', back: '1) Har call par timeout 2) Value p99 aur budget se 3) Retries safe (idempotency, backoff, check) — ya dependency hatao.' },
      ],
    },
  ]);
})();
