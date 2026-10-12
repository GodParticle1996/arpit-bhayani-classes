# 📨 KhanaKart Lab 04 — Sync chain, cascading failure, message broker

App ke levels: **Sync Call ka Safar**, **Sync ke Dard**, **Async: Broker ke Saath**, **Sync ya Async?**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

---

## ex1-sync-chain — user har hop ka intezaar karta hai

order-service order place karte waqt restaurant (300 ms) → delivery (600 ms) → notification (400 ms) ko **ek ke baad ek** call karti hai.

```bash
npm start ex1-sync-chain
curl -X POST localhost:4601/orders
#   {"status":"placed","userWaitedMs":~1400,"steps":["restaurant 3xxms","delivery 6xxms","notification 4xxms"]}

# Ctrl+C — ab notification-service "hang" hai:
NOTIF_DOWN=1 npm start ex1-sync-chain
curl -X POST localhost:4601/orders
#   {"status":"FAILED","reason":"timeout after 3000 ms","userWaitedMs":~3900,...}
```
**Dekho:** latency har hop par judti hai. Aur sirf SMS na jaane ki wajah se poora order fail — kyunki notification bhi sync chain ka hissa hai.

---

## ex2-cascade — ek dead service, poori chain phansi

Chain: gateway (4611) → order (4612) → pricing (4613) → tax (4614). Tax "hang" hai.

### Part A — lamba timeout, koi breaker nahi
```bash
TAX_DOWN=1 TIMEOUT_MS=4000 npm start ex2-cascade
# doosre terminal: 12 requests ek saath
for i in $(seq 1 12); do curl -s -X POST localhost:4611/work > /dev/null & done
curl localhost:4611/stats ; curl localhost:4612/stats ; curl localhost:4613/stats
#   teeno services mein "inflight":12 — sab phanse hue!
```

### Part B — chhota timeout + circuit breaker (pricing mein)
```bash
TAX_DOWN=1 TIMEOUT_MS=1000 BREAKER=1 npm start ex2-cascade
for i in $(seq 1 12); do curl -s -X POST localhost:4611/work > /dev/null & done
curl localhost:4613/stats                          # "breaker":"OPEN"
curl -X POST localhost:4611/work                   # ~15 ms, "fallback":"tax estimate 5% ..."
```
Log mein dekho: `🔴 breaker OPEN` → 10 second baad `🟡 HALF_OPEN` (ek trial) → tax abhi bhi down toh phir OPEN.

**Dekho:** breaker khula hone par pricing tax ko call hi nahi karti — turant fallback. Gateway aur order ke threads phanste nahi.
Timeout budget bhi dekho (`services/chain.js`): gateway 8 s > order 7 s > pricing ka tax call 1 s.

---

## ex3-broker — surge, retries, dead letter queue

`broker.js` ek chhota in-memory broker hai (RabbitMQ/SQS jaisa bartaav: publish → ack, consume → ack/nack, 3 attempts ke baad DLQ).

```bash
# Part A — async: 200 orders ek saath
npm start ex3-broker
npm run burst 200                          # {"orders":200,"failed":0,"p50Ms":~400,"p99Ms":~450}
curl localhost:4620/stats                  # depth: ~190 — workers dheere-dheere emails bhej rahe hain

# Part B — sync: wahi burst, email provider ka intezaar (max 10 ek saath)
SYNC_NOTIFY=1 npm start ex3-broker
npm run burst 200                          # p50 ~4500 ms, p99 ~8000 ms

# Part C — email provider down → retry → DLQ
EMAIL_DOWN=1 npm start ex3-broker
curl -X POST localhost:4621/orders
curl localhost:4620/stats                  # ~5 s baad "dlq":1
curl localhost:4620/dlq

# Bonus — zyada consumers, queue jaldi khaali
WORKERS=10 npm start ex3-broker ; npm run burst 200 ; curl localhost:4620/stats
```
**Dekho:** async mein user ka intezaar surge se nahi badalta — sirf queue lambi hoti hai. Sync mein surge seedha user ki latency ban jaata hai.
