# 🗄️ KhanaKart Lab 06 — Database per Service

App ke levels: **Har Service ka Apna Database**, **Apne DB ke Faayde**, **Apne DB ki Keemat**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <profile> up --build` | `npm install`, phir `npm start <exercise>` |

> Yeh sab **teaching simulations** hain (memory mein data, asli Postgres/Elasticsearch/Neo4j nahi). Numbers aapki machine par thode alag aayenge — farak ka **pattern** wahi rahega.

---

## ex1-right-db — kaam ke hisaab se database

### Part A — Search: `LIKE '%q%'` vs inverted index (Elasticsearch jaisa)
2,00,000 dishes.
```bash
ENGINE_SEARCH=like npm start ex1-right-db
curl "localhost:4801/search?q=paneer"          # rowsRead 200000
curl "localhost:4801/search?q=panner%20tikka"  # results 0 — typo par kuch nahi

# Ctrl+C
ENGINE_SEARCH=index npm start ex1-right-db
curl "localhost:4801/search?q=paneer"          # rowsRead ~13,000, kam ms
curl "localhost:4801/search?q=panner%20tikka"  # "typoFix":"panner→paneer", results ~900
```

### Part B — "Aapke dosto ne yahan order kiya": JOINs vs graph traversal
50,000 users, har user ke 40 dost (zyaadatar apne college/society group se).
```bash
ENGINE_SOCIAL=sql npm start ex1-right-db
curl "localhost:4802/friends-ordered?depth=3"   # rowsTouched ~65,000
curl "localhost:4802/friends-ordered?depth=4"   # rowsTouched ~26,00,000, ~250 ms

# Ctrl+C
ENGINE_SOCIAL=graph npm start ex1-right-db
curl "localhost:4802/friends-ordered?depth=4"   # wahi jawab, rowsTouched ~4,00,000, ~30 ms
```
**Dekho:** jawab same, par kaam alag. JOIN har degree par duplicate rows aage le jaata hai; graph traversal har insaan ko ek hi baar dekhta hai. Asli RDBMS mein har hop ek index lookup + join hai — farak aur bada.

---

## ex2-isolation — ek DB ki dikkat, kitni services ki dikkat?

`DB_MODE=shared` → profile, chat, payment teeno ek **shared-db** (pool 15).
`DB_MODE=per-service` → har service ka apna DB (pool 5 + 5 + 5 — kul capacity same).

```bash
DB_MODE=shared npm start ex2-isolation          # Docker: --profile ex2-shared
npm run flood 60
#   Flood se pehle      — payment p50 ~26 ms
#   Chat flood (60 log) — payment p50 ~160 ms   ← chat ne payments ko dheema kiya
curl -X POST localhost:5500/admin/crash        # shared DB "disk full"
curl -X POST localhost:4813/pay                # 503 — payments bhi band

# Ctrl+C
DB_MODE=per-service npm start ex2-isolation     # Docker: --profile ex2-per-service
npm run flood 60
#   Chat flood (60 log) — payment p50 ~26 ms    ← payments ko farak nahi
#   Chat khud           — kam messages/sec      ← chat-db chhota hai, chat ko alag scale karna padega
curl -X POST localhost:5501/admin/crash        # sirf profile DB down
curl localhost:4811/profile/42                 # 503
curl -X POST localhost:4813/pay                # 200 — paise aate rahe
```
**Dekho:** apna DB = failure aur "shor machane wala padosi" dono alag. Keemat: har DB ko alag size aur scale karna padta hai.

---

## ex3-distributed-txn — Instamart: doodh AUR rider, dono ya koi nahi

inventory-service (doodh ka stock 50) aur delivery-service (riders) ke **alag databases**. `RIDER_FAIL_EVERY=4` → har 4th rider search fail.

```bash
MODE=naive RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn
npm run load 20
#   placed 15, failed 5
#   doodh stock: 30 (hona chahiye 35) ❌ 5 packet atke/gayab

MODE=saga RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn
npm run load 20
#   ~70 orders/sec · doodh stock: 35 ✅ (rider nahi mila toh doodh wapas — compensation)

MODE=twopc RIDER_FAIL_EVERY=4 npm start ex3-distributed-txn    # Docker: LOCK=1 bhi lagao
npm run load 20
#   ~5 orders/sec · doodh stock: 35 ✅ — sahi, par har order doodh ki row ka lock pakad ke rider ka intezaar karta hai

MODE=twopc COORD_CRASH_ON=3 npm start ex3-distributed-txn      # Docker: LOCK=1 bhi lagao
npm run load 20
#   placed 2, failed 17 (lock wait timeout), crashed 1
#   🔒 inventory lock abhi bhi IM-3 ke paas
#   ek naya order ab: failed (lock wait timeout) — ~4000 ms
```
**Dekho:** alag databases ke paar "sab ya kuch nahi" muft nahi hai. 2PC sahi rakhta hai par locks throughput khaate hain aur coordinator crash sabko rok deta hai. Saga tez hai, par compensation aapko likhna padta hai — aur beech mein thodi der data "aadha" dikhta hai.
