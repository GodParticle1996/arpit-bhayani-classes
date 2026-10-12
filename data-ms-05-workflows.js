/* =====================================================================
   Video 5 — Workflows: Orchestration vs Choreography
   Source concept: Arpit Bhayani — "Orchestration vs Choreography" (youtube HiwOx-W1TIA)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'HiwOx-W1TIA', title: 'Orchestration vs Choreography in Microservices' };

  /* ---------------- models ---------------- */
  function planModel(k) {
    const R = 300, E = 400, D = 600, BACKOFF = 100, FAIL = 0.03, REJECT = 0.05;
    const riderP99 = k.retries >= 1 ? D + BACKOFF + D : D;
    const lat = rider => k.plan === 0 ? R + E + rider : k.plan === 1 ? Math.max(R, E, rider) : R + Math.max(E, rider);
    const normal = lat(D), p99 = lat(riderP99);
    const wrongRiders = k.plan === 1 ? Math.round(10000 * REJECT) : 0;
    const success = (1 - Math.pow(FAIL, k.retries + 1)) * 100;
    return { normal, p99, wrongRiders, success };
  }
  function changeModel(k) {
    const chor = k.pattern === 1;
    const prs = chor ? 0 : k.features;
    const knows = chor ? 0 : 3 + k.features;
    const debug = !chor ? 10 : k.tracing ? 10 : 90;
    const waitWeeks = chor ? 0 : Math.round(k.features * 1.5);
    return { chor, prs, knows, debug, waitWeeks };
  }
  function otpModel(k) {
    const sync = k.mode === 1;
    const carrier = 0.85;
    const arrive = sync ? carrier : k.backlog + carrier;
    const success = (1 - Math.pow(0.2, k.retries + 1)) * 100;
    const toldTruth = sync;
    const tapWait = sync ? carrier : 0.04;
    return { sync, arrive, success, toldTruth, tapWait };
  }

  /* ---------------- diagrams ---------------- */
  VISUALS['ms-orchestration'] = {
    t: 'Orchestration — ek conductor, baaki sab uske ishaare par',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-gold"><span class="ni">🎼</span><span class="nl">order-service</span><span class="ns">workflow ka dimaag</span></div>
    </div>
    <div class="dg-flow" style="margin-top:8px">
      <div class="dg-arrow flow"></div><div class="dg-node"><span class="ni">🍳</span><span class="nl">restaurant</span><span class="ns">1. accept</span></div>
      <div class="dg-arrow flow"></div><div class="dg-node"><span class="ni">🔔</span><span class="nl">notification</span><span class="ns">2a. email</span></div>
      <div class="dg-arrow flow"></div><div class="dg-node"><span class="ni">🛵</span><span class="nl">delivery</span><span class="ns">2b. rider</span></div>
    </div>
    <div class="dg-cap">Kab, kis kram mein, fail hone par kya — sab faisle ek jagah. Baaki services sirf bataya hua kaam karti hain.</div>`,
  };
  VISUALS['ms-choreography'] = {
    t: 'Choreography — event daalo, har service apna decide kare',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-accent"><span class="ni">🧾</span><span class="nl">order</span><span class="ns">order_placed</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-gold"><span class="ni">📣</span><span class="nl">pub/sub</span><span class="ns">har subscriber ko copy</span></div>
    </div>
    <div class="dg-flow" style="margin-top:8px">
      <div class="dg-node is-good"><span class="ni">🔔</span><span class="nl">notification</span><span class="ns">email + WhatsApp</span></div>
      <div class="dg-node is-good"><span class="ni">🍳</span><span class="nl">restaurant</span><span class="ns">kitchen tablet</span></div>
      <div class="dg-node is-good"><span class="ni">🛵</span><span class="nl">delivery</span><span class="ns">rider</span></div>
      <div class="dg-node is-accent"><span class="ni">🏅</span><span class="nl">loyalty</span><span class="ns">naya — order ko pata bhi nahi</span></div>
    </div>`,
  };
  VISUALS['ms-orch-or-chor'] = {
    t: 'Kaunsa pattern kahan',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-pill gold">🎼 Orchestration</div>
        <div class="dg-box is-gold"><span class="bx-label">sab-ya-kuch-nahi (Instamart stock + rider + payment)</span></div>
        <div class="dg-box is-gold"><span class="bx-label">user screen par ruka hai (OTP)</span></div>
        <div class="dg-box is-gold"><span class="bx-label">jawab bhar ke dena (recommendations)</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-pill good">💃 Choreography</div>
        <div class="dg-box is-good"><span class="bx-label">ek event, kai reactions (order placed)</span></div>
        <div class="dg-box is-good"><span class="bx-label">naye features aate rahenge</span></div>
        <div class="dg-box is-good"><span class="bx-label">ek service down, baaki chalein</span></div>
      </div>
    </div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Orchestration
       ================================================================= */
    {
      id: 'ms-orchestration',
      icon: '🎼',
      title: 'Orchestration — Ek Conductor Poora Workflow Chalata Hai',
      badge: 'Conductor Sahab',
      source: Object.assign({ at: 232 }, SRC),
      hook: {
        when: 'KhanaKart · Sunday dinner',
        title: 'Restaurant band tha, par rider pahunch gaya',
        text: 'Order place hote hi KhanaKart teen kaam karta hai: restaurant se accept lena, user ko email, aur rider assign karna. Ek din team ne teeno calls "ek saath" kar di taaki order jaldi ho. Sunday ko "Sharma Dhaba" band tha. Restaurant ne order reject kiya — par rider Ramesh already Sharma Dhaba pahunch chuka tha. 1 ghante mein 40 riders band restaurants ke bahar khade the. Kaam ka <b>kram</b> kisi ek jagah likha hi nahi tha.',
      },
      objectives: [
        '<b>Workflow</b> kya hai — ek event ke baad kai services ka kaam',
        '<b>Orchestration</b>: decision logic ek jagah (conductor), baaki services sirf bataya kaam karein',
        'Kram, parallel steps, retries aur <b>compensation</b> (undo) orchestrator kaise sambhalta hai',
        'Orchestration ki keemat: coordinator sabke naam jaanta hai, har naya step = coordinator mein badlaav',
      ],
      steps: [
        {
          q: 'Workflow kya hota hai?',
          body: 'Ek event ke baad kai services ko kaam karna hota hai. KhanaKart mein "order placed" ke baad: restaurant accept, email confirmation, rider assign. In kaamon ka kram aur rules = <b>workflow</b>.',
          example: 'Asli workflows mein shartein hoti hain: "restaurant accept kare tabhi rider", "payment aur restaurant dono ho jaayein tabhi kitchen ko ticket", "rider 3 baar na mile toh order cancel".',
        },
        {
          q: 'Orchestration kya hai?',
          analogy: 'Shaadi ka wedding planner: caterer ko bataata hai kab khana lagana hai, DJ ko kab gaana, pandit ji ko kab mandap. Caterer aur DJ aapas mein baat nahi karte — planner sab jodta hai.',
          body: 'Workflow ka <b>saara decision logic ek service mein</b> — orchestrator (aksar order-service). Orchestrator restaurant, notification aur delivery ko API call karke bataata hai kya karna hai. Restaurant, notification aur delivery services "dumb" hain — sirf bataya kaam.',
        },
        {
          q: 'Orchestrator kya-kya sambhalta hai?',
          points: [
            '<b>Kram</b> — restaurant accept pehle, rider baad mein.',
            '<b>Parallel</b> — email aur rider ek doosre par nirbhar nahi, ek saath chalao.',
            '<b>Zaroori vs optional</b> — email fail ho toh order chalu; rider na mile toh order ruk jaaye.',
            '<b>Retries</b> — rider-service fail hui toh 2 baar aur koshish.',
            '<b>Compensation</b> — rider nahi mila toh restaurant ko "order cancel" bhejo (undo).',
            '<b>State ek jagah</b> — support ko O-501 ka poora haal ek hi jagah dikhta hai.',
          ],
        },
        {
          q: 'Orchestration ki keemat kya hai?',
          points: [
            'Order-service <b>har service ka naam aur API</b> jaanti hai — coupling badhti hai.',
            'Naya step (loyalty points, "My orders" page) = <b>order-service ka code badlo</b> aur order team ki release ka intezaar.',
            'Orchestrator ka bug ya downtime = poora workflow ruka.',
          ],
          asli: 'Orchestration visibility aur control deta hai. Badle mein order team sab teams ki "gatekeeper" ban jaati hai.',
        },
      ],
      myth: [
        { myth: 'Orchestration matlab sab kuch sync aur ek ke baad ek.', sach: 'Orchestrator steps parallel chala sakta hai, queue se commands bhej sakta hai, aur ghanton lambe workflows bhi chala sakta hai (Temporal, AWS Step Functions). Orchestration ka matlab hai <b>faisla ek jagah</b>, sync hona nahi.' },
        { myth: 'Parallel calls hamesha tez aur behtar.', sach: 'Jo steps ek doosre par nirbhar hain (rider tabhi jab restaurant accept kare), unhe parallel chalana galat kaam karwata hai. Pehle dependency, phir parallel.' },
      ],
      playbook: {
        title: 'orchestration',
        use: [
          'Steps ka kram aur shartein important hain (accept → rider)',
          'Sab-ya-kuch-nahi chahiye, compensation/undo ke saath',
          'Support/ops ko ek jagah poora workflow state dekhna hai',
          'Lambe workflows (onboarding, refunds) jinhe retry aur timers chahiye',
        ],
        avoid: [
          'Har chhote side-effect (loyalty, analytics) ko orchestrator mein jodna',
          'Dependent steps ko parallel chalana',
          'Orchestrator mein business logic jo doosri service ka hai (price calculation)',
        ],
        how: [
          'Workflow ke steps + dependencies likho (kya kiske baad)',
          'Har step: zaroori ya optional, retries, timeout, compensation',
          'Workflow state store karo (RUNNING/COMPLETED/CANCELLED) + GET /workflows/:id',
          'Bade workflows ke liye workflow engine (Temporal, Step Functions, Camunda)',
        ],
        redflags: [
          'Order team ke paas doosri teams ke "bas ek step jod do" PRs ki line',
          'Kisi step ke fail hone par aadha kaam ho kar ruk jaata hai, koi undo nahi',
          'Workflow ka kram code ke 5 alag files mein bikhra',
        ],
        rule: 'Jahan kram, shartein aur undo important hon — wahan ek conductor rakho.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — orchestrator order O-501 chalata hai',
          goal: 'Har step par dekho faisla kaun le raha hai aur workflow state kya hai.',
          nodes: [N('order', 180, 260, { label: 'order (orchestrator)', icon: '🎼' }), N('restaurant', 700, 70), N('notification', 800, 260), N('delivery', 700, 450)],
          edges: [{ from: 'order', to: 'restaurant' }, { from: 'order', to: 'notification' }, { from: 'order', to: 'delivery' }],
          panels: [{ id: 'wf', title: 'Workflow state (orchestrator ke paas)' }, { id: 'why', title: 'Faisla' }],
          steps: [
            {
              say: 'User ne ₹320 ka order kiya. Orchestrator workflow O-501 banata hai: state <b>RUNNING</b>. Pehla step likha hai: restaurant accept.',
              flows: [{ from: 'order', to: 'restaurant', label: 'accept O-501?', tone: 'acc' }],
              nodes: { order: { tone: 'busy', badge: 'RUNNING' } },
              panels: { wf: ['O-501: RUNNING', 'restaurant: ⏳'], why: ['Kram: accept ke bina rider nahi'] },
            },
            {
              say: 'Restaurant ne accept kiya (300 ms). Ab email aur rider ek doosre par nirbhar nahi — orchestrator dono ko <b>ek saath</b> call karta hai.',
              flows: [{ from: 'order', to: 'notification', label: 'email bhejo', tone: 'acc' }, { from: 'order', to: 'delivery', label: 'rider do', tone: 'acc' }],
              nodes: { restaurant: { tone: 'ok', badge: 'accepted' } },
              panels: { wf: ['O-501: RUNNING', 'restaurant: ✅', 'notification: ⏳', 'delivery: ⏳'], why: ['Email aur rider parallel'] },
              ask: {
                q: 'Restaurant accept se pehle hi rider call kyun nahi kiya?',
                choices: ['Restaurant reject kare toh rider bekaar band restaurant jaata — rider step restaurant accept par nirbhar hai', 'Rider service slow hai', 'Parallel calls allowed nahi', 'Koi wajah nahi'],
                answer: 0,
                explain: 'Hook wali Sunday ki galti: dependent step parallel chala diya.',
              },
            },
            {
              say: 'Email chali gayi. Rider-service ne 500 error diya. Orchestrator ke rule mein likha hai: rider <b>zaroori</b> hai, 2 retries. Orchestrator 100 ms ruk kar dobara call karta hai.',
              flows: [{ from: 'order', to: 'delivery', label: 'retry 1/2', tone: 'slow' }],
              nodes: { notification: { tone: 'ok', badge: 'email ✅' }, delivery: { tone: 'bad', badge: '500 error' } },
              panels: { wf: ['O-501: RUNNING', 'restaurant: ✅', 'notification: ✅', 'delivery: ❌ → retry 1'], why: ['Rider zaroori → retry'] },
            },
            {
              say: 'Retry par rider Ramesh assign. Orchestrator state <b>COMPLETED</b> likhta hai. Support ko O-501 ka poora itihaas ek hi jagah dikhta hai.',
              flows: [{ from: 'order', to: 'delivery', label: 'rider Ramesh ✅', tone: 'ok' }],
              nodes: { delivery: { tone: 'ok', badge: 'Ramesh' }, order: { tone: 'ok', badge: 'COMPLETED' } },
              panels: { wf: ['O-501: COMPLETED', 'restaurant ✅ · email ✅', 'delivery ✅ (2 attempts)'] },
            },
            {
              say: 'Order O-502: rider-service 3 baar fail. Order bina rider nahi chal sakta, par restaurant ne accept kar liya hai. Orchestrator <b>compensation</b> chalata hai: restaurant ko "O-502 cancel" bhejta hai.',
              flows: [{ from: 'order', to: 'delivery', label: '3 attempts ❌', tone: 'bad' }, { from: 'order', to: 'restaurant', label: 'undo: cancel O-502', tone: 'slow' }],
              nodes: { delivery: { tone: 'bad', badge: 'rider nahi' }, restaurant: { tone: 'slow', badge: 'O-502 cancelled' }, order: { tone: 'slow', badge: 'CANCELLED_NO_RIDER' } },
              panels: { wf: ['O-502: CANCELLED_NO_RIDER', 'restaurant: ✅ → ↩️ undo', 'delivery: ❌ ×3'], why: ['Zaroori step fail → undo'] },
              ask: {
                q: 'Compensation na hota toh kya hota?',
                choices: ['Restaurant O-502 ka khana bana deta jiska koi rider nahi — khana aur paisa barbaad', 'Kuch nahi', 'Rider apne aap mil jaata', 'User ko double charge'],
                answer: 0,
                explain: 'Microservices mein ek DB transaction nahi hota. Aadha hua kaam undo karna padta hai — orchestrator ko kram pata hai, isliye undo bhi orchestrator karta hai.',
              },
            },
            {
              say: 'Mahine baad loyalty team chahti hai "order ke baad +20 points". Orchestrator mein naya step likhna padega → order team ki next release (2 hafte). Yahi orchestration ki keemat hai.',
              flows: [],
              nodes: { order: { tone: 'busy', badge: 'code change + release' } },
              panels: { why: ['Naya step = orchestrator badlo', 'Order team = gatekeeper'] },
            },
          ],
          lesson: '<b>Asli baat:</b> orchestrator kram, parallel, retry aur undo sab ek jagah rakhta hai — isliye debug aasaan aur galat kaam kam. Badle mein har naya step orchestrator se hokar jaata hai.',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — workflow plan banao',
          goal: '10,000 orders mein <b>0 galat rider</b> (band restaurant par), rider milne ka success <b>≥ 99.9%</b>, aur p99 time <b>≤ 1,700 ms</b>.',
          scenario: 'Restaurant accept 300 ms (5% reject). Email 400 ms. Rider assign 600 ms, har attempt 3% fail. Retry se pehle 100 ms rukna.',
          knobs: [
            { id: 'plan', label: 'Steps ka plan', min: 0, max: 2, step: 1, value: 0, labels: { 0: 'sab ek ke baad ek', 1: 'sab ek saath', 2: 'restaurant pehle, phir email + rider ek saath' } },
            { id: 'retries', label: 'Rider retries', min: 0, max: 3, step: 1, value: 0 },
          ],
          nodes: [N('order', 180, 260, { label: 'orchestrator', icon: '🎼' }), N('restaurant', 700, 70), N('notification', 800, 260), N('delivery', 700, 450)],
          edges: [{ from: 'order', to: 'restaurant' }, { from: 'order', to: 'notification' }, { from: 'order', to: 'delivery' }],
          model: k => {
            const m = planModel(k);
            const okP = m.p99 <= 1700, okW = m.wrongRiders === 0, okS = m.success >= 99.9;
            const order = k.plan === 0 ? ['1', '2', '3'] : k.plan === 1 ? ['1', '1', '1'] : ['1', '2', '2'];
            return {
              nodes: {
                restaurant: { tone: 'ok', badge: `step ${order[0]}` },
                notification: { tone: 'ok', badge: `step ${order[1]}` },
                delivery: { tone: okW ? (okS ? 'ok' : 'slow') : 'bad', badge: `step ${order[2]}${k.retries ? ` · ${k.retries} retry` : ''}` },
                order: { tone: okP && okW && okS ? 'ok' : 'busy', badge: `p99 ${m.p99} ms` },
              },
              flows: [
                { from: 'order', to: 'restaurant', label: 'accept?', tone: 'acc' },
                { from: 'order', to: 'notification', tone: 'ok', rate: 0.4 },
                { from: 'order', to: 'delivery', label: okW ? 'rider do' : 'rider do (bina accept!)', tone: okW ? 'ok' : 'bad' },
              ],
              readouts: [
                { label: 'Normal time', value: m.normal + ' ms', tone: m.normal <= 1000 ? 'ok' : 'warn' },
                { label: 'p99 time', value: m.p99 + ' ms', tone: okP ? 'ok' : 'bad' },
                { label: 'Galat riders / 10,000', value: String(m.wrongRiders), tone: okW ? 'ok' : 'bad' },
                { label: 'Rider mila', value: m.success.toFixed(3) + '%', tone: okS ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'p99', pct: Math.min(100, m.p99 / 25), text: m.p99 + ' ms', tone: okP ? 'ok' : 'bad' }],
              verdict: !okW
                ? { ok: false, text: `Rider restaurant accept ka intezaar nahi karta — 10,000 mein ${m.wrongRiders} riders band restaurants par.` }
                : !okS
                  ? { ok: false, text: `Bina retry har 100 mein ${(100 - m.success).toFixed(1)} orders cancel. Rider step zaroori hai — retry do.` }
                  : !okP
                    ? { ok: false, text: `p99 ${m.p99} ms — email aur rider ek doosre ka intezaar kyun kar rahe hain?` }
                    : { ok: true, text: `Kram sahi, parallel jahan ho sakta tha, retry zaroori step par. p99 ${m.p99} ms.` },
            };
          },
          check: k => { const m = planModel(k); return m.p99 <= 1700 && m.wrongRiders === 0 && m.success >= 99.9; },
          lesson: '✅ <b>Workflow plan sahi.</b> Dependency wale steps kram mein, independent steps ek saath, aur retry sirf zaroori step par. Yahi soch orchestrator ke code mein likhi jaati hai.',
          quiz: {
            q: 'Retries 1 se 3 kiye toh p99 kyun nahi badla?',
            choices: [
              'Ek retry ke baad fail chance 0.09% reh jaata hai — 1% se kam — isliye p99 mein doosra retry dikhta hi nahi; bas bahut kam orders ka time badhta hai',
              'Retries kaam nahi karte',
              'Model mein bug hai',
              'Rider service tez ho gayi',
            ],
            answer: 0,
            explain: '0.03 × 0.03 = 0.0009. Extra retries sirf "kismat ke maare" kuch orders ko lamba karte hain.',
          },
        },
        {
          type: 'order',
          title: 'Orchestrator ka code — sahi kram lagao',
          instructions: 'order-service ke "placeOrder" workflow ki lines ko sahi kram mein lagao.',
          steps: [
            { text: 'Workflow state banao: O-501 = RUNNING', explain: 'Pehle record — crash hua toh pata ho kahan ruke.' },
            { text: 'restaurant.accept(O-501) — reject hua toh state REJECTED, workflow khatam', explain: 'Baaki sab isi par nirbhar.' },
            { text: 'Ek saath: notification.email(O-501) [optional] aur delivery.assignRider(O-501) [zaroori, 2 retries]', explain: 'Independent steps parallel.' },
            { text: 'Rider nahi mila → restaurant.cancel(O-501) aur state CANCELLED_NO_RIDER', explain: 'Compensation.' },
            { text: 'Rider mila → state COMPLETED', explain: 'Workflow poora.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Orchestration — quick check',
          questions: [
            {
              q: 'Orchestration mein decision logic kahan hota hai?',
              choices: ['Ek coordinator service mein', 'Har service mein alag-alag', 'Message broker mein', 'Client app mein'],
              answer: 0,
              explain: 'Centralised brain. Baaki services "dumb workers".',
            },
            {
              q: 'Compensation kya hai?',
              choices: ['Aage fail hone par pehle ho chuke step ko undo karna (restaurant cancel)', 'Retry karna', 'User ko coupon dena', 'Timeout badhana'],
              answer: 0,
              explain: 'Services ke paar ek DB transaction nahi hota — undo khud likhna padta hai.',
            },
            {
              q: 'Orchestration ka sabse bada nuksaan?',
              choices: ['Coordinator sab services ko jaanta hai; har naya step coordinator mein badlaav maangta hai', 'Workflow state nahi dikhta', 'Retries possible nahi', 'Steps parallel nahi chal sakte'],
              answer: 0,
              explain: 'Coupling + coordinator team gatekeeper.',
            },
            {
              q: 'Kaunsa workflow orchestration ke liye sabse fit hai?',
              choices: ['Restaurant refund: payment reverse → restaurant ka hissa kaato → user ko credit → ticket close, har step par undo', '"Order placed" par analytics event', 'Page view counter', 'Logs bhejna'],
              answer: 0,
              explain: 'Kram, shartein aur undo — conductor chahiye.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — orchestrator chalao aur todo',
          project: '05-workflows',
          exercise: 'ex1-orchestrator',
          goal: 'Normal order, band restaurant, rider fail (bina retry aur retry ke saath), aur notification down — har case mein orchestrator ka faisla dekho.',
          steps: [
            { text: 'Install karo aur chalao.', cmd: 'cd arpitbhayaniclasses/docker-labs/05-workflows\nnpm install\nnpm start ex1-orchestrator' },
            { text: 'Normal order aur band restaurant ka order.', cmd: "curl -X POST localhost:4701/orders\ncurl -X POST localhost:4701/orders -H 'content-type: application/json' -d '{\"restaurantOpen\":false}'", expect: '{"state":"COMPLETED","totalMs":~950,...}\n{"state":"REJECTED","steps":[{"step":"restaurant","status":"rejected",...}]}' },
            { text: 'Ctrl+C. Rider pehli 2 baar fail, bina retry.', cmd: 'RIDER_FAIL_FIRST=2 npm start ex1-orchestrator\ncurl -X POST localhost:4701/orders\ncurl localhost:4702/log', expect: '{"state":"CANCELLED_NO_RIDER",... {"step":"restaurant","status":"compensated"}]}\nrestaurant log: "do" phir "undo"' },
            { text: 'Ctrl+C. Wahi, par 2 retries.', cmd: 'RIDER_FAIL_FIRST=2 RIDER_RETRIES=2 npm start ex1-orchestrator\ncurl -X POST localhost:4701/orders', expect: '{"state":"COMPLETED","totalMs":~2400,... "delivery","attempts":3 ...}' },
            { text: 'Ctrl+C. Notification down + naya loyalty step.', cmd: 'NOTIF_DOWN=1 ADD_LOYALTY=1 npm start ex1-orchestrator\ncurl -X POST localhost:4701/orders', expect: 'notification "failed" + note "optional step — order nahi rokenge", loyalty "+20 points", state COMPLETED' },
          ],
          observe: {
            q: 'Loyalty step jodne ke liye kya karna pada?',
            choices: [
              'Orchestrator ko naye config (ADD_LOYALTY=1) ke saath restart — asli life mein order-service ka code change aur release',
              'Kuch nahi, loyalty-service ne khud order suna',
              'Broker mein subscribe kiya',
              'Restaurant-service badli',
            ],
            answer: 0,
            explain: 'services/orchestrator.js mein loyalty step likha hai. Orchestration mein naya step = coordinator ka badlaav. Agla level yahi dard hatayega.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Orchestration',
        instructions: 'Workflow design ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Orchestration pattern samjhao."',
            choices: [
              'Workflow ka decision logic ek coordinator mein; coordinator participants ko commands/API calls bhejta hai, kram, retries, timeouts, compensation aur state sambhalta hai; participants workflow nahi jaante',
              'Har service event sunke khud decide karti hai',
              'Sab services ek DB share karti hain',
              'Kubernetes containers chalana',
            ],
            answer: 0,
            explain: 'Kubernetes "container orchestration" alag cheez hai — interview mein confuse mat hona.',
          },
          {
            q: 'Interviewer: "Microservices mein distributed transaction bina 2PC ke kaise?"',
            choices: [
              'Saga: har step ka local transaction + fail hone par pichhle steps ke compensating actions; orchestrated saga mein coordinator kram aur undo chalata hai',
              'Ek bada shared database',
              'Retries se sab theek ho jaata hai',
              'Possible nahi',
            ],
            answer: 0,
            explain: 'Saga pattern agle video (database per service) mein phir aayega.',
          },
          {
            q: 'Interviewer: "Orchestrator khud crash ho jaaye beech workflow mein?"',
            choices: [
              'Workflow state durable store mein har step ke baad likho; restart par state se resume; steps idempotent rakho taaki dobara chalne par nuksaan na ho (ya Temporal jaisa engine)',
              'Workflow dobara shuru se, bina check',
              'User ko bolo dobara order kare',
              'Orchestrator kabhi crash nahi hota',
            ],
            answer: 0,
            explain: 'Durable state + idempotent steps = resume safe.',
          },
        ],
      },
      success: [
        'Main orchestration ko KhanaKart order ke example se samjha sakta hoon',
        'Main workflow ke steps mein dependency, parallel, retry aur compensation tay kar sakta hoon',
        'Main orchestration ki keemat (coupling, gatekeeper) bata sakta hoon',
        'Main bata sakta hoon kab conductor rakhna sahi hai',
      ],
      homework: '<p>Apne project ka koi ek multi-step flow (signup, refund, checkout) lo. Uske steps ki list banao aur har step ke aage likho: kiske baad chalega, zaroori/optional, retries, aur fail hone par kaunsa pichhla step undo hoga.</p>',
      cards: [
        { front: 'Orchestration?', back: 'Workflow ka <b>decision logic ek coordinator</b> mein; baaki services sirf bataya kaam karti hain.' },
        { front: 'Orchestrator kya sambhalta hai?', back: 'Kram, parallel steps, zaroori/optional, retries, <b>compensation</b>, workflow state.' },
        { front: 'Compensation?', back: 'Aage fail hua toh pehle ho chuka step <b>undo</b> (restaurant cancel).' },
        { front: 'Orchestration ki keemat?', back: 'Coordinator sabko jaanta hai; <b>har naya step = coordinator badlo</b>; coordinator down = workflow ruka.' },
      ],
    },

    /* =================================================================
       LEVEL: Choreography
       ================================================================= */
    {
      id: 'ms-choreography',
      icon: '💃',
      title: 'Choreography — Har Service ka Apna Dimaag',
      badge: 'Event Ustaad',
      source: Object.assign({ at: 388 }, SRC),
      hook: {
        when: 'KhanaKart · Q3 planning',
        title: 'Chaar teams, ek order team, aur 6 hafte ki line',
        text: 'Loyalty team ko "order ke baad points" chahiye. Instamart team ko "My orders page update". Restaurant dashboard team ko "live order count". Fraud team ko "bade orders check". Charon ke liye order-service ke orchestrator mein step jodna hai. Order team ki backlog mein 6 hafte ki line lag gayi. Charon teams order team ke intezaar mein baithi hain — jabki order-service ka kaam sirf "order place karna" tha.',
      },
      objectives: [
        '<b>Choreography</b>: decision logic har service mein; event-driven architecture ki neev',
        'Pub/sub: ek event, har subscriber ko apni copy',
        'Faayde: loose coupling, naya subscriber bina publisher badle, flexibility, ek service down par baaki chalein',
        'Keemat: <b>observability</b> — event gaya? sabko mila? sabne kaam kiya?',
      ],
      steps: [
        {
          q: 'Choreography kya hai?',
          analogy: 'Mohalle ki WhatsApp group: society secretary likhta hai "kal subah 7 baje paani band". Har ghar khud decide karta hai — koi balti bharta hai, koi tanki check karta hai. Secretary ko nahi pata kaun kya karega, aur secretary ko jaanne ki zaroorat bhi nahi.',
          body: 'Order-service sirf <b>"order_placed" event</b> pub/sub (Kafka, SNS, Google Pub/Sub) par daalti hai — aur kaam khatam. Notification, restaurant, delivery services event <b>subscribe</b> karti hain, aur har service <b>khud decide</b> karti hai kya karna hai.',
        },
        {
          q: 'Pub/sub queue se kaise alag hai?',
          body: 'Queue (Level "Async: Broker") mein ek message <b>ek</b> consumer uthata hai. Pub/sub mein har <b>subscription</b> ko message ki <b>apni copy</b> milti hai. Notification ki 10 copies (workers) ek subscription share karti hain; restaurant ki alag subscription.',
          example: 'order_placed #901 → notification subscription (1 copy) + restaurant subscription (1 copy) + delivery subscription (1 copy).',
        },
        {
          q: 'Choreography ke faayde kya hain?',
          points: [
            '<b>Loose coupling</b> — order-service kisi subscriber ka naam nahi jaanti.',
            '<b>Extensible</b> — loyalty team apna subscriber khud chalaaye. Order team ko PR nahi.',
            '<b>Flexible</b> — notification team email ke saath WhatsApp bhi bhejna shuru kare, bina kisi ko bataye.',
            '<b>Robust</b> — notification down ho toh restaurant aur rider ka kaam chalta rahe; notification wapas aakar backlog utha le.',
          ],
          asli: 'Isliye bade product companies zyaadatar choreography pasand karti hain — teams ek doosre ka intezaar nahi karti.',
        },
        {
          q: 'Choreography ki keemat kya hai?',
          body: 'User ka ticket: "Mujhe email nahi aaya aur restaurant ne order dekha hi nahi." Ab teen sawaal:',
          points: [
            '1) Event <b>publish hua</b>?',
            '2) Har subscriber ko <b>mila</b>? (broker ka ack)',
            '3) Har subscriber ne <b>asal mein kaam kiya</b>? (ack kiya par bug se kaam skip bhi ho sakta hai)',
          ],
          asli: 'Workflow kisi ek jagah likha nahi hai — kai services mein bikhra hai. Jawab ke liye: har event mein <b>trace/correlation id</b>, har subscriber ka apna record, distributed tracing, aur subscription lag dashboards.',
        },
        {
          q: 'Naye subscriber ko purane events milenge?',
          body: 'Depends broker par. Kafka mein events retention tak rehte hain — naya consumer purane offset se padh sakta hai. SNS/SQS ya Pub/Sub mein subscription banne ke <b>baad</b> ke events hi milte hain. Launch se pehle yeh tay karo — backfill chahiye toh alag job.',
        },
      ],
      myth: [
        { myth: 'Broker ne ack dikha diya, matlab kaam ho gaya.', sach: 'Ack sirf "message uthaya" batata hai. Subscriber ne ack karke bug se kaam skip kiya ho sakta hai. Har subscriber ka apna "kiya" record aur trace chahiye.' },
        { myth: 'Choreography mein koi coupling nahi.', sach: 'Services <b>event schema</b> se judi hain. Order team ne "amount" field hataya toh loyalty todegi. Event bhi contract hai — versioning aur tolerant reader chahiye.' },
      ],
      playbook: {
        title: 'choreography',
        use: [
          'Ek event par kai teams ki services react karein (order placed)',
          'Naye reactions aate rahenge (features roadmap)',
          'Ek reaction fail ho toh baaki na rukein',
          'Delay (seconds) chalega',
        ],
        avoid: [
          'Sab-ya-kuch-nahi wale kaam jahan kram aur undo chahiye',
          'User screen par jawab ka intezaar kar raha hai (OTP)',
          'Bina trace id aur lag monitoring ke events',
        ],
        how: [
          'Event naam past tense mein: order_placed, payment_captured',
          'Event schema versioned; subscribers tolerant readers',
          'Har event mein traceId/correlationId; subscribers logs + traces mein wahi id',
          'Har subscription ka lag/depth dashboard + alert',
          'Subscriber idempotent (duplicate event safe)',
        ],
        redflags: [
          '"Kisne kya kiya" jaanne mein ghante lagte hain',
          'Event chain itni lambi ki koi nahi jaanta poora flow',
          'Subscribers ek doosre ke events se loop bana rahe hain',
        ],
        rule: 'Event daalo aur teams ko azaad karo — par har event ka trace pehle din se.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — order_placed ka safar',
          goal: 'Event fan-out, naya subscriber, notification down, aur "kya hua?" ticket — har step dekho.',
          nodes: [N('order', 130, 260), N('broker', 400, 260, { label: 'pub/sub', icon: '📣' }), N('notification', 800, 60), N('restaurant', 850, 180), N('delivery', 850, 300), N('coupon', 790, 420, { id: 'loyalty', icon: '🏅', label: 'loyalty' })],
          edges: [{ from: 'order', to: 'broker' }, { from: 'broker', to: 'notification', dashed: true }, { from: 'broker', to: 'restaurant', dashed: true }, { from: 'broker', to: 'delivery', dashed: true }, { from: 'broker', to: 'loyalty', dashed: true }],
          panels: [{ id: 'subs', title: 'Subscriptions' }, { id: 'trace', title: 'Trace tr-901' }],
          steps: [
            {
              say: 'Order O-901 save hua. Order-service ek event daalti hai: <b>order_placed</b> {orderId, amount ₹320, traceId tr-901}. User ko 40 ms mein "Order placed". Order-service ka kaam khatam.',
              flows: [{ from: 'order', to: 'broker', label: 'order_placed (tr-901)', tone: 'acc' }],
              nodes: { order: { tone: 'ok', badge: 'kaam khatam' }, loyalty: { tone: 'idle', badge: 'abhi nahi hai' } },
              panels: { subs: ['notification', 'restaurant', 'delivery'], trace: ['published ✅'] },
            },
            {
              say: 'Pub/sub har subscription ko <b>apni copy</b> deta hai. Notification khud decide karti hai: email bhi, WhatsApp bhi. Restaurant: kitchen tablet par dikhao. Delivery: rider dhoondho.',
              flows: [{ from: 'broker', to: 'notification', label: 'copy', tone: 'ok' }, { from: 'broker', to: 'restaurant', label: 'copy', tone: 'ok' }, { from: 'broker', to: 'delivery', label: 'copy', tone: 'ok' }],
              nodes: { notification: { tone: 'ok', badge: 'email + WhatsApp' }, restaurant: { tone: 'ok', badge: 'tablet par' }, delivery: { tone: 'ok', badge: 'rider Ramesh' } },
              panels: { trace: ['published ✅', 'notification ✅ restaurant ✅ delivery ✅'] },
              ask: {
                q: 'Notification team ne WhatsApp message jodna shuru kiya. Order team ko kya karna pada?',
                choices: ['Kuch nahi — notification service ka apna faisla hai', 'Order-service mein naya API call', 'Broker config badla', 'Order-service release'],
                answer: 0,
                explain: 'Choreography = har service ka apna dimaag. Flexibility.',
              },
            },
            {
              say: 'Loyalty team ne apna subscriber deploy kiya — order-service ko chhua bhi nahi. Agla order O-902 ka event ab <b>4</b> subscribers ko jaata hai. Loyalty +20 points jodta hai.',
              flows: [{ from: 'order', to: 'broker', label: 'O-902', tone: 'acc' }, { from: 'broker', to: 'loyalty', label: 'nayi copy', tone: 'ok' }],
              nodes: { loyalty: { tone: 'new', badge: '+20 points' } },
              panels: { subs: ['notification', 'restaurant', 'delivery', 'loyalty (naya)'] },
            },
            {
              say: 'Raat 9 baje notification-service ka deploy toota — service down. O-903 aaya. Restaurant aur delivery apna kaam karte rahe. Notification ki subscription mein events <b>jama</b> hote gaye (depth 240).',
              flows: [{ from: 'broker', to: 'restaurant', tone: 'ok' }, { from: 'broker', to: 'delivery', tone: 'ok' }, { from: 'broker', to: 'loyalty', tone: 'ok' }],
              nodes: { notification: { tone: 'bad', badge: 'down · depth 240' }, restaurant: { tone: 'ok', badge: 'chalu' }, delivery: { tone: 'ok', badge: 'chalu' } },
              panels: { subs: ['notification: depth 240 ⚠️', 'restaurant: 0', 'delivery: 0', 'loyalty: 0'] },
              ask: {
                q: 'Orchestration mein (orchestrator notification ko sync call karta) kya hota?',
                choices: ['Orchestrator ko handle karna padta — agar code mein "optional" na likha ho toh orders atak jaate', 'Kuch farak nahi', 'Restaurant bhi down ho jaata hamesha', 'Emails double jaatein'],
                answer: 0,
                explain: 'Choreography mein isolation apne aap milta hai. Orchestration mein isolation orchestrator ke code par nirbhar hai.',
              },
            },
            {
              say: 'Notification wapas aayi, 240 events utha liye. Par ek ticket aaya: "O-904 ka restaurant ne order dekha hi nahi." Trace tr-904 dekho: published ✅, restaurant subscription ne <b>ack</b> kiya ✅ — par restaurant-service ke record mein O-904 <b>nahi</b>. Tablet app ke bug ne ack karke kaam skip kiya.',
              flows: [{ from: 'broker', to: 'restaurant', label: 'acked, par kaam?', tone: 'slow' }],
              nodes: { notification: { tone: 'ok', badge: 'backlog khatam' }, restaurant: { tone: 'slow', badge: 'ack ✅ kaam ❌' } },
              panels: { trace: ['1) published ✅', '2) restaurant acked ✅', '3) restaurant ne kiya? ❌'] },
              ask: {
                q: 'Is bug ko pakadne ke liye kya zaroori tha?',
                choices: ['Trace id + har subscriber ka "maine kya kiya" record/span — broker ka ack kaafi nahi', 'Broker ka dashboard', 'Order-service ke logs', 'Kuch nahi, bug pakda hi nahi ja sakta'],
                answer: 0,
                explain: 'Choreography mein workflow kai jagah bikhra hai. Observability pehle din se banao.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> choreography teams ko azaad karta hai — naya subscriber, apne faisle, alag failures. Keemat: "poora flow kya hua?" ka jawab dene ke liye trace aur records khud banane padte hain.',
        },
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Q3 ke 6 naye features',
          goal: 'Is quarter ke <b>6 naye features</b> (loyalty, My orders, dashboard, fraud...) chahiye. Order team ke <b>0 PRs</b> aur "kya hua?" ticket debug <b>≤ 15 minute</b> mein.',
          scenario: 'Aaj order-service 3 services (restaurant, notification, delivery) chalati hai. Har naya feature ek aur reaction hai "order placed" par.',
          knobs: [
            { id: 'pattern', label: 'Pattern', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'orchestration', 1: 'choreography' } },
            { id: 'features', label: 'Naye features is quarter', min: 0, max: 8, step: 1, value: 2 },
            { id: 'tracing', label: 'Trace id + subscriber records + lag dashboard', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'nahi', 1: 'haan' } },
          ],
          nodes: [N('order', 170, 80), N('broker', 250, 400, { label: 'pub/sub', icon: '📣' }), N('notification', 800, 60), N('restaurant', 850, 180), N('delivery', 850, 300), N('coupon', 780, 420, { id: 'newf', icon: '✨', label: 'naye features' })],
          edges: [{ from: 'order', to: 'broker', dashed: true }, { from: 'broker', to: 'notification', dashed: true }, { from: 'broker', to: 'restaurant', dashed: true }, { from: 'broker', to: 'delivery', dashed: true }, { from: 'broker', to: 'newf', dashed: true }],
          model: k => {
            const m = changeModel(k);
            const okPr = m.prs === 0, okDbg = m.debug <= 15, okF = k.features >= 6;
            const targets = ['notification', 'restaurant', 'delivery', 'newf'];
            return {
              nodes: {
                order: { tone: m.chor ? 'ok' : (k.features ? 'busy' : 'acc'), badge: m.chor ? '0 naam jaanti hai' : `${m.knows} naam jaanti hai` },
                broker: { tone: m.chor ? 'acc' : 'idle', badge: m.chor ? 'fan-out' : 'use nahi' },
                newf: { tone: k.features ? (m.chor ? 'new' : 'slow') : 'idle', badge: k.features ? (m.chor ? `${k.features} subscribers` : `${m.waitWeeks} hafte line`) : 'koi nahi' },
              },
              flows: m.chor
                ? [{ from: 'order', to: 'broker', label: 'order_placed', tone: 'acc' }].concat(targets.map(t => ({ from: 'broker', to: t, tone: 'ok', rate: 0.5 })))
                : targets.filter(t => t !== 'newf' || k.features).map(t => ({ from: 'order', to: t, tone: t === 'newf' ? 'slow' : 'acc', rate: 0.5 })),
              readouts: [
                { label: 'Order team ke PRs', value: String(m.prs), tone: okPr ? 'ok' : 'bad' },
                { label: 'Teams ka intezaar', value: m.waitWeeks ? `~${m.waitWeeks} hafte` : '0', tone: m.waitWeeks ? 'bad' : 'ok' },
                { label: '"Kya hua?" debug', value: `~${m.debug} min`, tone: okDbg ? 'ok' : 'bad' },
                { label: 'Order-service kitni services jaanti hai', value: String(m.knows), tone: m.knows <= 3 ? 'ok' : 'warn' },
              ],
              bars: [
                { label: 'Debug time', pct: Math.min(100, m.debug), text: m.debug + ' min', tone: okDbg ? 'ok' : 'bad' },
              ],
              verdict: !okF
                ? { ok: false, text: 'Quarter ka plan 6 features ka hai — slider 6 ya upar karo.' }
                : !m.chor
                  ? { ok: false, text: `Orchestration: order team ke ${m.prs} PRs, teams ~${m.waitWeeks} hafte line mein. Debug aasaan (state ek jagah), par order team bottleneck.` }
                  : !okDbg
                    ? { ok: false, text: 'Choreography: 0 PRs, teams azaad. Par bina trace ke "restaurant ne dekha kyun nahi?" mein ~90 minute — 5 services ke logs mein haath-pair.' }
                    : { ok: true, text: `Choreography + tracing: ${k.features} naye subscribers, 0 PRs, debug ~10 min.` },
            };
          },
          check: k => { const m = changeModel(k); return k.features >= 6 && m.prs === 0 && m.debug <= 15; },
          lesson: '✅ <b>Teams azaad, flow dikhta hua.</b> Choreography ne order team ko bottleneck se hataya, aur tracing ne choreography ka sabse bada dard (observability) sambhala.',
          quiz: {
            q: 'Orchestration mein debug 10 minute kyun tha bina extra tracing ke?',
            choices: [
              'Workflow state aur kram ek hi service (orchestrator) mein hai — ek jagah dekh ke pata chalta hai',
              'Orchestration mein bugs nahi hote',
              'Orchestrator fast hai',
              'Broker tracing karta hai',
            ],
            answer: 0,
            explain: 'Centralised = visibility muft. Distributed = visibility banani padti hai.',
          },
        },
        {
          type: 'bins',
          title: 'Orchestration ya choreography ki khoobi?',
          instructions: 'Har baat ko sahi dabbe mein daalo.',
          bins: [{ id: 'orch', label: '🎼 Orchestration' }, { id: 'chor', label: '💃 Choreography' }],
          items: [
            { text: 'Workflow ka poora kram ek file mein padh sakte ho', bin: 'orch', explain: 'Centralised logic.' },
            { text: 'Naya reaction jodne ke liye publisher ko chhuna nahi padta', bin: 'chor', explain: 'Naya subscriber.' },
            { text: 'Coordinator sab participants ke API jaanta hai', bin: 'orch', explain: 'Coupling coordinator mein.' },
            { text: '"Event gaya, sabko mila, sabne kiya?" — trace chahiye', bin: 'chor', explain: 'Logic bikhra hua.' },
            { text: 'Fail hone par undo ka kram ek jagah likha', bin: 'orch', explain: 'Compensation coordinator chalata hai.' },
            { text: 'Event-driven architecture ki neev', bin: 'chor', explain: 'Services events par react karti hain.' },
            { text: 'Ek subscriber down, baaki apne aap chalte rahein', bin: 'chor', explain: 'Isolation by design.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Choreography — quick check',
          questions: [
            {
              q: 'Choreography mein order-service ko kya pata hota hai?',
              choices: ['Sirf event aur broker — subscribers kaun hain, nahi', 'Saare subscribers ke API', 'Har subscriber ka status', 'Kuch nahi, event bhi nahi'],
              answer: 0,
              explain: 'Loose coupling ka matlab.',
            },
            {
              q: 'Pub/sub mein notification ke 10 workers aur restaurant ke 3 workers. order_placed #1 kitni baar process hoga?',
              choices: ['2 baar — ek notification subscription mein, ek restaurant subscription mein', '13 baar', '1 baar', '10 baar'],
              answer: 0,
              explain: 'Har subscription ko ek copy; subscription ke andar workers share karte hain.',
            },
            {
              q: 'Order team "amount" field ka naam "total" kar de toh?',
              choices: ['Loyalty jaise subscribers toot sakte hain — event schema bhi contract hai', 'Kuch nahi, choreography mein coupling nahi', 'Broker naam badal dega', 'Sirf order-service tootegi'],
              answer: 0,
              explain: 'Versioning aur backward compatibility events par bhi.',
            },
            {
              q: 'Choreography ka sabse bada operational dard?',
              choices: ['Observability — poora flow kai services mein bikhra hai', 'Latency', 'Servers mehenge', 'Code likhna mushkil'],
              answer: 0,
              explain: 'Isliye trace id, per-subscriber records, lag dashboards.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — events, naya subscriber, aur trace',
          project: '05-workflows',
          exercise: 'ex2-choreography',
          goal: 'Notification down aur restaurant bug ke saath events chalao, loyalty subscriber bina order-service chhue jodo, aur trace tool se teen sawaalon ka jawab dhoondho.',
          steps: [
            { text: 'Notification down aur restaurant bug ke saath chalao.', cmd: 'NOTIF_DOWN=1 RESTAURANT_BUG=1 npm start ex2-choreography' },
            { text: 'Doosre terminal: naya loyalty subscriber, phir order.', cmd: 'npm run sub loyalty 4715\n# teesre terminal:\ncurl -X POST localhost:4711/orders', expect: '{"orderId":"O-1","traceId":"tr-...","status":"placed","userWaitedMs":~5,"brokerSays":"event 4 subscribers ko gaya"}' },
            { text: 'Trace dekho (traceId upar wale jawab se).', cmd: 'npm run trace tr-xxxx', expect: 'restaurant   ✅ acked   ❌ koi record nahi\ndelivery     ✅ acked   ✅ rider Ramesh assign kiya\nnotification 📦 queue mein pending   ❌ koi record nahi\nloyalty      ✅ acked   ✅ +20 loyalty points jode' },
            { text: 'Notification wapas lao aur backlog dekho.', cmd: 'curl localhost:4710/stats\ncurl -X POST localhost:4712/resume\ncurl localhost:4712/seen', expect: 'stats mein notification depth 1 → resume ke baad 0; seen mein order ka email' },
          ],
          observe: {
            q: 'Trace mein restaurant "acked" tha par record nahi. Iska matlab?',
            choices: [
              'Restaurant subscriber ne message uthake ack kar diya par kaam nahi kiya (SKIP_WORK bug) — broker ka ack kaam ki guarantee nahi',
              'Broker ne message kho diya',
              'Restaurant down tha',
              'Trace tool galat hai',
            ],
            answer: 0,
            explain: 'services/subscriber.js mein SKIP_WORK=1 par handle() bina seen[] likhe true lautata hai. Isliye tools/trace.js broker aur subscriber dono se poochhta hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Choreography',
        instructions: 'Event-driven design ke sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Orchestration vs choreography — ek line mein farak?"',
            choices: [
              'Orchestration: decision logic ek coordinator mein, commands bhejta hai. Choreography: har service events sunke khud decide karti hai, koi central coordinator nahi',
              'Orchestration async, choreography sync',
              'Dono same hain',
              'Choreography sirf Kafka ke saath',
            ],
            answer: 0,
            explain: 'Farak "faisla kahan hai" ka hai — sync/async ka nahi.',
          },
          {
            q: 'Interviewer: "Choreography mein end-to-end flow kaise monitor karoge?"',
            choices: [
              'Har event mein correlation/trace id, OpenTelemetry distributed tracing (publish aur consume spans), har subscriber ka business log/metric, subscription lag alerts, aur zaroori ho toh event-sourced "order timeline" view',
              'Broker ke acks gino',
              'Sirf order-service ke logs',
              'Monitoring zaroori nahi',
            ],
            answer: 0,
            explain: 'Technical (spans, lag) + business (kya kiya) dono.',
          },
          {
            q: 'Interviewer: "Choreography ka ek risk jo log bhool jaate hain?"',
            choices: [
              'Events ki chain itni lambi/cyclic ho sakti hai ki koi poora flow nahi jaanta; event schema changes subscribers tod sakte hain; duplicates ke liye idempotency chahiye',
              'Latency hamesha zyada',
              'Scale nahi hota',
              'Security nahi hoti',
            ],
            answer: 0,
            explain: 'Hidden workflow, schema coupling, duplicates.',
          },
        ],
      },
      success: [
        'Main choreography aur pub/sub fan-out samjha sakta hoon',
        'Main choreography ke chaar faayde KhanaKart examples ke saath bata sakta hoon',
        'Main observability ke teen sawaal aur unke jawab ka tareeka bata sakta hoon',
        'Main event schema ko contract ki tarah treat karna samajhta hoon',
      ],
      homework: '<p>Apne project ka ek event (ya banne wala event) lo. Uska naam, fields, version, traceId, aur 3 subscribers likho. Har subscriber ke liye: kya karega, idempotent kaise hoga, aur "maine kiya" ka record kahan jaayega.</p>',
      cards: [
        { front: 'Choreography?', back: 'Decision logic <b>har service mein</b>; publisher event daalta hai, subscribers khud decide karte hain.' },
        { front: 'Pub/sub vs queue?', back: 'Queue: message <b>ek</b> consumer ko. Pub/sub: har <b>subscription ko apni copy</b>.' },
        { front: 'Choreography ke 4 faayde?', back: 'Loose coupling, <b>naya subscriber bina publisher badle</b>, flexibility, failure isolation.' },
        { front: 'Observability ke 3 sawaal?', back: 'Event <b>publish hua</b>? Sabko <b>mila</b>? Sabne <b>kaam kiya</b>?' },
      ],
    },

    /* =================================================================
       LEVEL: Decision
       ================================================================= */
    {
      id: 'ms-orch-or-chor',
      icon: '🧭',
      title: 'Orchestration ya Choreography? — Zindagi Binary Nahi Hai',
      badge: 'Pattern Pandit',
      source: Object.assign({ at: 760 }, SRC),
      hook: {
        when: 'KhanaKart · login incident',
        title: '"Sab event-driven karo" — aur OTP 40 second late aane lage',
        text: 'Choreography ki kamyabi ke baad ek architect ne rule banaya: "har service-to-service baat event se hogi". Login OTP bhi event se jaane laga. Saturday sale mein otp_requested queue ke aage 50,000 promo SMS events the. OTP 40 second late aane lage. Users ne "Resend" dabaaya — aur queue aur lambi. Kuch OTPs kabhi nahi aaye, par app ne har baar "OTP sent" hi dikhaya.',
      },
      objectives: [
        'Orchestration kab behtar: <b>sab-ya-kuch-nahi</b>, <b>user screen par ruka hai</b> (OTP), <b>jawab bhar ke dena</b> (recommendations)',
        'Choreography kab behtar: ek event par kai reactions, naye features, isolation',
        'Ek product mein dono patterns saath',
        'Pattern requirement aur SLA se chuno, fashion se nahi',
      ],
      steps: [
        {
          q: 'Sab-ya-kuch-nahi kaam mein orchestration kyun?',
          body: 'Instamart 10-minute delivery: stock hold + rider assign + payment — teeno ho toh hi order, warna teeno undo. Yahan kram aur undo ek jagah chahiye. Orchestrator (saga coordinator) ya jahan zaroori ho wahan two-phase commit jaisa sync coordination.',
          example: 'Choreography mein "stock_held" → "rider_assigned" → "payment_failed" → "rider_released" → "stock_released" chain bikhar jaati hai aur debug mushkil.',
        },
        {
          q: 'OTP ke liye orchestration (sync call) kyun?',
          points: [
            '<b>User screen par ruka hai</b> — event queue ka backlog seedha login delay.',
            'SMS carrier waise hi slow hai — aur delay mat jodo.',
            'Consumer down = OTP gaya hi nahi, aur auth-service ko pata hi nahi.',
            'Sync call mein fail hua toh <b>turant retry</b> ya user ko "Resend" — sach batao.',
          ],
        },
        {
          q: 'Recommendations bhar ke kyun dena?',
          analogy: 'Kirane wala list mein sirf "item #14, #22" likh ke de toh tumhe har item ka naam aur daam alag se poochhna padega. Achha dukaandaar bill par naam aur daam likh ke deta hai.',
          body: 'Recommendation model sirf dish ids deta hai. Recommendation-service menu-service ko <b>sync call</b> karke naam, daam, photo jodti hai aur ek bhara hua jawab deti hai. Phone ko 5 round trips ki jagah 1.',
        },
        {
          q: 'Ek product mein dono kaise?',
          body: '<table><tr><th>KhanaKart flow</th><th>Pattern</th></tr>' +
            '<tr><td>Login OTP</td><td>Orchestration (sync)</td></tr>' +
            '<tr><td>Order placed → email, loyalty, dashboard, analytics</td><td>Choreography</td></tr>' +
            '<tr><td>Instamart stock + rider + payment</td><td>Orchestration (saga)</td></tr>' +
            '<tr><td>"Aapke liye" recommendations</td><td>Orchestration (sync enrich)</td></tr>' +
            '<tr><td>Restaurant rating update → search index, badges</td><td>Choreography</td></tr></table>',
          asli: 'Sawaal "kaunsa pattern modern hai" nahi. Sawaal: <b>is flow ki requirement aur SLA kya hai?</b>',
        },
      ],
      myth: [
        { myth: 'Choreography modern hai, orchestration purana — naye system mein sirf events.', sach: 'OTP, payments aur sab-ya-kuch-nahi flows mein orchestration aaj bhi sahi hai. Bade companies dono saath use karti hain.' },
        { myth: 'Event se bheja toh reliable ho gaya.', sach: 'Event reliable delivery deta hai, timely delivery nahi. Aur publisher ko pata nahi chalta kaam hua ya nahi — user ko "sent" bolna jhooth ho sakta hai.' },
      ],
      playbook: {
        title: 'orchestration ya choreography',
        use: [
          'Orchestration: sab-ya-kuch-nahi, kram + undo, user screen par ruka, jawab bharna',
          'Choreography: ek event kai reactions, teams azaad, failure isolation, delay chalega',
        ],
        avoid: [
          'Company-wide "sirf events" ya "sirf APIs" rule',
          'User-blocking kaam queue ke peeche',
          'Side-effects ki lambi list orchestrator mein',
        ],
        how: [
          'Har flow: user ruka hai? sab-ya-kuch-nahi? kitni teams react karengi? delay SLA?',
          'Pehle do haan → orchestration. Aakhri do haan → choreography',
          'Mixed flow: core steps orchestrated, side-effects event se',
        ],
        redflags: [
          'OTP/payment events ke peeche aur "sent" dikhana bina confirm',
          'Orchestrator mein 15 steps jinmein 10 "nice to have"',
          'Event chain jiska undo koi nahi jaanta',
        ],
        rule: 'Core aur user-blocking steps orchestrate karo; side-effects choreograph karo.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — Saturday sale ka OTP',
          goal: 'Sale mein queue backlog <b>≥ 10 second</b> hai. OTP phone par <b>≤ 3 second</b>, pehli baar mein success <b>≥ 99%</b>, aur carrier down ho toh user ko <b>sach</b> pata chale.',
          scenario: 'SMS carrier ~850 ms leta hai aur 20% attempts fail karta hai. Event mode mein OTP worker ke aage backlog hai.',
          knobs: [
            { id: 'mode', label: 'OTP kaise bheje', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'event (choreography)', 1: 'sync call (orchestration)' } },
            { id: 'backlog', label: 'Queue backlog (sale)', min: 0, max: 40, step: 5, value: 0, unit: ' s' },
            { id: 'retries', label: 'Retries', min: 0, max: 3, step: 1, value: 0 },
          ],
          nodes: [N('app', 110, 300), N('profile', 370, 300, { label: 'auth', icon: '🔐' }), N('broker', 630, 70), N('notification', 860, 300, { label: 'SMS carrier', icon: '📱' })],
          edges: [{ from: 'app', to: 'profile' }, { from: 'profile', to: 'broker', dashed: true }, { from: 'broker', to: 'notification', dashed: true }, { from: 'profile', to: 'notification', dashed: true }],
          model: k => {
            const m = otpModel(k);
            const okA = m.arrive <= 3, okS = m.success >= 99, okT = m.toldTruth, okB = k.backlog >= 10;
            return {
              nodes: {
                app: { tone: okA ? 'ok' : 'bad', badge: `OTP ${m.arrive.toFixed(1)} s baad` },
                profile: { tone: m.sync ? 'acc' : 'idle', badge: m.sync ? `wait ${Math.round(m.tapWait * 1000)} ms` : '"OTP sent" turant' },
                broker: { tone: m.sync ? 'idle' : (k.backlog ? 'busy' : 'ok'), badge: m.sync ? 'use nahi' : `backlog ${k.backlog} s` },
                notification: { tone: okS ? 'ok' : 'slow', badge: `${m.success.toFixed(1)}% success` },
              },
              flows: m.sync
                ? [{ from: 'app', to: 'profile', label: 'login', tone: 'acc' }, { from: 'profile', to: 'notification', label: `send (${k.retries} retry)`, tone: okS ? 'ok' : 'slow' }]
                : [{ from: 'app', to: 'profile', label: 'login', tone: 'acc' }, { from: 'profile', to: 'broker', label: 'otp_requested', tone: 'acc' }, { from: 'broker', to: 'notification', label: `${k.backlog} s baad`, tone: k.backlog > 2 ? 'slow' : 'ok' }],
              readouts: [
                { label: 'OTP phone par', value: m.arrive.toFixed(1) + ' s', tone: okA ? 'ok' : 'bad' },
                { label: 'Pehli baar success', value: m.success.toFixed(1) + '%', tone: okS ? 'ok' : 'bad' },
                { label: 'Carrier down: user ko sach pata?', value: okT ? 'haan — "Resend" dikhe' : 'nahi — "OTP sent" jhooth', tone: okT ? 'ok' : 'bad' },
              ],
              bars: [{ label: 'OTP delay', pct: Math.min(100, m.arrive * 2.5), text: m.arrive.toFixed(1) + ' s', tone: okA ? 'ok' : 'bad' }],
              verdict: !okB
                ? { ok: false, text: 'Sale ka backlog kam se kam 10 s hai — slider 10 ya upar karo.' }
                : okA && okS && okT
                  ? { ok: true, text: `Sync + ${k.retries} retry: OTP ${m.arrive.toFixed(1)} s, ${m.success.toFixed(1)}% success, failure par sach. Queue ke backlog se azaad.` }
                  : !m.sync
                    ? { ok: false, text: `Event mode: OTP ${m.arrive.toFixed(1)} s late, aur carrier down ho toh app "OTP sent" hi bolega. User screen par ruka hai — queue ke peeche mat rakho.` }
                    : { ok: false, text: `Sync hai, par ${m.success.toFixed(1)}% — har 100 mein ${Math.round(100 - m.success)} users ko Resend. Retries do.` },
            };
          },
          check: k => { const m = otpModel(k); return k.backlog >= 10 && m.arrive <= 3 && m.success >= 99 && m.toldTruth; },
          lesson: '✅ <b>OTP sync.</b> User jiske liye screen par ruka hai, woh kaam queue ke backlog ke peeche nahi hona chahiye — aur failure user ko turant pata chalna chahiye.',
          quiz: {
            q: 'Sync OTP mein 3 retries ka nuksaan?',
            choices: [
              'Carrier sach mein down ho toh user retries ke dauraan ~1-2 second zyada ruka — isliye retries kam aur backoff chhota',
              'Koi nuksaan nahi',
              'OTP 3 baar jaayega hamesha',
              'Queue lambi hogi',
            ],
            answer: 0,
            explain: 'Sync retries user ke intezaar mein judte hain. 2 retry ~99% deta hai — kaafi.',
          },
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — KhanaKart ke 5 flows',
          instructions: 'Har flow ke liye pattern chuno. Review mein har option ka "kyun" khulega.',
          brief: 'KhanaKart platform review. Har flow ki requirement alag hai.',
          requirements: ['OTP ≤ 3 s, failure par Resend', 'Instamart order: stock, rider, payment — teeno ya koi nahi', 'Naye teams bina order team ke intezaar ke features jod sakein'],
          slots: [
            {
              id: 'otp', label: 'Login OTP', icon: '🔐',
              options: [
                { id: 'orch', label: 'Orchestration — auth-service sync call + retry', score: 3, why: 'User ruka hai, failure turant pata, retry aasaan.' },
                { id: 'chor', label: 'Choreography — otp_requested event', score: -3, why: 'Backlog = login delay; consumer down = OTP gaya hi nahi aur "sent" dikhega.' },
              ],
            },
            {
              id: 'placed', label: 'Order placed → email, loyalty, dashboard, analytics', icon: '🧾',
              options: [
                { id: 'chor', label: 'Choreography — order_placed event', score: 3, why: 'Kai teams, naye features, isolation, delay chalega.' },
                { id: 'orch', label: 'Orchestration — order-service sabko call kare', score: -2, why: 'Order team gatekeeper, har naya feature PR.' },
              ],
            },
            {
              id: 'instamart', label: 'Instamart: stock hold + rider + payment', icon: '🛒',
              options: [
                { id: 'orch', label: 'Orchestration — saga coordinator + compensation', score: 3, why: 'Sab-ya-kuch-nahi, kram aur undo ek jagah.' },
                { id: 'chor', label: 'Choreography — events ki chain', score: -1, why: 'Ho sakta hai (choreographed saga), par undo chain bikhri aur debug mushkil — 10-minute SLA mein risky.' },
              ],
            },
            {
              id: 'recs', label: '"Aapke liye" recommendations', icon: '🍽️',
              options: [
                { id: 'orch', label: 'Recommendation-service menu ko sync call karke bhara jawab de', score: 3, why: 'Phone ka ek round trip, client halka.' },
                { id: 'client', label: 'Client sirf ids le, phir har dish alag fetch kare', score: -2, why: 'Mobile par 5 round trips, slow aur battery.' },
              ],
            },
            {
              id: 'rating', label: 'Restaurant rating badli → search index, "Top rated" badge', icon: '⭐',
              options: [
                { id: 'chor', label: 'Choreography — rating_updated event', score: 3, why: 'Kuch seconds delay chalega, search aur badge teams azaad.' },
                { id: 'orch', label: 'Review-service search aur badge ko sync call kare', score: -1, why: 'Chal jaayega, par review-service ko do teams ke API jaanne padenge aur search slow ho toh review likhna slow.' },
              ],
            },
          ],
          pass: 13,
          verdicts: {
            great: '🌟 Core aur user-blocking flows orchestrated, side-effects choreographed.',
            ok: '👍 Kareeb — laal slots ka reason padho.',
            bad: '😅 Ek hi pattern sab jagah — requirement dobara padho.',
          },
        },
        {
          type: 'bins',
          title: 'Kaunsa pattern?',
          instructions: 'Har flow ko sahi dabbe mein daalo.',
          bins: [{ id: 'orch', label: '🎼 Orchestration' }, { id: 'chor', label: '💃 Choreography' }],
          items: [
            { text: 'Wallet se paise kaat ke coupon lagao — dono ya koi nahi', bin: 'orch', explain: 'Sab-ya-kuch-nahi.' },
            { text: 'User ne profile photo badli → chat, reviews, rider app mein update', bin: 'chor', explain: 'Ek event, kai reactions, delay chalega.' },
            { text: 'Restaurant onboarding: KYC → FSSAI → bank verify → live', bin: 'orch', explain: 'Kram aur shartein, lamba workflow.' },
            { text: 'Order delivered → rating reminder, loyalty, analytics', bin: 'chor', explain: 'Side-effects.' },
            { text: 'Checkout page: cart + price + delivery ETA ek jawab mein', bin: 'orch', explain: 'User ruka hai, jawab bharna.' },
            { text: 'Menu item out of stock → search hide, cart warning, restaurant dashboard', bin: 'chor', explain: 'Kai teams react karein.' },
            { text: 'Refund: payment reverse → restaurant ka hissa kaato → user ko credit', bin: 'orch', explain: 'Kram + undo.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Decision — quick check',
          questions: [
            {
              q: 'Event-driven OTP mein carrier down ho toh app kya dikhata hai?',
              choices: ['"OTP sent" — kyunki auth-service ko sirf publish ka ack mila', '"Resend"', 'Error', 'Kuch nahi'],
              answer: 0,
              explain: 'Publisher ko kaam ka result pata nahi chalta.',
            },
            {
              q: 'Recommendation-service ka menu ko sync call karna kis pattern ka example hai?',
              choices: ['Orchestration — ek service doosri ko bula ke jawab jod rahi hai', 'Choreography', 'Pub/sub', 'Event sourcing'],
              answer: 0,
              explain: 'Service decide karti hai kise bulana hai aur kya jodna hai.',
            },
            {
              q: 'Ek flow mein "core steps orchestrated, side-effects choreographed" — example?',
              choices: ['Checkout: payment + restaurant accept orchestrated, phir order_placed event par email/loyalty', 'OTP event se, payment event se', 'Sab kuch orchestrator mein', 'Sab kuch events mein'],
              answer: 0,
              explain: 'Yahi KhanaKart ka final order flow hai.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — OTP: sync vs event, aur recommendations',
          project: '05-workflows',
          exercise: 'ex3-otp-and-recs',
          goal: 'OTP ko sync aur event dono tareeke se bhejo — normal aur carrier down. Phir mobile client se recommendations ke teen tareeke naapo.',
          steps: [
            { text: 'Sync mode.', cmd: 'MODE=sync npm start ex3-otp-and-recs\ncurl -X POST localhost:4721/login/otp\ncurl localhost:4722/inbox', expect: '{"status":"OTP sent","attempts":1,"waitedMs":~850}\n[{... "delayAfterLoginTapMs":~830}]' },
            { text: 'Ctrl+C. Event mode (6 s backlog). 8 second baad inbox.', cmd: 'MODE=event npm start ex3-otp-and-recs\ncurl -X POST localhost:4721/login/otp\ncurl localhost:4722/inbox', expect: '{"status":"OTP sent (shayad)","waitedMs":~40}\n[{... "delayAfterLoginTapMs":~6900}]' },
            { text: 'Ctrl+C. Carrier down — dono modes.', cmd: 'SMS_DOWN=1 MODE=sync npm start ex3-otp-and-recs\ncurl -X POST localhost:4721/login/otp\n# Ctrl+C\nSMS_DOWN=1 MODE=event npm start ex3-otp-and-recs\ncurl -X POST localhost:4721/login/otp', expect: 'sync: 502 "OTP nahi gaya — app \\"Resend\\" button dikhaye"\nevent: 202 "OTP sent (shayad)" — inbox khaali hi rahega' },
            { text: 'Recommendations — mobile client.', cmd: 'npm start ex3-otp-and-recs\nnpm run mobile', expect: 'A) 5 round trips, ~1,480 ms\nB) 5 round trips, ~550 ms\nC) 1 round trip, ~330 ms' },
          ],
          observe: {
            q: 'Carrier down par event mode ne 202 "OTP sent (shayad)" kyun diya?',
            choices: [
              'auth-service ne sirf event publish kiya — carrier ka result otp-worker ke paas hai, auth-service tak aata hi nahi',
              'Carrier theek tha',
              'Bug hai',
              'Broker ne OTP bheja',
            ],
            answer: 0,
            explain: 'services/auth-service.js event mode mein publish ke ack par hi jawab deta hai. OTP jaise user-blocking kaam mein yeh jhooth user ko login se rokta hai.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Pattern choice',
        instructions: 'Final design judgement. 🎤',
        questions: [
          {
            q: 'Interviewer: "Kya choreography hamesha orchestration se behtar hai?"',
            choices: [
              'Nahi — choreography side-effects aur team autonomy ke liye achha; orchestration sab-ya-kuch-nahi, user-blocking (OTP), aur response enrichment ke liye; ek system mein dono',
              'Haan, hamesha',
              'Nahi, orchestration hamesha behtar',
              'Dono same',
            ],
            answer: 0,
            explain: 'Requirement se chuno.',
          },
          {
            q: 'Interviewer: "Payment flow ke liye kaunsa pattern?"',
            choices: [
              'Payment capture orchestrated (sync, idempotency key, timeouts, compensation); payment_captured event par side-effects (receipt email, analytics) choreographed',
              'Sirf events',
              'Client khud sab services call kare',
              'Batch job raat mein',
            ],
            answer: 0,
            explain: 'Core orchestrate, side-effects choreograph.',
          },
          {
            q: 'Interviewer: "Choreographed saga kab theek hai?"',
            choices: [
              'Jab steps kam hon (2-3), compensation simple ho, aur teams alag hon; steps badhne par orchestrated saga zyada samajh mein aata hai',
              'Kabhi nahi',
              'Jab 15 steps hon',
              'Sirf payments ke liye',
            ],
            answer: 0,
            explain: 'Chhoti saga events se chal jaati hai; badi saga ko conductor chahiye.',
          },
        ],
      },
      success: [
        'Main orchestration ke teen strong use-cases (sab-ya-kuch-nahi, OTP, enrichment) bata sakta hoon',
        'Main kisi flow ke liye requirement aur SLA se pattern chun sakta hoon',
        'Main ek flow mein core steps orchestrate aur side-effects choreograph kar sakta hoon',
        'Main "sab events" rule ke khatre samjha sakta hoon',
      ],
      homework: '<p>Apne product ke 5 flows lo. Har flow ke liye chaar sawaal likho — user ruka hai? sab-ya-kuch-nahi? kitni teams react karengi? delay SLA kya hai? — aur pattern chuno. Ek flow jo aaj galat pattern mein hai, uska migration plan ek paragraph mein.</p>',
      cards: [
        { front: 'Orchestration ke 3 strong cases?', back: '<b>Sab-ya-kuch-nahi</b>, <b>user screen par ruka</b> (OTP), <b>jawab bharna</b> (recommendations).' },
        { front: 'OTP event se kyun nahi?', back: 'Backlog = login delay; consumer down = OTP gaya hi nahi; publisher "sent" bolta hai bina pata.' },
        { front: 'Mix ka rule?', back: '<b>Core aur user-blocking steps orchestrate</b>, side-effects choreograph.' },
        { front: 'Pattern kaise chunein?', back: 'Requirement + SLA se — fashion se nahi. Zindagi binary nahi.' },
      ],
    },
  ]);
})();
