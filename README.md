# 🎓 Arpit Bhayani Classes

**Designing Microservices — dry run karke, knobs ghuma ke, asli services chala ke.**
Arpit Bhayani ki "Designing Microservices" series (10 videos) ke concepts, Hinglish mein, ek hi company ki kahani ke saath: **KhanaKart** (food + Instamart delivery).

Har level ek asli jaisi problem se shuru hota hai ("Saturday lunch, SMS down, orders fail"), phir:

- 🔍 **Dry run** — step-by-step diagram par request ka safar, har step par sawaal
- 🎛️ **Live lab** — knobs ghumao, numbers badlo, verdict hara karo
- 🧩 quiz, bins, match, order, design canvas, architecture review
- 🐳 **Docker hands-on** — laptop par asli Node.js services, failure inject karke dekho
- 🎤 interview round, flashcards, "kab / kab nahi / kaise / red flags" playbook

---

## Chalao

Koi build nahi. Browser mein kholo:

```bash
xdg-open index.html       # ya file browser mein drag karo
node validate.js          # structure + har lab jeet ke dikhao + render + docker files
```

Docker labs (`docker-labs/NN-*`), har ek mein `README.md`:

```bash
cd docker-labs/04-sync-async
docker compose --profile ex2-cascade up --build    # Docker ke saath
npm install && npm start ex2-cascade               # ya bina Docker (Node.js 18+)
```

---

## Kya hai isme

**1 track · 33 levels · 196 stages · 89 interactive labs · 31 Docker exercises · 33 diagrams · 143 flashcards**

| Video | Levels | Docker project |
|---|---|---|
| 1. Scoping services | Boundary · Loose coupling · High cohesion | `01-scoping` — blast radius, direct DB read, shared code |
| 2. Timeouts | Timeout basics · Timeout handling (retries, idempotency) · Retry samajhdaari se | `02-timeouts` — slow dependency, double charge vs Idempotency-Key, async ingest |
| 3. Shared database | Shared DB · Chaar dard · Kab theek hai (guardrails) | `03-shared-db` — shared writes, 4 pains, replica + read-only + statement timeout |
| 4. Sync vs async | Sync call ka safar · Sync ke dard (cascade, breaker) · Async broker · Sync ya async | `04-sync-async` — blocking chain, cascade + circuit breaker, broker + DLQ |
| 5. Workflows | Orchestration · Choreography · Kaunsa kab | `05-workflows` — orchestrator + compensation, pub/sub + trace tool, OTP sync vs event |
| 6. Database per service | Apna DB (sahi DB chuno) · Faayde · Keemat (2PC vs saga) | `06-db-per-service` — LIKE vs index, JOIN vs graph, noisy neighbour, naive/saga/2PC |
| 7. API composition | Composer · Gateway ki taaqat (strangler) · Composition ki keemat | `07-api-composition` — phone vs composer, auth/rate-limit/reshape/strangler, OOMKilled + partial response |
| 8. Standards | Good service · Monitoring · Interfaces · Tolerance | `08-standards` — service kit + scorecard, trace se incident, API lint + cursor pagination, ration + kill switches |
| 9. Yaad rakhne wali baatein | Conflicts aur faisle · Badalta architecture + tech debt · Templates + business | `09-team-practices` — REST vs binary benchmark, contract tests + dual write + backfill, template drift + RFC |
| 10. Backend for Frontend | Ek endpoint teen clients · BFF pattern · BFF kab | `10-bff` — generic vs ?platform hack, per-client BFFs, duplication drift + extra hop |
| 👑 | **BOSS — KhanaKart Diwali Night** | (design canvas, readiness lab, war-room dry run, architecture review) |

Docker labs ke ports: `01` 4000–4303 · `02` 4401–4412 · `03` 4501–4504, 5432–5433 · `04` 4601–4621 · `05` 4701–4724 · `06` 4801–4822, 5500–5503 · `07` 4900–4923 · `08` 5001–5031 · `09` 5101–5111 · `10` 5201–5223.

> Docker labs **teaching simulations** hain (memory mein data, chhote Node services). Numbers har machine par thode alag aayenge — pattern wahi rahega. Saari exercises bina Docker ke `npm start <exercise>` se test ki gayi hain.

---

## Files

| File | Kaam |
|---|---|
| `index.html` | Script order (core → data → renderers → app) |
| `core.js` | State, XP, levels registry (`AB.registerLevels`) |
| `data-core.js` | Ranks, track, KhanaKart service catalog (`AB.kk.n`) |
| `data-ms-NN-*.js` | Har video ke levels + diagrams (IIFE) |
| `data-ms-boss.js` | Boss level (track mein aakhri) |
| `games.js` · `canvas.js` · `labs.js` | quiz/bins/match/order · design canvas · archdiff aur baaki labs |
| `mslabs.js` · `viz.js` | `dryrun`, `flowlab`, `docker` renderers · SVG service diagrams |
| `app.js` · `style.css` | Screens, intro (hook, steps, myth, playbook, source) |
| `validate.js` | Sab check — naya content daalne ke baad hamesha chalao |
| `docker-labs/` | 10 projects, har ek: `services/`, `tools/`, `start.js`, `docker-compose.yml`, `README.md` |

Naya content kaise daalein: [EXTENDING.md](EXTENDING.md).

Source: Arpit Bhayani — Designing Microservices (YouTube). App ke explanations, KhanaKart scenarios, labs aur code naye likhe gaye hain.
