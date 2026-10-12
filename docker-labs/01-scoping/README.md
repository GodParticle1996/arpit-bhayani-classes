# 🍛 KhanaKart Lab 01 — Service ki boundary, loose coupling, high cohesion

App ke levels: **Service ki Boundary**, **Loose Coupling**, **High Cohesion**.

Do tareeke se chalao (dono ek jaisa result dete hain):

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install` (ek baar), phir `npm start <exercise>` |
| band: `docker compose --profile <exercise> down` | band: `Ctrl + C` |

> Windows par env variable: PowerShell mein `$env:COUPON_BUG="1"; npm start ex1-split`

---

## ex1-blast-radius — ek bug, kitna nuksaan?

**Scenario:** KhanaKart ka coupon code ek bug ke saath deploy hua. Monolith mein coupon, menu aur checkout ek hi process hain.

### Part A — monolith
```bash
COUPON_BUG=1 npm start ex1-monolith          # ya: COUPON_BUG=1 docker compose --profile ex1-monolith up --build
curl localhost:4000/menu                     # ✅ menu aata hai
curl localhost:4000/coupon/apply             # 💥 bug trigger — monolith process gir jaata hai
curl localhost:4000/menu                     # ❌ connection refused — MENU bhi gaya!
```

### Part B — split services
```bash
COUPON_BUG=1 npm start ex1-split
curl localhost:4101/menu                     # ✅ menu-service
curl localhost:4102/coupon/apply             # 💥 sirf coupon-service girti hai
curl localhost:4101/menu                     # ✅ menu abhi bhi chal raha hai
curl localhost:4103/checkout                 # ✅ order bina discount ke — couponNote padho
```

**Dekho:** monolith mein ek module ka bug = poori dukaan band. Split mein bug ka asar sirf coupon tak.

---

## ex2-direct-db — dusri service ke database mein jhaankna

**Scenario:** order-service tracking page ke liye rider ka ETA chahiye. Ek version (`order-reads-db`) delivery ka database (file) seedha padhta hai. Doosra (`order-uses-api`) delivery-service ki API se poochhta hai.

```bash
npm start ex2-direct-db                          # schema v1
curl localhost:4202/orders/o1/tracking           # ✅ DB seedha padh ke ETA
curl localhost:4203/orders/o1/tracking           # ✅ API se ETA
# Ctrl+C — ab delivery team apna database badalti hai (v2):
SCHEMA=v2 npm start ex2-direct-db                # ya: SCHEMA=v2 docker compose --profile ex2-direct-db up
curl localhost:4202/orders/o1/tracking           # ❌ 500 — riders table/column gayab
curl localhost:4203/orders/o1/tracking           # ✅ API contract wahi — ETA aata raha
```

**Dekho:** delivery team ne sirf APNA data badla. Jo service andar jhaank rahi thi, woh tooti. Jo contract se baat kar rahi thi, use pata bhi nahi chala.

---

## ex3-shared-code — do services, ek shared file

**Scenario:** delivery fee ka code `lib/pricing.js` mein hai aur menu + order dono import karte hain. Fee ₹39 se ₹49 hui. menu-service naye code ke saath deploy hui, order-service ka deploy abhi pending hai.

```bash
npm start ex3-shared-code
curl localhost:4101/menu        # deliveryFeeShown: 49
curl localhost:4103/checkout    # deliveryFeeCharged: 39   ← user ko jo dikha, woh charge nahi hua!
# Ctrl+C — ab pricing ka EK maalik banao:
npm start ex3-owned
curl localhost:4101/menu        # 49, source: pricing-service API
curl localhost:4103/checkout    # 49 — dono ek hi jagah se poochhte hain
```

**Dekho:** shared code = dono services ko ek saath deploy karna padta hai, warna mismatch. Ek maalik (pricing-service) = fee badli toh sirf ek deploy.
