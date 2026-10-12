# 🎨 KhanaKart Lab 10 — Backend for Frontend (BFF)

App ke levels: **Ek Endpoint, Teen Clients**, **BFF Pattern**, **BFF Kab, Kab Nahi**

| Docker | Bina Docker (Node.js 18+) |
|---|---|
| `docker compose --profile <exercise> up --build` | `npm install`, phir `npm start <exercise>` |

Core services (general purpose): restaurant (5201 — gallery, 120 menu items, FAQs + internal fields jaise gstin, commission), reviews (5202), orders (5203).

---

## ex1-one-endpoint — desktop web ke liye bana endpoint, mobile aur Alexa par

```bash
npm install
npm start ex1-one-endpoint                 # HACK=0: sabko poora jawab
npm run clients generic
#   web    56 KB   use 56 KB   0%     49 ms
#   app    56 KB   use 3 KB    96%    ~555 ms (4G)
#   alexa  56 KB   use 0       100%   — "JSON — Alexa isse bol nahi sakta"

# Ctrl+C — ab "jugaad": ?platform=web|app|alexa core backend mein if-else
HACK=1 npm start ex1-one-endpoint
npm run clients hack
#   app 3 KB, alexa speech mil gaya...
#   core backend: 6 platform if-else branches — har naya client/tweak = core backend ka code + deploy
```
**Dekho:** ek shape sab par thopne se mobile ka data aur battery barbaad; `?platform` jugaad se core backend client-specific if-else se bhar jaata hai.

---

## ex2-bffs — har client ka apna BFF

web-bff (5221), mobile-bff (5222), voice-bff (5223). Core services wahi, generic.

```bash
npm start ex2-bffs
npm run clients bff
#   web    56 KB  · app 2 KB · alexa 182 B
#   Alexa bolega: "Sharma Dhaba, 4.3 star. Aapka pichhla order tha 1 Paneer Tikka aur 2 Butter Naan, 340 rupaye. Free delivery. Kya dobara order karein?"

curl -i localhost:5222/restaurant-page/R-4                                    # 403 — mobile BFF ka apna security check
curl -s -H 'x-app-attestation: ok' localhost:5222/restaurant-page/R-4 | head -c 300
curl -s localhost:5221/restaurant-page/R-4 | grep -c gstin                     # 0 — internal fields BFF ne hataye
```
**Dekho:** BFF sirf presentation karta hai — kya fetch, kaise jode, kya bheje. Core backend ek hi shape deta hai (cache aasaan), aur mobile team apna BFF khud badal sakti hai.

---

## ex3-bff-costs — duplication aur extra hop

```bash
SHARED_LIB=0 npm start ex3-bff-costs       # har BFF ne "free delivery" niyam apne paas copy kiya tha
npm run consistency
#   web    "Free delivery"
#   mobile "Free delivery"
#   voice  "delivery ke 30 rupaye lagenge"   ← niyam ₹299 → ₹199 badla, voice ka copy reh gaya
#   ❌ BFFs alag bol rahe hain (duplication drift)

npm run hop
#   seedha restaurant-service   p50 ~43 ms
#   mobile BFF (2 calls + trim)  p50 ~55 ms   ← extra hop + fan-out

# Ctrl+C
SHARED_LIB=1 npm start ex3-bff-costs       # niyam lib/display.js mein ek jagah, wording har BFF ki apni
npm run consistency                        # ✅ teeno ek jaisa ("delivery free hai" voice mein)
```
**Dekho:** BFFs mein milta-julta code duplicate hota hai — shared niyam library mein rakho (wording nahi). Aur har BFF ek hop + ek aur cheez deploy/monitor karne ki.
