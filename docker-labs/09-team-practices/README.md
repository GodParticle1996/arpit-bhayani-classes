# 🤝 KhanaKart Lab 09 — Team Practices: Data se Faisla, Badalta Architecture, Templates

App ke levels: **Conflicts aur Faisle**, **Badalta Architecture aur Tech Debt**, **Templates aur Business ka Saath**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

---

## ex1-data-decision — "REST ya gRPC?" bahas, data ke saath

Order team kehti hai "gRPC tez hai", delivery team kehti hai "REST simple hai". Dono services wahi kaam karti hain:
delivery-json (5101, HTTP/1.1 + JSON) aur delivery-bin (5102, HTTP/2 + binary codec, protobuf jaisa idea).

```bash
npm install
npm start ex1-data-decision
npm run bench
#   tareeka                   req bytes  res bytes  p50 ms  p99 ms  calls/s  client CPU ms
#   REST: HTTP/1.1 + JSON     210        45         ~4.8    ...
#   Binary: HTTP/2 + codec    38         10         ~5.0    ...
#   • Payload ~6× chhota   • Client CPU kuch kam   • p50 latency lagbhag barabar

# Ctrl+C — ab delivery ka asli kaam (rider dhoondhna 150 ms) jodo:
RIDER_SEARCH_MS=150 npm start ex1-data-decision
npm run bench 1000
#   p50 dono ~151 ms — farak 1% se bhi kam
```
**Dekho:** "gRPC hamesha tez" data par pura nahi utra — faayda payload aur CPU mein hai. Yahi table design meeting mein le jao: bahas opinion se nahi, numbers se.

---

## ex2-swap-store — architecture badle, business code nahi

orders-service sirf store interface (`put / get / listByUser`) jaanta hai. Do stores: `file` (purana, MySQL jaisa) aur `kv` (naya, DynamoDB jaisa).

### Step 1 — contract tests: naya store vaada poora karta hai?
```bash
npm run contract-test file       # 7/7
npm run contract-test kv         # 7/7
npm run contract-test kv-buggy   # 4/7 — "sabse naya pehle" toota; yeh store production mein nahi jaayega
```

### Step 2 — one-way door ko dheere-dheere paar karo
```bash
npm run seed                                   # purane store mein 300 orders
STORE=dual npm start ex2-swap-store            # dono mein likho, file se padho, kv se shadow-read compare
curl -X POST localhost:5111/v1/orders -H 'content-type: application/json' -d '{"userId":"u1"}'
curl "localhost:5111/v1/users/u1/orders?limit=5"
curl localhost:5111/migration                  # shadowCount chhota, mismatches > 0 (kv mein purana data nahi)

npm run backfill                               # file → kv copy + checksum verify ✅
curl -X POST localhost:5111/migration/reset-counters
curl "localhost:5111/v1/users/u2/orders?limit=5"; curl "localhost:5111/v1/users/u3/orders?limit=5"
curl localhost:5111/migration                  # mismatches 0 → ab switch karna surakshit

# Ctrl+C
STORE=kv npm start ex2-swap-store              # cutover — business code ki ek line nahi badli
curl "localhost:5111/v1/users/u2/orders?limit=3"
```
**Dekho:** abstraction (interface) + contract tests + dual write + backfill + shadow compare = ek bada one-way door, chhote reversible kadamon mein.

---

## ex3-template-drift — template, ADRs, aur badlaav ka democratic raasta

```bash
npm start ex3-template-drift      # koi service nahi — tools seedha
npm run drift
#   review    1.0.0  ❌ missing: grpc-internal, circuit-breaker, prometheus-metrics
#   delivery  1.2.0  ❌ missing: circuit-breaker  ↳ cascade risk (ADR-0002)
#   notification ❌ missing: redis-client (bina reason)
#   search    ✅ opt-out redis-client: "Elasticsearch ka request cache — RFC-0007 approved"
ls docs/adr                        # har template choice ka "kyun"
cat templates/CHANGELOG.md         # har badlaav ek RFC se
npm run rfc "Template mein OpenTelemetry tracing default"
```
**Dekho:** template zabardasti nahi — har choice ka ADR (kyun), reason ke saath opt-out, aur badlaav RFC + vote se. Drift report se pata chalta hai kaunsi service risk mein hai.
