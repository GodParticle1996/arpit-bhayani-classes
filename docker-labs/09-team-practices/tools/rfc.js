#!/usr/bin/env node
/* npm run rfc "<title>" — template/standard badalne ka prastaav. Koi bhi engineer likh sakta hai. */
const fs = require('fs');
const path = require('path');
const title = process.argv.slice(2).join(' ').trim();
if (!title) { console.log('Use: npm run rfc "Template mein OpenTelemetry tracing default"'); process.exit(1); }
const dir = path.join(__dirname, '..', 'docs', 'rfc');
const n = fs.readdirSync(dir).filter(f => /^\d{4}-/.test(f)).length + 12;
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
const file = path.join(dir, `${String(n).padStart(4, '0')}-${slug}.md`);
fs.writeFileSync(file, `# RFC-${String(n).padStart(4, '0')}: ${title}

**Author:** (naam) · **Status:** draft · **Discussion:** platform guild, agli Thursday

## Problem (data ke saath)
Kya toot raha hai / kya mehenga hai? Incidents, numbers, benchmark.

## Proposal
Template mein kya badlega? Kaunsi version?

## Alternatives
Kam se kam 2 — aur kyun nahi.

## Kis par asar
Kaunsi services, kitna migration kaam, opt-out ka raasta.

## One-way door?
Wapas jaana possible hai? Nahi hai toh kaun-kaun sign-off karega.

## Business link
Is quarter ke kis goal se juda hai? (cost, reliability, speed)

## Vote
| Team | + / − | Comment |
|---|---|---|
`);
console.log(`✅ ${path.relative(path.join(__dirname, '..'), file)} bana — team ke saath share karo.`);
