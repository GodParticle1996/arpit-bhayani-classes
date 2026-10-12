# 🗄️ KhanaKart Lab 03 — Shared database: faayde, 4 dard, guardrails

App ke levels: **Shared Database — Sabse Aasaan Jod**, **Shared DB ke 4 Dard**, **Kab Share Karein, Kaise Bachayein**.

Is lab ka database `services/db-server.js` ek chhota **teaching database** hai (Node.js mein). Asli Postgres nahi hai, par asli jaisa bartaav karta hai: DB users aur permissions, 4 connection slots (bhari query slot pakad ke rakhti hai), schema v1/v2, aur read replica.

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

---

## ex1-shared-write — review-service seedha restaurants table mein likhti hai

```bash
npm start ex1-shared-write
curl -X POST localhost:4502/reviews -H 'content-type: application/json' -d '{"restaurantId":7,"newAvg":4.6}'
curl localhost:4501/v1/restaurants/7          # avgRating 4.6
```
**Dekho:** kaam ho gaya, ~40 ms, koi extra API nahi, restaurant team ka intezaar nahi. Yahi shared DB ka lalach hai.

Same kaam contract se: `MODE=api npm start ex1-shared-write` — ab review-service restaurant-service ki API call karti hai.

---

## ex2-four-pains — shared DB ke dard, ek-ek karke

```bash
# Dard 1: restaurant team ne column ka naam badla (avg_rating → rating_avg)
SCHEMA=v2 npm start ex2-four-pains
curl -X POST localhost:4502/reviews -H 'content-type: application/json' -d '{"restaurantId":7,"newAvg":4.6}'
#   ❌ column "avg_rating" of relation "restaurants" does not exist
MODE=api SCHEMA=v2 npm start ex2-four-pains     # contract wala raasta chalta hai ✅

# Dard 3 + 4: bhari query aur buggy script (SCHEMA v1 ke saath)
npm start ex2-four-pains
curl localhost:4503/checkout/7                  # tookMs ~20
curl -X POST localhost:4504/jobs/report &       # analytics ki 4 bhari queries (background)
curl localhost:4503/checkout/7                  # tookMs ~2700 — checkout line mein!
curl -X POST localhost:4504/jobs/cleanup        # {"deleted":150} — SAARE menu items gaye
curl localhost:4503/checkout/7                  # {"items":0}
```
**Dekho:** analytics ki galti ne order-service aur users ko nuksaan pahunchaya. SQL query ko rate limit karne ki koi jagah nahi thi.

(Dard 2 — duplicate business logic — code padh ke dekho: `restaurant-service.js` aur `review-service.js` dono restaurants table ki shakl jaante hain.)

---

## ex3-guardrails — share karna hai toh surakshit share karo

```bash
npm start ex3-guardrails
curl -X POST localhost:4504/jobs/report &       # report ab REPLICA par
curl localhost:4503/checkout/7                  # tookMs ~20 — primary par bheed nahi
curl -X POST localhost:4504/jobs/cleanup        # ❌ 403 permission denied — analytics_svc read-only
```
**Dekho:** do guardrails — read replica aur least-privilege DB user — ne dono incidents rok diye.
