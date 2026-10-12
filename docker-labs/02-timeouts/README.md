# ⏱️ KhanaKart Lab 02 — Timeouts, retries, idempotency, async ingest

App ke levels: **Timeout: Kitna Intezaar?**, **Timeout ke Baad Kya?**, **Retry Samajhdaari se + Design Badlo**.

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install` (ek baar), phir `npm start <exercise>` |
| env: `SLOW_MS=8000 docker compose --profile ex1-timeout up` | env: `SLOW_MS=8000 npm start ex1-timeout` |

> Windows PowerShell: `$env:SLOW_MS="8000"; npm start ex1-timeout`

---

## ex1-timeout — slow analytics, search kitna intezaar kare?

**Scenario:** IPL final ki raat. search-service har search par analytics-service se "aaj kitne orders" count maangti hai. Analytics ka DB slow hai (8 second).

### Part A — koi timeout nahi
```bash
SLOW_MS=8000 TIMEOUT_MS=0 npm start ex1-timeout
curl localhost:4402/search          # 8+ second tak kuch nahi aata
curl localhost:4402/stats           # doosre terminal mein: waitingOnAnalytics badhta hai
```

### Part B — 300 ms timeout + fallback
```bash
SLOW_MS=8000 TIMEOUT_MS=300 FALLBACK=1 npm start ex1-timeout
curl localhost:4402/search          # ~300 ms mein results, "degraded": true, ordersToday: null
```

### Part C — timeout bahut chhota (false alarm)
```bash
SLOW_MS=60 TIMEOUT_MS=40 FALLBACK=1 npm start ex1-timeout
curl localhost:4402/search          # analytics theek hai (60 ms) phir bhi har baar degraded!
```

**Dekho:** timeout na ho toh ek slow service caller ko bhi rok deti hai. Timeout bahut chhota ho toh healthy service bhi "fail" dikhti hai.

---

## ex2-idempotency — retry ne ₹450 do-teen baar kaat liye

**Scenario:** payment-service bank ko ₹450 debit bhejti hai. Bank paisa kaat leta hai par jawab 1.5 second mein bhejta hai. payment-service ka timeout 1 second hai aur woh 2 baar retry karti hai.

```bash
DELAY_MS=1500 TIMEOUT_MS=1000 RETRIES=2 USE_KEY=0 npm start ex2-idempotency
curl -X POST localhost:4412/pay -H 'content-type: application/json' -d '{"amount":450}'
curl localhost:4411/statement      # balance 3650 — ₹450 TEEN baar kate!

# Ctrl+C, ab idempotency key ke saath:
DELAY_MS=1500 TIMEOUT_MS=1000 RETRIES=2 USE_KEY=1 npm start ex2-idempotency
curl -X POST localhost:4412/pay -H 'content-type: application/json' -d '{"amount":450}'
curl localhost:4411/statement      # balance 4550 — sirf ek debit
```

**Dekho:** timeout ka matlab "fail" nahi, "pata nahi" hota hai. Paisa jaisi non-idempotent request par retry tabhi safe hai jab har attempt same Idempotency-Key bheje.

---

## ex3-async-ingest — search ko analytics par depend hi mat karne do

**Scenario:** analytics khud har 3 second mein counts search ko bhejti hai. search-async apni copy se jawab deti hai — analytics ko call hi nahi karti.

Do terminal kholo:
```bash
# terminal 1
node services/search-async.js
# terminal 2
PUSH_TO_SEARCH=1 node services/analytics-service.js
# terminal 3
curl localhost:4403/search         # ordersToday numbers, countsAgeSeconds chhota
# terminal 2 mein Ctrl+C (analytics band)
curl localhost:4403/search         # results + counts abhi bhi aate hain, countsAgeSeconds badhta hai
```
Docker: `docker compose --profile ex3-async-ingest up --build`, phir `docker compose stop analytics-pusher`.

**Dekho:** analytics band ho gayi, search chalti rahi — bas counts thode purane (stale) ho gaye. Sync dependency hata di = timeout ki problem hi khatam.
