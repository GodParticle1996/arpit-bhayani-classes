/* =====================================================================
   Arpit Bhayani Classes — Ranks, Tracks, KhanaKart universe

   Har course = ek track. Abhi: "Designing Microservices" (Arpit Bhayani ki
   YouTube playlist ke 10 videos). Naya course aaye toh AB.tracks mein ek
   entry + nayi data files + index.html + validate.js ki CONTENT list.

   🍛 KhanaKart — saare levels isi company ki kahani hain.
   Bengaluru ki food + grocery delivery app (Swiggy/Zomato jaisi).
     order-service        order lena, order ki state
     payment-service      UPI/card charge, refund
     restaurant-service   restaurant, menu, "order accept/reject"
     delivery-service     rider assign karna, live location
     notification-service push / SMS / email
     search-service       dish aur restaurant dhoondhna (Elasticsearch)
     analytics-service    views, clicks, reports
     profile-service      user profile, addresses
     review-service       ratings aur reviews
     inventory-service    grocery stock (KhanaKart Instamart jaisa)
     coupon-service       offers, coupons
   Clients: Android/iOS app, web (desktop), Alexa skill.
   ===================================================================== */

const RANKS = [
  { xp: 0,    name: 'Monolith Musafir',     icon: '🐣' },
  { xp: 300,  name: 'Boundary Banaane Wala', icon: '🧱' },
  { xp: 700,  name: 'Coupling Kaatne Wala', icon: '✂️' },
  { xp: 1200, name: 'Timeout Tapasvi',      icon: '⏱️' },
  { xp: 1800, name: 'Retry Rakshak',        icon: '🔁' },
  { xp: 2500, name: 'Database Darbaan',     icon: '🗄️' },
  { xp: 3300, name: 'Queue Qila-daar',      icon: '📨' },
  { xp: 4200, name: 'Event Ustaad',         icon: '🎼' },
  { xp: 5200, name: 'Gateway Guru',         icon: '🚪' },
  { xp: 6300, name: 'Standards Senapati',   icon: '📏' },
  { xp: 7500, name: 'BFF Kaarigar',         icon: '🎨' },
  { xp: 8800, name: 'Microservices Mahaguru', icon: '👑' },
];

AB.tracks = [
  {
    id: 'microservices',
    icon: '🧩',
    name: 'Designing Microservices',
    blurb: 'Arpit Bhayani ki "Designing Microservices" series — KhanaKart par. Service ki boundary, timeouts aur retries, shared database vs database-per-service, sync vs async, orchestration vs choreography, API gateway, standards, team ki asli duniya, aur Backend-for-Frontend. Har level: dry run → live lab → Docker par asli Node.js services → decision card.',
    certTitle: 'MICROSERVICES MAHAGURU',
    certSub: 'Certificate of Microservices Design (KhanaKart edition)',
    motto: 'Achha architecture simple hota hai — flow, dependency aur coupling ek nazar mein dikh jaaye.',
    formula: 'Achhi service = loose coupling + high cohesion + har network call ka plan B',
  },
];

/* ---------------------------------------------------------------------
   KhanaKart service catalogue — dry run / flow lab diagrams yahin se icons
   aur naam lete hain, taaki har level mein ek hi "duniya" dikhe.
     AB.kk.n('order', 300, 200)                 → node
     AB.kk.n('order', 300, 200, { label: 'x' }) → override
   viewBox 1000 × 520 hai; x/y node ka centre hai.
   --------------------------------------------------------------------- */
AB.kk = {
  catalog: {
    user:         { icon: '🧑', label: 'User' },
    app:          { icon: '📱', label: 'Mobile app' },
    web:          { icon: '💻', label: 'Web' },
    alexa:        { icon: '🔊', label: 'Alexa' },
    gateway:      { icon: '🚪', label: 'API gateway' },
    order:        { icon: '🧾', label: 'order' },
    payment:      { icon: '💳', label: 'payment' },
    restaurant:   { icon: '🍳', label: 'restaurant' },
    delivery:     { icon: '🛵', label: 'delivery' },
    notification: { icon: '🔔', label: 'notification' },
    search:       { icon: '🔎', label: 'search' },
    analytics:    { icon: '📊', label: 'analytics' },
    profile:      { icon: '👤', label: 'profile' },
    review:       { icon: '⭐', label: 'review' },
    inventory:    { icon: '📦', label: 'inventory' },
    coupon:       { icon: '🎟️', label: 'coupon' },
    broker:       { icon: '📨', label: 'broker', kind: 'queue' },
    db:           { icon: '🗄️', label: 'DB', kind: 'db' },
    cache:        { icon: '⚡', label: 'Redis', kind: 'db' },
    bff:          { icon: '🎨', label: 'BFF' },
    es:           { icon: '🔍', label: 'Elastic', kind: 'db' },
  },
  n(id, x, y, over) {
    const base = AB.kk.catalog[id.split('#')[0]] || { icon: '📦', label: id };
    return Object.assign({ id, x, y, icon: base.icon, label: base.label, kind: base.kind }, over || {});
  },
};
