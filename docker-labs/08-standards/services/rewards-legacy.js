/* ex1 — "rewards" service jo ek engineer ne 2019 mein apne tareeke se banayi thi (engineer ab company chhod chuka hai).
   Na /health, na /metrics, logs free text mein, trace id nahi. Chalti hai — jab tak nahi chalti. */
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const out = fs.createWriteStream(path.join(__dirname, '..', 'logs', 'rewards-legacy.log'), { flags: 'a' });
const say = s => { console.log(s); out.write(s + '\n'); };
app.get('/rewards/:user', (req, res) => { say(`got req for ${req.params.user} ok`); res.json({ user: req.params.user, points: 420 }); });
app.listen(5031, () => say('rewards up on 5031'));
