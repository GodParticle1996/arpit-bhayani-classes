# 🧩 KhanaKart Lab 07 — API Composition

App ke levels: **API Composition: Ek Call, Kai Services**, **Gateway ki Taaqat**, **Composition ki Keemat**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

---

## ex1-composer — "Order details" page: phone 4 calls kare ya gateway 1?

Services: order (4901, 120 ms), payment (4902, 150 ms), delivery tracking (4903, 200 ms), restaurant (4904, 100 ms). Tracking ko `riderId` chahiye jo order se aata hai.

```bash
npm install
npm start ex1-composer
npm run phone                              # 4G phone, har round trip 250 ms
#   A) Phone khud 4 services ko (ek ke baad ek)   ~1,630 ms · 4 round trips
#   B) Phone khud: order, phir baaki 3 ek saath   ~830 ms  · 4 round trips
#   C) Gateway composer, sequential               ~880 ms  · 1 round trip
#   D) Gateway composer, parallel                 ~580 ms  · 1 round trip

curl "localhost:4900/order-details/O-501?plan=parallel"
#   "_composer":{"timeline":["order 0→123 ms","restaurant 124→228 ms","payment 124→276 ms","tracking 124→327 ms"]}
```
**Dekho:** order pehle (riderId ke bina tracking nahi ho sakta), baaki teen ek saath. Phone ko ab sirf ek address aur ek response shape pata hai.

---

## ex2-gateway-powers — auth, rate limit, reshape, cache, strangler

```bash
npm start ex2-gateway-powers
curl -i localhost:4910/payments/O-501                                   # 401 — key nahi
curl -i -H 'x-api-key: app-android-123' localhost:4910/payments/O-501   # x-served-by: monolith (reshaped)
#   {"orderId":"O-501","status":"PAID","amount":340,"method":"UPI",...}
curl localhost:4911/legacy/payment?oid=O-501                            # asli ajeeb response: {"s":1,"amt_paise":34000,...}
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code} " -H 'x-api-key: app-android-123' localhost:4910/api/profile; done
#   200 ... 200 429 429   (10 requests / 10 s)
```

Ctrl+C. Ab naya payment-service aur gateway cache:
```bash
STRANGLER=1 CACHE=1 npm start ex2-gateway-powers
curl -i -H 'x-api-key: app-ios-456' localhost:4910/payments/O-501   # x-served-by: payment-service — app ko koi farak nahi
curl -i -H 'x-api-key: app-ios-456' localhost:4910/menu/R-4         # x-cache: MISS (~250 ms)
curl -i -H 'x-api-key: app-ios-456' localhost:4910/menu/R-4         # x-cache: HIT  (~3 ms)
```
**Dekho:** app ka URL aur response shape wahi raha — peeche monolith se naya service aa gaya (strangler pattern). Gateway logs mein har request ki ek line trace id ke saath.

---

## ex3-composer-limits — memory aur "sab ya kuch nahi"

### Part A — Diwali home feed: 20 restaurants ke full menus (~200 KB har ek)
Gateway container limit `MEM_LIMIT_MB=64`.
```bash
npm start ex3-composer-limits
npm run heavy stream 30     # ~1 MB data ek waqt par — sab theek
npm run heavy buffer 4      # ~27 MB — chal gaya
npm run heavy buffer 30     # 💥 GATEWAY OOMKilled — logs: "OOMKilled — ... container limit 64 MB"
```
(OOMKilled ke baad `npm start` dobara chalao.)

### Part B — reviews down: poora page fail ya aadha page?
```bash
REVIEWS_DOWN=1 npm start ex3-composer-limits
curl -i "localhost:4920/restaurant-page/R-4?partial=0"   # 502 "reviews fail — poora page fail"
curl -i "localhost:4920/restaurant-page/R-4?partial=1"   # 200, "reviews":null, "degraded":["reviews"]
```
**Dekho:** composer sabka data memory mein jodta hai — bade responses aur zyada users = memory khatam. Aur composed response ki availability har backend ki availability se judti hai; partial response se bachaav.
