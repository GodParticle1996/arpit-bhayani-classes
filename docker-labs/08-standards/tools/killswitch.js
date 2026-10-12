#!/usr/bin/env node
/* npm run killswitch <command>  — config/tolerance.json badlo; profile-service 1 second mein padh leti hai. Deploy nahi.
     show
     ration <caller> <rps>        (jaise: ration recommendation 50)
     block <caller> | unblock <caller>
     kill-out <dependency>        (jaise: kill-out avatar → default avatar turant)
     restore-out <dependency>
     reset */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'config', 'tolerance.json');
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
const [cmd, a, b] = process.argv.slice(2);
const save = () => { fs.writeFileSync(file + '.tmp', JSON.stringify(cfg, null, 2) + '\n'); fs.renameSync(file + '.tmp', file); };
switch (cmd) {
  case 'ration': cfg.ration[a] = Number(b); save(); break;
  case 'block': if (!cfg.blockIncoming.includes(a)) cfg.blockIncoming.push(a); save(); break;
  case 'unblock': cfg.blockIncoming = cfg.blockIncoming.filter(c => c !== a); save(); break;
  case 'kill-out': cfg.killOutgoing[a] = { default: a === 'avatar' ? { url: '/img/default-avatar.png' } : {} }; save(); break;
  case 'restore-out': delete cfg.killOutgoing[a]; save(); break;
  case 'reset': cfg.ration = {}; cfg.blockIncoming = []; cfg.killOutgoing = {}; save(); break;
  case 'show': case undefined: break;
  default: console.log('commands: show | ration <caller> <rps> | block <caller> | unblock <caller> | kill-out <dep> | restore-out <dep> | reset'); process.exit(1);
}
console.log(JSON.stringify(cfg, null, 2));
