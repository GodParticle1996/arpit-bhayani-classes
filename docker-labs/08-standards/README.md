# 📏 KhanaKart Lab 08 — Standards: Good Service, Monitoring, Interfaces, Tolerance

App ke levels: **Good Service kya hai?**, **Monitoring ka Standard**, **Interface ka Standard**, **Tolerance: Khud Bacho, Doosron ko Bachao**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

Saari nayi services `kit/index.js` (**khanakart-kit**) use karti hain: JSON logs + traceId, `/health`, `/metrics`, standard HTTP client (timeout range, backoff retries), aur tolerance config.

---

## ex1-template — "good service" pehle din se

```bash
npm install
npm start ex1-template                    # rewards-legacy (5031) — 2019 ki haath se bani service
curl localhost:5031/rewards/u1
npm run scorecard rewards-legacy 5031     # Score: 0/7

# doosre terminal: template se nayi service
npm run new-service reviews 5032          # services/reviews.js + services/reviews.runbook.md
node services/reviews.js
npm run scorecard reviews 5032            # Score: 7/7 🌟 good service
```
**Dekho:** template ne bina extra mehnat ke service ko manageable (runbook, kit), observable (health, metrics) aur debuggable (JSON logs, trace id) bana diya.

---

## ex2-observability — 8:52 PM, "DIWALI coupon par checkout fail"

```bash
COUPON_BUG=1 npm start ex2-observability
npm run traffic 40
#   40 checkouts → 200: 32, 502: 8
#   Ek fail hua checkout ka traceId: tr-xxxx
npm run logs tr-xxxx
#   cart     request status=200
#   coupon   coupon validate crash  code=DIWALI error=Cannot read properties of undefined (reading 'max')
#   coupon   request status=500
#   checkout checkout fail
#   ⚠️ Andhere kone: pricing-legacy.log: 34/34 lines JSON nahi — traceId se dhoondh hi nahi sakte
npm run metrics
#   checkout 2xx 32  5xx 8 ...
#   coupon   2xx 24  5xx 8 ...
#   pricing-legacy  ❌ /metrics nahi — dashboard par yeh service andhera hai
```
**Dekho:** ek traceId se teen services ki kahani 1 minute mein. Jo service standard se bahar hai, woh incident mein andhera kona hai.

---

## ex3-interfaces — API standard aur pagination

```bash
npm start ex3-interfaces                  # messy (5011) aur standard (5012), dono mein har 40 ms naya order
npm run lint-api 5011                     # 14 violations
npm run lint-api 5012                     # 🌟 0 violations
npm run paginate 5011                     # offset: duplicate ~68 ❌ (naye orders upar aaye, purane neeche khiske)
npm run paginate 5012                     # cursor: duplicate 0 ✅
```
**Dekho:** ek org-wide standard (/v1, plural nouns, cursor pagination, JSON) se har team ki API ek jaisi — shared client library likhna aasaan. Aur cursor pagination badalte data par sahi rehti hai.

---

## ex4-tolerance — ration, kill switches (deploy nahi, sirf config)

profile-service (5021): ek saath 10 requests. `recommendation` ke naye deploy mein bug — 60 loops bina ruke.

```bash
npm start ex4-tolerance
npm run callers 4
#   recommendation  200: ~740              p50 ~325 ms
#   checkout        200: ~44               p50 ~325 ms   ← checkout bhi dooba

npm run killswitch ration recommendation 50     # config/tolerance.json; service 1 s mein padhti hai
npm run callers 4
#   recommendation  200: 200  429: ~18000
#   checkout        200: ~81               p50 ~90 ms    ← checkout bacha

npm run killswitch block recommendation         # incoming kill switch
npm run killswitch reset
```

Ctrl+C. Ab avatar-service hang:
```bash
npm run killswitch reset
AVATAR_DOWN=1 npm start ex4-tolerance
npm run callers 4
#   recommendation  504/timeout ...   checkout  timeout ...   ← profile ke saare slots avatar ka 3 s intezaar
npm run killswitch kill-out avatar              # outgoing kill switch: default avatar turant
npm run callers 4
#   recommendation  200: ~3700   checkout 200: ~130, p50 ~65 ms
npm run killswitch reset
```
**Dekho:** har service apne aap ko (ration, incoming kill switch) aur doosron ko (outgoing kill switch + default) bachati hai — config badal kar, bina deploy.
