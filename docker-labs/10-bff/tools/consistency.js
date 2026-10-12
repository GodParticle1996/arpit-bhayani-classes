#!/usr/bin/env node
/* npm run consistency — ₹250 ka cart: teeno BFFs delivery fee ke baare mein ek hi baat bolte hain? */
(async () => {
  const rows = [];
  for (const [kind, port] of [['web', 5221], ['mobile', 5222], ['voice', 5223]]) rows.push(await fetch(`http://localhost:${port}/cart-summary?total=250`).then(r => r.json()));
  console.log('\n₹250 ka cart (niyam: ₹199 se upar free delivery)\n');
  rows.forEach(r => console.log(`  ${r.bff.padEnd(7)} "${r.deliveryText}"  ${r.sharedLib ? '(shared lib)' : '(apna copy)'}`));
  const free = rows.map(r => /free/i.test(r.deliveryText));
  console.log(free.every(Boolean) ? '\n  ✅ teeno ek jaisa\n' : '\n  ❌ BFFs alag bol rahe hain — niyam badla, ek copy update nahi hui (duplication drift)\n');
})().catch(e => { console.log('npm start ex3-bff-costs chal raha hai?', e.message); process.exit(1); });
