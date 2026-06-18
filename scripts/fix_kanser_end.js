const fs = require('fs');
let c = fs.readFileSync('src/bots/kanserBot.js', 'utf8');
if (!c.trimEnd().endsWith('}')) {
  c = c.trimEnd() + '\n    default:\n      return null;\n  }\n}\n';
  fs.writeFileSync('src/bots/kanserBot.js', c);
  console.log('kanserBot.js closing fixed. Length: ' + c.length);
} else {
  console.log('kanserBot.js already closed properly.');
}
