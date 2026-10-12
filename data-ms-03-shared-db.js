/* =====================================================================
   Video 3 — Microservices mein database share karna: anti-pattern ya practical?
   Source concept: Arpit Bhayani — "Sharing Databases in Microservices:
   Anti-Pattern or Practical?" (youtube tV11trlimLk)
   Explanations, KhanaKart scenarios, labs aur Docker exercises naye likhe gaye hain.
   ✍️ Niyam: "yeh / woh / isse / uska" ki jagah naam dobara likho. Chhote vaakya.
   ===================================================================== */
(function () {
  const N = AB.kk.n;
  const SRC = { video: 'tV11trlimLk', title: 'Sharing Databases in Microservices: Anti-Pattern or Practical?' };

  function guardModel(k) {
    const p99 = k.replica ? 40 : (k.stmt ? 1400 : 2900);
    const deleteSafe = k.ro === 1;
    const schemaSafe = k.views === 1;
    const lag = k.replica ? 2 : 0;
    return { p99, deleteSafe, schemaSafe, lag };
  }

  VISUALS['ms-shared-db'] = {
    t: 'Do raaste: contract se likho, ya seedha shared DB mein',
    html: `
    <div class="dg-split">
      <div class="dg-col">
        <div class="dg-pill acc">🔌 API ke through</div>
        <div class="dg-flow"><div class="dg-node is-accent"><span class="ni">⭐</span><span class="nl">review</span></div><div class="dg-arrow flow"></div><div class="dg-node is-good"><span class="ni">🍳</span><span class="nl">restaurant API</span></div><div class="dg-arrow flow"></div><div class="dg-node"><span class="ni">🗄️</span><span class="nl">restaurants DB</span></div></div>
        <div class="dg-cap">Ek extra hop + restaurant team ka endpoint banne ka intezaar.</div>
      </div>
      <div class="dg-col">
        <div class="dg-pill gold">🗄️ Shared database</div>
        <div class="dg-flow"><div class="dg-node is-gold"><span class="ni">⭐</span><span class="nl">review</span></div><div class="dg-arrow flow"></div><div class="dg-node is-gold"><span class="ni">🗄️</span><span class="nl">restaurants DB</span><span class="ns">UPDATE avg_rating</span></div></div>
        <div class="dg-cap">Sabse aasaan, sabse tez — aaj.</div>
      </div>
    </div>`,
  };
  VISUALS['ms-shared-db-pain'] = {
    t: 'Shared DB ke 4 dard',
    html: `
    <div class="dg-split">
      <div class="dg-stack">
        <div class="dg-box is-bad"><span class="bx-label">1. Internals leak — schema badla, doosri team tooti (loose coupling gaya)</span></div>
        <div class="dg-box is-bad"><span class="bx-label">2. Business logic duplicate — "menu kaise padhein" 3 services mein (cohesion gaya)</span></div>
      </div>
      <div class="dg-stack">
        <div class="dg-box is-bad"><span class="bx-label">3. Corruption/deletion — kisi aur ki buggy script ne data mitaya</span></div>
        <div class="dg-box is-bad"><span class="bx-label">4. Abuse — bhari query ne sabko dheema kiya, rate limit ki jagah nahi</span></div>
      </div>
    </div>`,
  };
  VISUALS['ms-shared-db-when'] = {
    t: 'Share karna hai? Guardrails ke saath',
    html: `
    <div class="dg-flow">
      <div class="dg-node is-good"><span class="ni">🍳</span><span class="nl">restaurant</span><span class="ns">owner · rw</span></div>
      <div class="dg-node is-good"><span class="ni">🗄️</span><span class="nl">primary</span><span class="ns">views = contract</span></div>
      <div class="dg-arrow flow"></div>
      <div class="dg-node is-accent"><span class="ni">🗄️</span><span class="nl">read replica</span><span class="ns">lag ~2 s</span></div>
      <div class="dg-node is-gold"><span class="ni">📊</span><span class="nl">analytics</span><span class="ns">read-only user</span></div>
    </div>
    <div class="dg-cap">Chhoti team + stable schema + guardrails = shared DB practical hai.</div>`,
  };

  AB.registerLevels('microservices', [

    /* =================================================================
       LEVEL: Shared DB pattern
       ================================================================= */
    {
      id: 'ms-shared-db',
      icon: '🗄️',
      title: 'Shared Database — Sabse Aasaan Jod',
      badge: 'Database Darbaan',
      source: Object.assign({ at: 188 }, SRC),
      hook: {
        when: 'KhanaKart · 2019 · 8 engineers',
        title: 'Rating update ke liye 2 hafte ka intezaar, ya 2 din mein seedha DB?',
        text: 'KhanaKart abhi chhota startup hai. Review team ko har naye review ke baad restaurant ki average rating update karni hai. Rating <b>restaurants</b> table mein hai, jo restaurant team ki hai. Restaurant team 2 hafte busy hai — API endpoint nahi bana sakti. Review team ke paas database ka password hai. Ek UPDATE query, 2 din mein feature live. Galat hai? Hamesha nahi.',
      },
      objectives: [
        '<b>Shared database pattern</b> kya hai — API ke bajay seedha doosri service ke tables',
        'Shared DB ke <b>asli faayde</b>: aasaan, tez, kam hops, simple ops',
        'Kyun yeh pattern industry mein itna aam hai',
        'Faayde ke saath aane wala chhupa bill (agle level ka trailer)',
      ],
      steps: [
        {
          q: 'Shared database pattern kya hai?',
          analogy: 'Joint family ka ek fridge. Har koi apna doodh, sabzi, dahi usi fridge mein rakhta hai aur jab chahe nikaal leta hai. Kisi se poochhna nahi padta.',
          body: 'Do ya zyada services <b>ek hi database</b> se seedha padhti-likhti hain. Service A ko service B ka data chahiye → A, B ki API ko call nahi karti, B ke tables par seedha query chalati hai.',
          example: 'review-service naye review ke baad <code>UPDATE restaurants SET avg_rating = 4.6 WHERE id = 7</code> chalati hai — restaurants table restaurant-service ki hai.',
        },
        {
          q: 'Log yeh raasta kyun chunte hain? (asli faayde)',
          points: [
            '<b>Sabse aasaan integration</b> — koi naya endpoint, koi REST vs gRPC ki bahas nahi.',
            '<b>Koi extra network hop nahi</b> — review → DB seedha; API ke raaste mein ek hop aur ek service ka processing.',
            '<b>Tez development</b> — review team ko restaurant team ka intezaar nahi.',
            '<b>Simple operations</b> — beech wali API ke servers, scaling, connection pools manage nahi karne.',
            '<b>Performance</b> — kam hops = kam latency.',
          ],
          example: 'API raasta: restaurant team ka endpoint (2 hafte) + har rating update par ~8 ms extra hop. Shared DB raasta: 2 din, ~0 extra hop.',
        },
        {
          q: 'Kya shared DB hamesha anti-pattern hai?',
          body: 'Nahi. Har design ki taakat aur kamzori hoti hai. Agar kamzoriyon ke saath jee sakte ho toh taakat bahut badi hai. Bahut saari companies shared DB se shuru karti hain — aur kai jagah scale par bhi chalti hain jahan schema stable hai.',
          asli: 'Sawaal "shared DB achha hai ya bura" nahi hai. Sawaal hai: <b>is haalat mein</b> kaunsi kamzori jhelni padegi, aur kya team us kamzori ko sambhaal sakti hai?',
        },
        {
          q: 'Toh chhupa bill kya hai?',
          body: 'Fridge wali misaal yaad karo: koi bhi kisi ka dahi kha sakta hai, koi bhi shelf badal sakta hai, koi bhi galti se sab phenk sakta hai. Database mein yahi chaar dard bante hain — internals leak, duplicate logic, data corruption, aur ek service ki bhari query se sabki susti. Agla level chaaron ka dry run hai.',
        },
      ],
      myth: [
        { myth: 'Microservices mein shared database hamesha galat hai.', sach: 'Chhoti team, stable schema, aur read replica/permissions jaise guardrails ke saath shared DB practical hai. Kamzori jaano, phir chuno.' },
        { myth: 'Shared DB se performance hamesha behtar.', sach: 'Ek query ke liye hop kam hota hai. Par ek service ki bhari query sab services ko dheema kar sakti hai — overall performance kharab ho sakta hai.' },
      ],
      playbook: {
        title: 'shared DB pattern',
        use: [
          'Chhoti, ek-saath baithne wali team jahan coordination sasta hai',
          'Schema stable hai aur jaldi badalne wala nahi',
          'Speed abhi sabse zaroori hai (MVP, pilot, business abhi prove karna hai)',
        ],
        avoid: [
          'Alag-alag teams jo apni raftaar se deploy karna chahti hain',
          'Schema ko jaldi-jaldi badalna padta hai',
          'Kisi ek service ki bhari queries (analytics) baaki services ke saath same primary par',
        ],
        how: [
          'Har table ka ek maalik team likho, chahe DB shared ho',
          'Har service ka alag DB user — sirf zaroori permissions',
          'Bhari reads read replica par',
          'Doosri service ke liye tables ki jagah views ko "contract" banao',
        ],
        redflags: [
          'Kisi ko nahi pata kaunsi service kaunsa table likhti hai',
          'Schema migration se pehle 4 teams ki meeting',
          'Sab services ek hi superuser password use karti hain',
        ],
        rule: 'Shared DB ek shortcut hai — shortcut lo toh guardrails ke saath, aur bill jaan ke.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — do raaste, ek feature',
          goal: 'Rating update ko pehle API raaste se, phir shared DB raaste se chalao. Farak time aur intezaar mein dekho.',
          nodes: [
            N('review', 130, 250),
            N('restaurant', 470, 110),
            N('db', 800, 250, { label: 'restaurants DB' }),
            N('user', 470, 420, { id: 'team', icon: '👩‍💻', label: 'restaurant team' }),
          ],
          edges: [{ from: 'review', to: 'restaurant' }, { from: 'restaurant', to: 'db' }, { from: 'review', to: 'db', dashed: true }, { from: 'team', to: 'restaurant', dashed: true }],
          panels: [{ id: 'plan', title: 'Plan' }, { id: 'cost', title: 'Kharcha' }],
          steps: [
            {
              say: 'Naya review aaya: restaurant 7 ki rating 4.4 se 4.6 karni hai. <b>Raasta A (API):</b> review-service restaurant-service ko <code>POST /v1/restaurants/7/rating</code> bheje.',
              flows: [{ from: 'review', to: 'restaurant', label: 'POST /rating', tone: 'acc' }, { from: 'restaurant', to: 'db', label: 'UPDATE', tone: 'acc' }],
              nodes: { restaurant: { tone: 'slow', badge: 'endpoint abhi bana hi nahi' } },
              panels: { plan: ['Raasta A: API'], cost: ['? din'] },
            },
            {
              say: 'Endpoint banana restaurant team ka kaam hai. Restaurant team 2 hafte ek bade launch mein busy hai. Review feature <b>2 hafte</b> ruka.',
              nodes: { team: { tone: 'busy', badge: 'busy: 2 hafte' } },
              panels: { cost: ['intezaar: 2 hafte', 'har update: +1 hop (~8 ms)'] },
              ask: {
                q: 'Raasta A ka sabse bada kharcha is kahani mein kya hai?',
                choices: ['Doosri team ke kaam ka intezaar (coordination)', 'Database ka size', 'Rating galat calculate hona', 'User ka app crash'],
                answer: 0,
                explain: 'Contract raaste mein provider team ka kaam judta hai. Chhoti team mein yeh intezaar sabse mehenga hota hai.',
              },
            },
            {
              say: '<b>Raasta B (shared DB):</b> review-service ke paas DB password hai. Review team khud query likhti hai: <code>UPDATE restaurants SET avg_rating = 4.6 WHERE id = 7</code>.',
              flows: [{ from: 'review', to: 'db', label: 'UPDATE avg_rating', tone: 'ok' }],
              nodes: { review: { tone: 'ok', badge: '2 din mein live' }, db: { tone: 'ok', badge: 'avg_rating 4.6' }, restaurant: { tone: 'idle', badge: '' }, team: { tone: 'idle', badge: '' } },
              panels: { plan: ['Raasta B: shared DB'], cost: ['intezaar: 0', 'extra hop: 0', 'live: 2 din'] },
              ask: {
                q: 'Raasta B mein review team ko kya-kya jaanna pada?',
                choices: ['restaurants table ka naam, avg_rating column, aur rating kaise store hoti hai', 'Sirf restaurant-service ka URL', 'Kuch nahi', 'Restaurant team ka Slack channel'],
                answer: 0,
                explain: 'Speed ki keemat: review team ab restaurant team ke <b>internals</b> jaanti hai. Yahi agle level ka pehla dard banega.',
              },
            },
            {
              say: 'Result: feature 2 din mein live, tez, simple. Chhoti team ke liye yeh jeet hai. Par restaurant team ab <code>avg_rating</code> column ko akele nahi badal sakti — kyunki review team us column par depend karti hai.',
              nodes: { db: { tone: 'slow', badge: 'avg_rating ab 2 teams ka' } },
              panels: { cost: ['aaj: jeet ✅', 'kal: schema badalna = 2 teams ki meeting'] },
            },
          ],
          lesson: '<b>Asli baat:</b> shared DB aaj ka intezaar hataata hai aur kal ki azaadi le leta hai. Chhoti team ke liye aksar sahi sauda — bas bill yaad rakho.',
        },
        {
          type: 'bins',
          title: 'Shared DB — asli faayda ya bhram?',
          instructions: 'Har baat ko sahi dabbe mein daalo.',
          bins: [{ id: 'real', label: '✅ Asli faayda' }, { id: 'myth', label: '❌ Bhram / chhupa kharcha' }],
          items: [
            { text: 'Doosri team ke endpoint ka intezaar nahi', bin: 'real', explain: 'Seedha query — development tez.' },
            { text: 'Ek service ka hop kam, latency thodi kam', bin: 'real', explain: 'API raaste ka extra hop nahi.' },
            { text: 'Schema kabhi bhi akele badal sakte ho', bin: 'myth', explain: 'Ulta — ab har consumer ka code bhi badalna padega.' },
            { text: 'Beech ki API ke servers chalane ki zaroorat nahi', bin: 'real', explain: 'Ops simple.' },
            { text: 'Ek service ki bhari query baaki par asar nahi karti', bin: 'myth', explain: 'Same DB = same CPU, connections, locks — asar padta hai.' },
            { text: 'Koi galti se doosre ka data nahi mita sakta', bin: 'myth', explain: 'Write access hai toh mita sakta hai — jab tak permissions na lagao.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Shared DB — quick check',
          questions: [
            {
              q: 'KhanaKart ki 6 engineers wali Instamart pilot team mein shared DB kab sahi rahega?',
              choices: ['Jab speed zaroori hai, schema stable hai, aur team rozana saath coordinate karti hai', 'Jab 10 teams alag-alag raftaar se deploy karti hain', 'Jab schema har hafte badalta hai', 'Kabhi nahi'],
              answer: 0,
              explain: 'Shared DB ki kamzoriyan coordination aur schema change mein hain. Chhoti team aur stable schema mein woh kamzoriyan sasti hain.',
            },
            {
              q: 'Shared DB pattern mein "extra hop nahi" ka matlab?',
              choices: ['Service seedha DB se baat karti hai, beech mein owner service ki API nahi', 'Database network ke bina chalta hai', 'Sab services ek hi server par hain', 'Cache nahi lagta'],
              answer: 0,
              explain: 'API raaste mein review → restaurant-service → DB. Shared DB mein review → DB.',
            },
            {
              q: 'Shared DB lene ke baad restaurant team ki kaunsi azaadi gayi?',
              choices: ['restaurants table ka schema akele badalne ki', 'Code likhne ki', 'Deploy karne ki', 'Database backup lene ki'],
              answer: 0,
              explain: 'Consumer column par depend karta hai → column badla toh consumer tootega → ab coordination chahiye.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — seedha UPDATE vs contract',
          project: '03-shared-db',
          exercise: 'ex1-shared-write',
          goal: 'Review-service se rating update karo — pehle shared DB se, phir restaurant-service API se. Code bhi kholo.',
          steps: [
            { text: 'Install karo aur shared-write chalao.', cmd: 'cd arpitbhayaniclasses/docker-labs/03-shared-db\nnpm install\nnpm start ex1-shared-write' },
            { text: 'Review bhejo aur rating padho.', cmd: "curl -X POST localhost:4502/reviews -H 'content-type: application/json' -d '{\"restaurantId\":7,\"newAvg\":4.6}'\ncurl localhost:4501/v1/restaurants/7", expect: '{"ok":true,"via":"shared DB (seedha UPDATE)","updated":1,"tookMs":~40}\n{"id":7,...,"avgRating":4.6,...}' },
            { text: 'services/review-service.js kholo — "direct" mode ki query mein kaunsa table aur column hardcoded hai?', cmd: 'grep -n "avg_rating" services/review-service.js' },
            { text: 'Ctrl+C. Contract mode mein chalao aur same request bhejo.', cmd: "MODE=api npm start ex1-shared-write\ncurl -X POST localhost:4502/reviews -H 'content-type: application/json' -d '{\"restaurantId\":7,\"newAvg\":4.7}'", expect: '{"ok":true,"via":"restaurant-service API","updated":1,...}' },
          ],
          observe: {
            q: 'MODE=api mein review-service ko restaurants table ke baare mein kya jaanna pada?',
            choices: [
              'Kuch nahi — sirf POST /v1/restaurants/:id/rating ka contract; column ka naam restaurant-service ke andar hai',
              'Table aur column dono ka naam',
              'DB ka password',
              'DB ka pool size',
            ],
            answer: 0,
            explain: 'services/restaurant-service.js hi RATING column jaanti hai. Contract raasta thoda slow bana, par internals ek hi jagah band rahe.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Shared DB',
        instructions: '"Is it an anti-pattern?" — interviewer balanced jawab sunna chahta hai. 🎤',
        questions: [
          {
            q: 'Interviewer: "Microservices mein shared database anti-pattern hai?"',
            choices: [
              'Aksar long-term mein coupling badhata hai, par chhoti team, stable schema aur guardrails (per-service users, replicas, views) ke saath practical hai — trade-off jaan ke chunna chahiye',
              'Haan, kabhi use nahi karna chahiye',
              'Nahi, hamesha shared DB behtar hai',
              'Sirf NoSQL mein anti-pattern hai',
            ],
            answer: 0,
            explain: 'Black-and-white jawab kamzor lagta hai. Kab, kyun, aur kaise surakshit — teeno bolo.',
          },
          {
            q: 'Interviewer: "Shared DB ke kaunse faayde asli hain?"',
            choices: ['Simple integration, koi extra hop nahi, tez development, simple ops', 'Loose coupling', 'Independent schema evolution', 'Failure isolation'],
            answer: 0,
            explain: 'Baaki teen options shared DB ke faayde nahi, database-per-service ke hain.',
          },
          {
            q: 'Interviewer: "Startup mein shared DB se shuru kiya. Kab alag karna shuru karoge?"',
            choices: [
              'Jab schema changes teams ke beech coordination ka bottleneck banein, ek service ki load doosri ko dheema kare, ya incidents ek team se doosri mein failein',
              'Pehle din se',
              'Jab database 1 GB ka ho',
              'Kabhi nahi',
            ],
            answer: 0,
            explain: 'Alag karne ka signal dard hai — coordination, load interference, blast radius.',
          },
        ],
      },
      success: [
        'Main shared database pattern ko API raaste se compare kar sakta hoon',
        'Main shared DB ke asli faayde gina sakta hoon',
        'Main bata sakta hoon ki shared DB kab practical hai',
        'Main shared DB ka chhupa kharcha pehchaan sakta hoon',
      ],
      homework: '<p>Apne project ke database mein har table ke saath likho: kaun si services is table ko <b>padhti</b> hain, kaun si <b>likhti</b> hain. Jis table ko 2+ services likhti hain, us par star lagao — woh agle level ke dard ki pehli jagah hai.</p>',
      cards: [
        { front: 'Shared database pattern?', back: 'Do+ services <b>ek hi DB</b> se seedha padhti-likhti hain, owner ki API ke bajay.' },
        { front: 'Shared DB ke asli faayde?', back: 'Simple integration, <b>koi extra hop nahi</b>, tez development (intezaar nahi), simple ops.' },
        { front: 'Shared DB kab practical?', back: 'Chhoti team, <b>stable schema</b>, speed zaroori — aur guardrails ke saath.' },
        { front: 'Shared DB ka pehla chhupa bill?', back: 'Owner team <b>schema akele nahi badal sakti</b> — consumers internals par depend karte hain.' },
      ],
    },

    /* =================================================================
       LEVEL: Shared DB ke 4 dard
       ================================================================= */
    {
      id: 'ms-shared-db-pain',
      icon: '🩹',
      title: 'Shared DB ke 4 Dard — Ek Hafte ke Chaar Incidents',
      badge: 'Dard Pehchaanne Wala',
      source: Object.assign({ at: 390 }, SRC),
      hook: {
        when: 'KhanaKart · 2022 · ek bura hafta',
        title: 'Restaurants DB ab 4 services share karti hain — aur hafte mein 4 incidents',
        text: 'Teen saal mein restaurants database ko restaurant, review, recommendation aur analytics — chaar services seedha use karne lagi. Ek hi hafte mein: restaurant team ka column rename review writes tod gaya, recommendation purane tables se galat menu dikhane laga, analytics ki cleanup script ne 3,000 restaurants ke menu mita diye, aur Friday 8 PM ki bhari report ne checkout ko 3 second dheema kar diya.',
      },
      objectives: [
        'Dard 1: <b>internals leak</b> — schema change doosri teams todta hai (loose coupling toot-ti hai)',
        'Dard 2: <b>business logic duplicate</b> — "data kaise padhein" kai services mein (cohesion toot-ti hai)',
        'Dard 3: <b>data corruption/deletion</b> — kisi aur ki galti, tumhara data',
        'Dard 4: <b>abuse</b> — ek bhari query sabko dheema karti hai, aur SQL par rate limit ki jagah nahi',
      ],
      steps: [
        {
          q: 'Dard 1 — internals leak kaise hota hai?',
          body: 'Shared DB use karne wali har service ko owner ke <b>andar ki baatein</b> jaanni padti hain: table naam, columns, soft delete (<code>deleted = true</code>) ya hard delete, normalized hai ya nahi.',
          example: 'Restaurant team ne performance ke liye <code>avg_rating</code> ka naam <code>rating_avg</code> kiya aur sharding plan kiya. Review-service ki UPDATE query "column does not exist" dene lagi. Ab har schema change ke liye 4 teams ki meeting aur backward-compatible migration.',
          asli: 'Yeh seedha <b>loose coupling</b> ka tootna hai — Level "Loose Coupling" wala dard, bas database ke raaste.',
        },
        {
          q: 'Dard 2 — shared DB = shared business logic kaise?',
          body: 'Services ek dusre ko call nahi karti, sab DB padhti hain. Isliye "menu kaise banta hai" ka logic <b>har service mein copy</b> hota hai.',
          example: 'Menu page ke liye tables T1 (restaurants), T2 (menu_items), T3 (prices), T4 (availability) join hote hain. Restaurant team ne prices ko naye table T7 (city-wise prices) mein shift kiya. Restaurant-service update hui — par recommendation aur analytics abhi bhi T3 padh rahe hain → recommendation galat price dikha raha hai.',
          asli: 'Yeh <b>high cohesion</b> ka tootna hai — ek business rule kai jagah bikhra hai.',
        },
        {
          q: 'Dard 3 — data corruption/deletion kaise hota hai?',
          body: 'Shared DB mein aksar sab services ke paas <b>read + write</b> hota hai. Ek service ka bug ya galat script kisi aur ka data bigaad sakti hai.',
          example: 'Analytics team ki "purane test restaurants hatao" script mein WHERE condition galti se khaali reh gayi → <code>DELETE FROM menu_items</code> → 3,000 restaurants ke menu gaye. Nuksaan restaurant team aur users ka hua.',
          asli: 'Bachaav ke liye database-level <b>access control</b> sambhaalna padta hai: analytics sirf read, review sirf rating column. Yeh kaam API raaste mein owner service apne aap kar leti.',
        },
        {
          q: 'Dard 4 — shared DB ka abuse kaise hota hai?',
          body: 'Ek service ki bhari query (50 table join, poore mahine ka data) database ke CPU, connections aur locks kha jaati hai. <b>Baaki sab services</b> dheemi.',
          example: 'Friday 8 PM analytics ki monthly report → database ke 4 connection slots bhari queries ne pakde → checkout ki menu query ~3 second line mein.',
          asli: 'API raaste mein owner service rate limit ya queue laga sakti thi. <b>SQL query ko rate limit karne ki koi jagah nahi</b> — har service seedha DB tak pahunchti hai.',
        },
        {
          q: 'Chaaron dard ek line mein?',
          points: [
            'Dard 1 + 2: microservices ke do core niyam (loose coupling, high cohesion) toot-te hain.',
            'Dard 3 + 4: ek service ki galti ya load <b>sabka incident</b> ban jaata hai.',
          ],
        },
      ],
      myth: [
        { myth: 'Read-only access do toh shared DB ke saare dard khatam.', sach: 'Read-only se dard 3 (deletion) kam hota hai. Dard 1 (schema change), 2 (duplicate logic) aur 4 (bhari reads) read-only mein bhi rehte hain.' },
        { myth: 'Hum sab ek hi company hain, koi galti se data nahi mitayega.', sach: 'Incidents buri niyat se nahi, <b>galti</b> se hote hain — khaali WHERE, galat environment, purana script. Permissions galti ka blast radius chhota karti hain.' },
      ],
      playbook: {
        title: 'shared DB ke dard pehchaano',
        use: [
          'Har table ke readers/writers ki list aur owner team',
          'Schema migration se pehle consumers ki query logs dekho',
          'Bhari queries ka alag window ya replica',
        ],
        avoid: [
          'Sab services ke paas same superuser credentials',
          'Business logic (menu kaise banta hai) ko har consumer mein copy karna',
          'Monthly reports primary DB par peak hours mein',
        ],
        how: [
          'DB audit logs se pata karo kaun kya query karta hai',
          'Per-service DB users + least privilege',
          'Statement timeout + per-user connection limit',
          'Shared logic ko view ya owner API ke peeche le jao',
        ],
        redflags: [
          'Schema migration ke baad kisi aur team ka incident',
          'Ek report chalte hi checkout/order latency spike',
          '"Kisne yeh rows delete ki?" ka jawab kisi ke paas nahi',
        ],
        rule: 'Shared DB mein ek team ki galti ya load, har team ka incident hai.',
      },
      stages: [
        {
          type: 'dryrun',
          title: '🔍 Dry run — ek hafta, chaar incidents',
          goal: 'Har din ek dard. Dekho har incident kahan se shuru hua aur kisko laga.',
          nodes: [
            N('restaurant', 150, 110),
            N('review', 150, 400),
            N('db', 500, 250, { label: 'restaurants DB' }),
            N('coupon', 850, 110, { id: 'reco', icon: '✨', label: 'recommendation' }),
            N('analytics', 850, 400),
          ],
          edges: [{ from: 'restaurant', to: 'db' }, { from: 'review', to: 'db' }, { from: 'reco', to: 'db' }, { from: 'analytics', to: 'db' }],
          panels: [{ id: 'db', title: 'restaurants DB' }, { id: 'impact', title: 'Kisko laga' }],
          steps: [
            {
              clock: 'Monday',
              say: '<b>Dard 1.</b> Restaurant team ne <code>avg_rating</code> ka naam <code>rating_avg</code> kiya. Restaurant-service ka code saath mein update. Review-service ki hardcoded UPDATE query tooti.',
              flows: [{ from: 'restaurant', to: 'db', label: 'RENAME column', tone: 'acc' }, { from: 'review', to: 'db', label: 'UPDATE avg_rating ❌', tone: 'bad' }],
              nodes: { review: { tone: 'bad', badge: 'column does not exist' }, db: { tone: 'new', badge: 'rating_avg' } },
              panels: { db: ['restaurants.rating_avg (naya naam)'], impact: ['review team: ratings update band', 'users: purani ratings'] },
              ask: {
                q: 'Monday ka incident kiski galti hai?',
                choices: ['Design ki — review-service restaurant team ke internals (column naam) par depend karti thi', 'Restaurant team ki, unhe column nahi badalna chahiye tha', 'Review team ke tests ki', 'Database ki'],
                answer: 0,
                explain: 'Restaurant team ne apna hi table badla. Tootna design ki wajah se hua — internals leak.',
              },
            },
            {
              clock: 'Tuesday',
              say: '<b>Dard 2.</b> Restaurant team ne city-wise prices ke liye prices table T3 se T7 mein shift ki. Restaurant-service ka menu sahi. Recommendation abhi bhi T3 join karti hai → purani prices.',
              flows: [{ from: 'reco', to: 'db', label: 'JOIN T1,T2,T3,T4 (purana)', tone: 'slow' }, { from: 'restaurant', to: 'db', label: 'JOIN T1,T2,T7,T4', tone: 'ok' }],
              nodes: { review: { tone: 'idle', badge: '' }, reco: { tone: 'slow', badge: 'galat price ₹280 (asli ₹320)' }, restaurant: { tone: 'ok' } },
              panels: { impact: ['users: "aapne ₹280 dikhaya tha!"', 'support tickets +600'] },
              ask: {
                q: 'Tuesday ka dard microservices ke kaunse niyam ka tootna hai?',
                choices: ['High cohesion — "menu ki price kaise nikalein" ka logic kai services mein bikhra hai', 'Timeout', 'Idempotency', 'Horizontal scaling'],
                answer: 0,
                explain: 'Ek business rule, teen copies. Ek copy update hui, do reh gayi.',
              },
            },
            {
              clock: 'Wednesday',
              say: '<b>Dard 3.</b> Analytics ki cleanup script: irada "test restaurants ke menu hatao". WHERE khaali reh gaya. Analytics user ke paas write access tha.',
              flows: [{ from: 'analytics', to: 'db', label: 'DELETE FROM menu_items', tone: 'bad' }],
              nodes: { reco: { tone: 'idle', badge: '' }, analytics: { tone: 'bad', badge: 'buggy script' }, db: { tone: 'bad', badge: '3,000 menus gaye' }, restaurant: { tone: 'bad', badge: 'menu khaali' } },
              panels: { db: ['menu_items: 0 rows 😱'], impact: ['3,000 restaurants: menu gayab', 'backup se restore: 2 ghante'] },
              ask: {
                q: 'Kaunsa ek guardrail Wednesday ka incident rok deta?',
                choices: ['Analytics ka DB user read-only hota', 'Analytics par timeout', 'Restaurant-service ka retry', 'Bada database server'],
                answer: 0,
                explain: 'Least privilege: analytics ko menu mitane ki permission hi nahi honi chahiye thi.',
              },
            },
            {
              clock: 'Friday 8 PM',
              say: '<b>Dard 4.</b> Analytics ki monthly report — 4 bhari queries, har query 3 second. Database ke 4 connection slots bhar gaye. Checkout ki chhoti menu query line mein.',
              flows: [{ from: 'analytics', to: 'db', label: '4 × heavy report', tone: 'bad' }, { from: 'restaurant', to: 'db', label: 'menu query: 3 s wait', tone: 'slow' }],
              nodes: { analytics: { tone: 'busy', badge: 'report chal rahi' }, db: { tone: 'busy', badge: 'slots 4/4 busy' }, restaurant: { tone: 'slow', badge: 'checkout +3 s' } },
              panels: { db: ['busy slots: 4 / 4', 'queue: 180 queries'], impact: ['dinner peak par checkout dheema', 'cart abandonment +9%'] },
              ask: {
                q: 'Friday ko analytics ki queries ko rate limit kyun nahi kar paaye?',
                choices: ['Analytics seedha DB se baat karti hai — beech mein koi service nahi jo limit lagaye', 'Rate limiting sirf APIs ke liye illegal hai', 'Analytics bahut important hai', 'Database rate limit samajhta hai par off tha'],
                answer: 0,
                explain: 'API ke peeche owner service limit/queue laga sakti. Shared DB mein har client seedha andar hai.',
              },
            },
          ],
          lesson: '<b>Asli baat:</b> chaar din, chaar dard — aur har incident mein galti ek team ki, nuksaan kisi aur ka. Agla level batayega kab yeh jokhim uthana theek hai aur kaise kam karein.',
        },
        {
          type: 'archdiff',
          title: '🕵️ Design review — shared DB ke jokhim pakdo',
          brief: 'KhanaKart ka ek purana diagram. Kuch cheezein shared DB ke dard ko seedha dawat de rahi hain.',
          goal: 'Is setup mein <b>4</b> jokhim chhupe hain. Har galat box par click karo.',
          nodes: [
            { id: 'owner', label: '🍳 restaurant-service', sub: 'restaurants DB ki owner team', row: 0 },
            { id: 'superuser', label: '🔑 sab services', sub: 'ek hi superuser password: kk_admin', row: 0 },
            { id: 'review', label: '⭐ review-service', sub: 'UPDATE restaurants SET avg_rating ...', row: 1 },
            { id: 'report', label: '📊 analytics report', sub: 'primary DB par, Friday 8 PM', row: 1 },
            { id: 'replica', label: '🗄️ read replica', sub: 'restaurant search yahan se padhti hai', row: 1 },
            { id: 'recojoin', label: '✨ recommendation', sub: 'menu price ke liye T1+T2+T3+T4 join khud likha', row: 2 },
            { id: 'backup', label: '💾 nightly backup', sub: 'har raat snapshot, 7 din retention', row: 2 },
          ],
          flaws: [
            { id: 'superuser', why: 'Ek superuser password = koi bhi service kuch bhi mita sakti hai. Per-service users + least privilege chahiye.' },
            { id: 'review', why: 'Review-service column naam hardcode karti hai — owner ka schema change review ko todega.' },
            { id: 'report', why: 'Bhari report peak hours mein primary par — sab services dheemi. Replica ya off-peak window.' },
            { id: 'recojoin', why: 'Menu price ka business logic recommendation mein copy — owner ne tables badle toh galat price.' },
          ],
          fine: {
            owner: 'Owner team saaf likhi hai — yeh achhi baat hai.',
            replica: 'Search jaisi reads ko replica par bhejna primary ka bojh kam karta hai.',
            backup: 'Backup galti ke baad bachaata hai — zaroori hai (par galti rokta nahi).',
          },
          lesson: '<b>Asli baat:</b> superuser credentials (dard 3), hardcoded columns (dard 1), primary par reports (dard 4), copied joins (dard 2) — ek diagram mein chaaron.',
        },
        {
          type: 'match',
          title: 'Dard → sabse seedha bachaav',
          pairs: [
            { left: 'Dard 1: owner ka column rename consumer todta hai', right: 'Consumer ke liye view ya owner API ko contract banao', explain: 'View/API ke peeche owner tables badal sakta hai, contract same.' },
            { left: 'Dard 2: menu join logic 3 services mein copy', right: 'Logic ek jagah — owner service ki API ya ek shared view', explain: 'Ek rule, ek maalik.' },
            { left: 'Dard 3: analytics ki script ne menu mitaya', right: 'Per-service DB user, analytics read-only', explain: 'Permission hi nahi toh galti bhi nahi chalegi.' },
            { left: 'Dard 4: report ne checkout dheema kiya', right: 'Bhari reads read replica par + statement timeout', explain: 'Primary ka bojh alag, aur lamba query khud kat jaaye.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Chaar dard — quick check',
          questions: [
            {
              q: 'Kaunsa dard read-only access dene ke baad bhi rehta hai?',
              choices: ['Owner ke schema change se consumer ki query tootna', 'Analytics script se data delete hona', 'Consumer ka owner ke rows update karna', 'Kisi bhi table mein insert'],
              answer: 0,
              explain: 'Read-only query bhi column naam jaanti hai — rename par tootegi.',
            },
            {
              q: 'Shared DB mein "ek team ki galti, doosri team ka incident" kaunse do dard dikhate hain?',
              choices: ['Data deletion aur bhari query abuse', 'Timeout aur retry', 'Versioning aur pagination', 'Caching aur CDN'],
              answer: 0,
              explain: 'Deletion (dard 3) aur abuse (dard 4) ka blast radius poore DB tak hai.',
            },
            {
              q: 'Recommendation galat price dikha raha hai kyunki owner ne prices table badla. Asli root cause?',
              choices: ['Price nikaalne ka business logic recommendation mein copy tha', 'Recommendation ka cache', 'Network', 'Database slow'],
              answer: 0,
              explain: 'Duplicate business logic — cohesion ka tootna.',
            },
            {
              q: 'Monthly report primary DB par checkout dheema karti hai. Sabse seedha pehla fix?',
              choices: ['Report ko read replica par chalao', 'Checkout mein retries badhao', 'Report ko peak hours mein chalao', 'Database ka password badlo'],
              answer: 0,
              explain: 'Bhari reads primary se hatao — checkout ka primary bacha rahe.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — chaar dard khud dekho',
          project: '03-shared-db',
          exercise: 'ex2-four-pains',
          goal: 'Schema rename se review tooti, report se checkout dheema, cleanup se menu gayab — teeno khud chalao.',
          steps: [
            { text: 'Schema v2 (rename) ke saath chalao aur review bhejo.', cmd: "SCHEMA=v2 npm start ex2-four-pains\ncurl -X POST localhost:4502/reviews -H 'content-type: application/json' -d '{\"restaurantId\":7,\"newAvg\":4.6}'", expect: '{"ok":false,"via":"direct","error":"column \\"avg_rating\\" of relation \\"restaurants\\" does not exist",...}' },
            { text: 'Ctrl+C. v1 mein chalao, checkout ka normal time dekho.', cmd: 'npm start ex2-four-pains\ncurl localhost:4503/checkout/7', expect: '{"items":3,"dbWaitMs":0,"tookMs":~20}' },
            { text: 'Report background mein chalao aur turant checkout karo.', cmd: 'curl -X POST localhost:4504/jobs/report &\ncurl localhost:4503/checkout/7', expect: '{"items":3,"dbWaitMs":~2700,"tookMs":~2700}' },
            { text: 'Cleanup script chalao, phir checkout.', cmd: 'curl -X POST localhost:4504/jobs/cleanup\ncurl localhost:4503/checkout/7', expect: '{"ok":true,"deleted":150}\n{"items":0,...}' },
          ],
          observe: {
            q: 'Report chalte waqt checkout ka dbWaitMs ~2700 kyun hua jabki checkout ki query sirf 15 ms ki hai?',
            choices: [
              'DB ke 4 slots bhari report queries ne pakde the — checkout ki query slot khaali hone ka intezaar kar rahi thi',
              'Checkout ki query bhari thi',
              'Network slow tha',
              'Order-service mein bug hai',
            ],
            answer: 0,
            explain: 'services/db-server.js mein POOL=4 aur heavy query 3000 ms. Shared resource = shared susti.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Shared DB ke dard',
        instructions: 'Incident-style sawaal. 🎤',
        questions: [
          {
            q: 'Interviewer: "Schema migration ke baad doosri team ki service tooti. Postmortem mein root cause kya likhoge?"',
            choices: [
              'Consumer service owner ke tables par seedha depend karti thi (internals leak); contract (API/view) nahi tha aur consumers ki list nahi thi',
              'Migration karne wale engineer ki galti',
              'Tests kam the',
              'Database version purana tha',
            ],
            answer: 0,
            explain: 'Blameless postmortem design par focus karta hai.',
          },
          {
            q: 'Interviewer: "Shared DB par kisi ek client ko bhari queries se kaise rokoge?"',
            choices: [
              'Per-user connection limit aur statement timeout, bhari reads replica par, aur long-term owner API ke peeche le jaana',
              'Client ko email',
              'Database ka size badhana',
              'Sab queries band',
            ],
            answer: 0,
            explain: 'Short-term DB guardrails + long-term contract.',
          },
          {
            q: 'Interviewer: "Shared DB microservices ke kaunse core principles todta hai?"',
            choices: [
              'Loose coupling (schema internals leak) aur high cohesion (business logic duplicate)',
              'Idempotency aur caching',
              'Horizontal scaling aur sharding',
              'Koi nahi',
            ],
            answer: 0,
            explain: 'Video 1 ke dono niyam — yahan database ke raaste toot-te hain.',
          },
        ],
      },
      success: [
        'Main shared DB ke chaar dard naam aur misaal ke saath bata sakta hoon',
        'Main pehchaan sakta hoon kaunsa dard coupling aur kaunsa cohesion todta hai',
        'Main har dard ka seedha bachaav de sakta hoon',
        'Main shared DB incident ka root cause design mein dhoondh sakta hoon',
      ],
      homework: '<p>Apne DB ke audit/query logs (ya slow query log) mein ek hafte ki top 10 bhari queries nikaalo. Har query ke saath likho: kaunsi service, primary ya replica, aur us waqt kaunsi critical service same DB use kar rahi thi.</p>',
      cards: [
        { front: 'Shared DB ke 4 dard?', back: '1) Internals leak 2) Business logic duplicate 3) Corruption/deletion 4) Abuse (bhari query).' },
        { front: 'Dard 1 kaunsa niyam todta hai?', back: '<b>Loose coupling</b> — owner ka schema change consumer todta hai.' },
        { front: 'Dard 2 kaunsa niyam todta hai?', back: '<b>High cohesion</b> — ek business rule (jaise menu price) kai services mein copy.' },
        { front: 'SQL query ko rate limit kyun nahi kar sakte?', back: 'Har service <b>seedha DB</b> tak jaati hai — beech mein koi service nahi jo limit/queue lagaye.' },
        { front: 'Dard 3 ka seedha bachaav?', back: '<b>Per-service DB user + least privilege</b> (analytics read-only).' },
      ],
    },

    /* =================================================================
       LEVEL: Kab share karein + guardrails
       ================================================================= */
    {
      id: 'ms-shared-db-when',
      icon: '🛡️',
      title: 'Kab Share Karein, Kaise Surakshit Rakhein',
      badge: 'Guardrail Guru',
      source: Object.assign({ at: 1007 }, SRC),
      hook: {
        when: 'KhanaKart · Instamart pilot kickoff',
        title: '5 engineers, 6 hafte, grocery delivery — database per service se shuru karein?',
        text: 'KhanaKart grocery delivery ka pilot shuru kar raha hai: inventory, cart, delivery-slot — teen services, 5 engineers, 6 hafte. Architect bolta hai "microservices hain toh har service ka alag database". Tech lead bolta hai "abhi pata bhi nahi pilot chalega ya nahi". Dono sahi ho sakte hain. Faisla haalat se hoga.',
      },
      objectives: [
        'Shared DB ko black-and-white nahi, <b>haalat ke hisaab</b> se chunna',
        'Teen haalatein jahan shared DB sahi hai: chhoti team, stable schema, reads replica par',
        'Guardrails: <b>per-service users</b>, <b>read replica</b>, <b>statement timeout</b>, <b>views as contract</b>',
        'Shared DB se bahar nikalne ke signals',
      ],
      steps: [
        {
          q: 'Shared DB kab sahi chunaav hai?',
          points: [
            '<b>Chhoti, lean team</b> — business abhi prove karna hai; har service ke beech API banana samay ki barbaadi.',
            '<b>Schema kam badalta hai</b> — dard 1 aur 2 schema change se aate hain; badlaav hi nahi toh dard bhi kam.',
            '<b>Bhari reads replica par ja sakti hain</b> — dard 4 ka ilaaj.',
          ],
          asli: 'Chhoti team ke liye "best practice" nahi, "abhi ki zaroorat" chuno. Microservices ki poori vyavastha tab laao jab dard dikhe.',
        },
        {
          q: 'Read replica kaise madad karta hai?',
          analogy: 'Library ki ek hi kitaab ho toh sab usi ke liye line lagaate hain. Photocopy (replica) rakh do — padhne wale photocopy lein, asli kitaab likhne walon ke paas rahe. Photocopy kabhi-kabhi thodi purani hoti hai.',
          body: 'Primary database se ek <b>read replica</b> banao. Analytics ki bhari reads replica par. Primary sirf critical reads/writes (checkout, orders) sambhaale.',
          example: 'Friday report replica par → checkout ki query ~20 ms (primary khaali). Keemat: replica 1-2 second peeche (replication lag) — monthly report ke liye koi farak nahi.',
        },
        {
          q: 'Aur kaunse guardrails lagayein?',
          body: '<table><tr><th>Guardrail</th><th>Kaunsa dard rokta hai</th></tr>' +
            '<tr><td>Per-service DB user, least privilege (analytics read-only)</td><td>Dard 3 — galat delete/update</td></tr>' +
            '<tr><td>Statement timeout (jaise 5 s) + per-user connection limit</td><td>Dard 4 — bhari query ka bojh</td></tr>' +
            '<tr><td>Views (ya stored procedures) ko consumer ka contract banao</td><td>Dard 1 aur 2 — owner tables badle, view same</td></tr>' +
            '<tr><td>Har table ka owner + migration review mein consumers ki list</td><td>Dard 1 — surprise break</td></tr></table>',
        },
        {
          q: 'Shared DB se kab nikalna shuru karein?',
          points: [
            'Schema change ke liye har baar 3+ teams ka coordination',
            'Kisi ek service ki load ki wajah se doosri services ke incidents',
            'Teams alag raftaar se deploy aur scale karna chahti hain',
            'Compliance: kuch data (payments, PII) ko alag rakhna zaroori',
          ],
          asli: 'Bahut saare systems shared DB se shuru hote hain aur kai scale par bhi shared rehte hain jahan schema stable hai. Nikalna tab jab dard kharche se bada ho.',
        },
      ],
      myth: [
        { myth: 'Best practice follow karo — pehle din se database per service.', sach: 'Pilot jo 6 hafte baad band ho sakta hai, usme database-per-service ka kharcha (distributed transactions, sync, ops) aksar bekaar jaata hai. Guardrails ke saath shared DB tez raasta hai.' },
        { myth: 'Read replica = free performance.', sach: 'Replica peeche chalta hai (lag). Jis read ko "abhi ka sach" chahiye (payment status, stock) woh primary par hi jaaye.' },
      ],
      playbook: {
        title: 'shared DB guardrails',
        use: [
          'Pilot/MVP, chhoti team, stable schema',
          'Bhari/reporting reads ke liye read replica',
          'Consumers ke liye views ya owner API',
        ],
        avoid: [
          'Superuser credentials sab services mein',
          'Fresh data wali reads (payment status) replica par',
          'Bina owner ke tables',
        ],
        how: [
          'Har service ka DB user: GRANT sirf zaroori tables/columns',
          'Replica banao, analytics/report users sirf replica ke',
          'statement_timeout aur connection limit per user',
          'Consumer ke liye view: v_restaurant_ratings — owner tables badle toh view update',
          'Quarterly check: nikalne ke signals dikh rahe hain?',
        ],
        redflags: [
          'Replica lag minutes mein aur koi fresh read replica par',
          'Views ke peeche bhi consumers raw tables query kar rahe',
          'Guardrails "baad mein" ki list mein',
        ],
        rule: 'Shared DB chuno toh guardrails pehle din — aur nikalne ke signals par nazar rakho.',
      },
      stages: [
        {
          type: 'flowlab',
          title: '🎛️ Live lab — shared DB ko surakshit banao',
          goal: 'Friday 8 PM: analytics report chal rahi hai, cleanup script tayyar hai, aur restaurant team column rename karne wali hai. Guardrails on karke <b>checkout p99 ≤ 200 ms</b>, <b>delete blocked</b>, aur <b>schema change safe</b> karo.',
          scenario: 'Ek hi restaurants DB: checkout (order-service), review writes, analytics reports + scripts. Har guardrail ka kharcha bhi dikhega.',
          knobs: [
            { id: 'replica', label: 'Read replica (analytics reads)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
            { id: 'ro', label: 'Analytics DB user', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'read + write', 1: 'read-only' } },
            { id: 'stmt', label: 'Statement timeout 5 s', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'off', 1: 'on' } },
            { id: 'views', label: 'Consumers ke liye views (contract)', min: 0, max: 1, step: 1, value: 0, labels: { 0: 'raw tables', 1: 'views' } },
          ],
          nodes: [
            N('order', 150, 110), N('review', 150, 400),
            N('db', 500, 250, { id: 'primary', label: 'primary DB' }),
            N('db', 850, 110, { id: 'replica', label: 'read replica' }),
            N('analytics', 850, 400),
          ],
          edges: [{ from: 'order', to: 'primary' }, { from: 'review', to: 'primary' }, { from: 'primary', to: 'replica', dashed: true }, { from: 'analytics', to: 'primary' }, { from: 'analytics', to: 'replica' }],
          model: k => {
            const m = guardModel(k);
            const p99ok = m.p99 <= 200;
            return {
              nodes: {
                primary: { tone: p99ok ? 'ok' : 'busy', badge: p99ok ? 'sirf critical reads/writes' : 'report + checkout ek saath' },
                replica: { tone: k.replica ? 'ok' : 'idle', badge: k.replica ? `lag ~${m.lag} s` : 'off' },
                order: { tone: p99ok ? 'ok' : 'slow', badge: `checkout p99 ${m.p99} ms` },
                review: { tone: m.schemaSafe ? 'ok' : 'bad', badge: m.schemaSafe ? 'view se likhti hai' : 'column rename par tootegi' },
                analytics: { tone: m.deleteSafe ? 'ok' : 'bad', badge: m.deleteSafe ? 'read-only' : 'DELETE kar sakti hai' },
              },
              flows: [
                { from: 'order', to: 'primary', tone: p99ok ? 'ok' : 'slow', rate: 0.8 },
                { from: 'analytics', to: k.replica ? 'replica' : 'primary', label: 'monthly report', tone: k.replica ? 'ok' : 'bad', rate: 0.5 },
                { from: 'review', to: 'primary', label: m.schemaSafe ? 'v_restaurant_ratings' : 'avg_rating', tone: m.schemaSafe ? 'ok' : 'slow', rate: 0.4 },
              ],
              readouts: [
                { label: 'Checkout p99 (report ke waqt)', value: m.p99 + ' ms', tone: p99ok ? 'ok' : m.p99 < 2000 ? 'warn' : 'bad' },
                { label: 'Buggy cleanup script', value: m.deleteSafe ? 'blocked ✅' : '150 rows delete ❌', tone: m.deleteSafe ? 'ok' : 'bad' },
                { label: 'Column rename', value: m.schemaSafe ? 'safe (view same)' : 'review tootegi', tone: m.schemaSafe ? 'ok' : 'bad' },
                { label: 'Report data kitna purana', value: m.lag ? `~${m.lag} s` : 'fresh', tone: 'ok' },
              ],
              bars: [
                { label: 'Checkout latency', pct: Math.min(100, m.p99 / 30), text: m.p99 + ' ms', tone: p99ok ? 'ok' : 'bad' },
              ],
              verdict: p99ok && m.deleteSafe && m.schemaSafe
                ? { ok: true, text: 'Teeno incidents ruke. Shared DB, par guardrails ke saath.' + (k.stmt ? ' (Statement timeout bonus suraksha hai.)' : '') }
                : { ok: false, text: !p99ok ? (k.stmt ? 'Statement timeout se report ki queries kat-ti hain, par checkout abhi bhi primary par report ke saath line mein hai.' : 'Report primary par — checkout line mein.') : !m.deleteSafe ? 'Analytics abhi bhi DELETE kar sakti hai.' : 'Review raw column par depend karti hai — rename par tootegi.' },
            };
          },
          check: k => { const m = guardModel(k); return m.p99 <= 200 && m.deleteSafe && m.schemaSafe; },
          lesson: '✅ <b>Guardrails lag gaye.</b> Replica ne load (dard 4), read-only user ne deletion (dard 3), aur views ne schema coupling (dard 1) ka jokhim kaata.',
          quiz: {
            q: 'Statement timeout akele checkout ko 200 ms tak kyun nahi la paaya?',
            choices: [
              'Timeout lambi query ko 5 s par kaat-ta hai, par tab tak connection slots bhare rehte hain — load alag karne ke liye replica chahiye',
              'Statement timeout kaam hi nahi karta',
              'Checkout ki query bhari hai',
              'Replica aur timeout ek hi cheez hain',
            ],
            answer: 0,
            explain: 'Timeout "kitni der tak" bojh ko seemit karta hai; replica bojh ko "kahan" se hataata hai. Dono alag suraksha.',
          },
        },
        {
          type: 'design',
          title: '🏗️ Design canvas — Instamart pilot ki DB strategy',
          instructions: 'Pilot ke liye har slot chuno. Review mein har option ka trade-off.',
          brief: 'Instamart pilot: inventory, cart, delivery-slot services. 5 engineers, 6 hafte, business prove karna hai. Payments KhanaKart ki existing payment-service se.',
          requirements: ['6 hafte mein launch', 'Ek service ki galti se doosre ka data na mite', 'Pilot chala toh 6 mahine baad alag karna aasaan ho'],
          slots: [
            {
              id: 'start', label: 'Shuruaat', icon: '🗄️',
              options: [
                { id: 'shared', label: 'Ek shared Postgres, har service apne schema (namespace) mein', score: 3, why: 'Tez shuruaat, aur schema-wise alag rakhne se baad mein todna aasaan.' },
                { id: 'dbps', label: 'Pehle din se 3 alag databases', score: 0, why: 'Saaf boundary, par pilot ke liye distributed transactions aur ops ka kharcha jaldi aa jaata hai. Galat nahi, bas mehenga.' },
                { id: 'onebig', label: 'Ek hi schema, sab tables mix', score: -2, why: 'Tez hai, par baad mein alag karna bahut mushkil — koi owner saaf nahi.' },
              ],
            },
            {
              id: 'access', label: 'DB access', icon: '🔑',
              options: [
                { id: 'peruser', label: 'Har service ka DB user, sirf apne schema par write', score: 3, why: 'Galti ka blast radius apne schema tak.' },
                { id: 'super', label: 'Ek admin user sab ke liye', score: -3, why: 'Koi bhi kuch bhi mita sakta hai.' },
                { id: 'readall', label: 'Sab ko sab par read-write, bas careful rehna', score: -2, why: '"Careful rehna" guardrail nahi hai.' },
              ],
            },
            {
              id: 'cross', label: 'Cart ko inventory ka stock chahiye', icon: '🔗',
              options: [
                { id: 'view', label: 'Inventory ka view (v_available_stock) padho', score: 3, why: 'Contract jaisa — inventory tables badal sakti hai, view same.' },
                { id: 'api', label: 'Inventory API call', score: 2, why: 'Sabse saaf, par pilot mein endpoint banane ka kaam judta hai. Achha option.' },
                { id: 'raw', label: 'Inventory ke raw tables join', score: -2, why: 'Internals leak — inventory ka har change cart todega.' },
              ],
            },
            {
              id: 'reports', label: 'Business ki daily reports', icon: '📊',
              options: [
                { id: 'replica', label: 'Read replica par', score: 3, why: 'Primary safe, lag reports ke liye theek.' },
                { id: 'primary-night', label: 'Primary par raat 3 baje', score: 1, why: 'Chal sakta hai, par grocery delivery raat mein bhi chalti hai — risk rehta hai.' },
                { id: 'primary-peak', label: 'Primary par jab chaaho', score: -3, why: 'Peak par checkout dheema.' },
              ],
            },
          ],
          pass: 10,
          verdicts: {
            great: '🌟 Tez shuruaat, guardrails pehle din, aur baad mein todne ka raasta khula.',
            ok: '👍 Theek hai — laal slots ka "why" padho.',
            bad: '😅 Yeh setup ya toh pilot ko dheema karega ya incidents laayega.',
          },
        },
        {
          type: 'order',
          title: 'Shared DB ko surakshit banane ka kram',
          instructions: 'Existing shared DB par guardrails lagane ke steps sahi kram mein lagao.',
          steps: [
            { text: 'Har table ka owner likho aur DB logs se har table ke readers/writers ki list banao', explain: 'Pehle naksha — bina jaane permissions lagaoge toh kuch toot jaayega.' },
            { text: 'Har service ke liye alag DB user banao (abhi same permissions ke saath) aur services ko switch karo', explain: 'Pehle pehchaan alag karo, phir permissions ghatao.' },
            { text: 'Permissions ghatao: har user ko sirf zaroori tables/columns, analytics read-only', explain: 'Least privilege — logs se pata hai kise kya chahiye.' },
            { text: 'Read replica banao aur report/analytics users ko replica par bhejo', explain: 'Bhari reads primary se hatao.' },
            { text: 'Statement timeout aur per-user connection limits lagao', explain: 'Bachi hui bhari queries ka bojh seemit.' },
            { text: 'Cross-service reads ko views par le jao, raw table access band', explain: 'Ab owner schema badal sakta hai bina consumers tode.' },
          ],
        },
        {
          type: 'quiz',
          title: 'Guardrails — quick check',
          questions: [
            {
              q: 'Kaunsi read replica par NAHI jaani chahiye?',
              choices: ['Payment ho gaya ya nahi — checkout confirmation', 'Monthly revenue report', 'Top restaurants dashboard', 'Last week ke ratings trend'],
              answer: 0,
              explain: 'Replica peeche hota hai. Payment status "abhi ka sach" maangta hai → primary.',
            },
            {
              q: 'View ko "contract" banane ka faayda?',
              choices: ['Owner andar ke tables badal sakta hai aur view ka shape same rakh sakta hai', 'View tez hota hai', 'View data encrypt karta hai', 'View se replica nahi lagta'],
              answer: 0,
              explain: 'View database ke andar ka "API" hai.',
            },
            {
              q: 'Shared DB se nikalne ka sabse saaf signal?',
              choices: ['Har schema change ke liye kai teams ka coordination aur ek service ki load se doosri ke incidents', 'Database 10 GB ka ho gaya', 'Naya developer join hua', 'Cloud bill thoda badha'],
              answer: 0,
              explain: 'Nikalne ka signal dard hai — coordination aur interference.',
            },
          ],
        },
        {
          type: 'docker',
          title: '🐳 Hands-on — replica + read-only user',
          project: '03-shared-db',
          exercise: 'ex3-guardrails',
          goal: 'Guardrails ke saath wahi Friday dohraao: report replica par, cleanup blocked, checkout tez.',
          steps: [
            { text: 'Guardrails wali exercise chalao.', cmd: 'npm start ex3-guardrails', expect: 'db-primary  ... readonlyAnalytics=true\ndb-replica  ... readonlyAnalytics=true' },
            { text: 'Report background mein, turant checkout.', cmd: 'curl -X POST localhost:4504/jobs/report &\ncurl localhost:4503/checkout/7', expect: '{"items":3,"dbWaitMs":0,"tookMs":~20}' },
            { text: 'Cleanup script chalao.', cmd: 'curl -X POST localhost:4504/jobs/cleanup', expect: '{"ok":false,"blocked":"HTTP 403","body":{"error":"permission denied: analytics_svc cannot delete menu_items"}}' },
          ],
          observe: {
            q: 'ex3 mein checkout tez kyun raha?',
            choices: [
              'Report ki queries replica (port 5433) par gayi — primary ke slots checkout ke liye khaali the',
              'Report chali hi nahi',
              'Checkout ne cache use kiya',
              'Primary ke slots badh gaye',
            ],
            answer: 0,
            explain: 'services/analytics-jobs.js mein USE_REPLICA=1 → REPORT_DB replica. Report ke response mein "db":"replica" dikhega.',
          },
        },
      ],
      interview: {
        title: 'Interview Round — Pragmatic choices',
        instructions: 'Senior interviews mein "it depends" ko data se ground karna padta hai. 🎤',
        questions: [
          {
            q: 'Interviewer: "5 logon ki team, naya product. Database per service?"',
            choices: [
              'Shayad nahi — ek shared DB, service-wise schemas, per-service users, replica for reports; nikalne ke signals track karunga',
              'Haan, microservices hain toh zaroor',
              'Koi database nahi, sab cache mein',
              'Sirf NoSQL',
            ],
            answer: 0,
            explain: 'Pragmatic + future-proof: abhi tez, baad mein todna aasaan.',
          },
          {
            q: 'Interviewer: "Analytics team primary DB par reports chalati hai. Unhe rokoge kaise bina unka kaam roke?"',
            choices: [
              'Read replica/warehouse dunga, unke user ko wahan point karunga, primary par unka user read-only ya band, aur statement timeout',
              'Analytics band kar dunga',
              'Primary ka size 4x',
              'Reports sirf weekends par',
            ],
            answer: 0,
            explain: 'Alternative do, phir guardrail lagao.',
          },
          {
            q: 'Interviewer: "Read replica ka sabse bada gotcha?"',
            choices: ['Replication lag — fresh reads (read-your-writes) galat ho sakti hain', 'Replica mehenga hai', 'Replica par index nahi lagta', 'Replica sirf NoSQL mein hota hai'],
            answer: 0,
            explain: 'User ne rating di, replica se padha, purani dikhi — classic lag bug.',
          },
        ],
      },
      success: [
        'Main haalat dekh kar shared DB ya alag DB chun sakta hoon',
        'Main chaar guardrails aur unse rukne wale dard jod sakta hoon',
        'Main read replica ka faayda aur lag ka gotcha samjha sakta hoon',
        'Main shared DB se nikalne ke signals pehchaan sakta hoon',
      ],
      homework: '<p>Apne DB users ki list nikaalo (<code>\\du</code> Postgres mein, ya <code>SELECT user FROM mysql.user</code>). Kitni services ek hi user share karti hain? Har service ke liye ek line likho: kaunse tables par read, kaunse par write chahiye. Yahi tumhara least-privilege plan hai.</p>',
      cards: [
        { front: 'Shared DB kab theek?', back: '<b>Chhoti team</b>, <b>stable schema</b>, bhari reads <b>replica</b> par ja sakti hain.' },
        { front: '4 guardrails aur unke dard?', back: 'Per-service user (deletion) · replica (bhari reads) · statement timeout + conn limit (abuse) · views as contract (schema/logic).' },
        { front: 'Read replica ka gotcha?', back: '<b>Replication lag</b> — fresh data (payment status, read-your-writes) primary se padho.' },
        { front: 'Shared DB se nikalne ke signals?', back: 'Har schema change par kai teams, ek service ki load se doosri ke incidents, alag scale/deploy zaroorat, compliance.' },
      ],
    },
  ]);
})();
