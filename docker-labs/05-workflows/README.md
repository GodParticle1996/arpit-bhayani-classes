# 🎼 KhanaKart Lab 05 — Orchestration, Choreography, aur dono ka mix

App ke levels: **Orchestration: Ek Conductor**, **Choreography: Har Service ka Apna Dimaag**, **Orchestration ya Choreography?**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

Env variables (jaise `NOTIF_DOWN=1`) dono tareeqon mein command se pehle lagao.

---

## ex1-orchestrator — ek jagah poora workflow

`orchestrator` (4701) order ka poora workflow chalata hai:
1. restaurant accept (zaroori) — mana kiya toh rider assign nahi hoga
2. notification (optional) **aur** delivery (zaroori) ek saath
3. rider nahi mila → restaurant ko **undo** (compensation)
4. `ADD_LOYALTY=1` → loyalty step bhi

```bash
npm start ex1-orchestrator
curl -X POST localhost:4701/orders
#   {"state":"COMPLETED","totalMs":~950,"steps":[restaurant ~300, notification ~400, delivery ~600]}
curl -X POST localhost:4701/orders -H 'content-type: application/json' -d '{"restaurantOpen":false}'
#   {"state":"REJECTED", steps: sirf restaurant}
curl localhost:4701/workflows            # saare orders ki state EK jagah
```

Ab gadbad karo (har baar Ctrl+C karke):
```bash
RIDER_FAIL_FIRST=2 npm start ex1-orchestrator                   # rider pehli 2 baar fail
curl -X POST localhost:4701/orders       # "CANCELLED_NO_RIDER" + restaurant "compensated"
curl localhost:4702/log                  # restaurant ke paas "do" aur phir "undo"

RIDER_FAIL_FIRST=2 RIDER_RETRIES=2 npm start ex1-orchestrator   # orchestrator retry karta hai
curl -X POST localhost:4701/orders       # "COMPLETED", delivery "attempts":3, ~2.4 s

NOTIF_DOWN=1 ADD_LOYALTY=1 npm start ex1-orchestrator
curl -X POST localhost:4701/orders       # notification "failed" + note "optional step", order COMPLETED, loyalty step bhi
```
**Dekho:** har faisla (ruko / retry / undo / aage badho) `services/orchestrator.js` mein hai. Step services "dumb" hain. Naya step (loyalty) = orchestrator badlo aur restart.

---

## ex2-choreography — event publish karo, sab apna decide karein

`order-chor` (4711) sirf `order_placed` event `pubsub` (4710) par daalta hai. Subscribers: notification (4712), restaurant (4713), delivery (4714).

```bash
NOTIF_DOWN=1 RESTAURANT_BUG=1 npm start ex2-choreography
curl -X POST localhost:4711/orders       # ~10 ms, "event 3 subscribers ko gaya"
```

**Naya subscriber — order-service ko chhue bina** (doosre terminal):
```bash
npm run sub loyalty 4715                 # Docker: docker compose --profile ex2-add-loyalty up -d
curl -X POST localhost:4711/orders       # "event 4 subscribers ko gaya", traceId note karo
```

**Observability — "event gaya? sabko mila? sabne kaam kiya?"**
```bash
npm run trace <traceId>
#   restaurant    ✅ acked                 ❌ koi record nahi      ← ack kiya par kaam nahi (bug)
#   delivery      ✅ acked                 ✅ rider Ramesh assign kiya
#   notification  📦 queue mein pending    ❌ koi record nahi      ← down hai, events ruke hue
#   loyalty       ✅ acked                 ✅ +20 loyalty points jode
curl localhost:4710/stats                # notification ki depth badh rahi hai, baaki 0
curl -X POST localhost:4712/resume       # notification wapas — backlog utha leta hai
curl localhost:4712/seen
```
**Dekho:** notification down hone se restaurant/delivery nahi ruke. Par "kya hua?" jaanne ke liye trace id + har subscriber ka record chahiye — broker ka "acked" kaafi nahi.

---

## ex3-otp-and-recs — kab orchestration (sync) hi sahi hai

### Part A — Login OTP
```bash
MODE=sync npm start ex3-otp-and-recs
curl -X POST localhost:4721/login/otp    # ~850 ms, "OTP sent"
curl localhost:4722/inbox                # delayAfterLoginTapMs ~830

MODE=event npm start ex3-otp-and-recs    # otp-worker ke aage 6 s ka backlog (BACKLOG_MS)
curl -X POST localhost:4721/login/otp    # ~40 ms, "OTP sent (shayad)"
curl localhost:4722/inbox                # [] ... 7 s baad: delayAfterLoginTapMs ~6900

SMS_DOWN=1 MODE=sync npm start ex3-otp-and-recs
curl -X POST localhost:4721/login/otp    # 502 "Resend button dikhaye" — user ko sach pata hai
SMS_DOWN=1 MODE=event npm start ex3-otp-and-recs
curl -X POST localhost:4721/login/otp    # 202 "OTP sent (shayad)" — aur OTP kabhi nahi aata
```

### Part B — Recommendations bhar ke do
```bash
npm start ex3-otp-and-recs
npm run mobile                           # 4G phone (250 ms har round trip)
#   A) sirf ids, phir har dish alag:   5 round trips, ~1,480 ms
#   B) sirf ids, dishes parallel:      5 round trips, ~550 ms
#   C) server ne sync call karke bhara: 1 round trip, ~330 ms
```
**Dekho:** OTP ka user screen par ruka hai — sync call tez bhi hai aur failure seedha batati hai. Recommendations mein server-side sync enrichment phone ka bojh aur round trips ghatata hai.
