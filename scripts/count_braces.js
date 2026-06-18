const fs = require('fs');
let c = fs.readFileSync('src/bots/kanserBot.js', 'utf8');

let braces = 0;
let parens = 0;
let inString = null;
let escape = false;

for (let i = 0; i < c.length; i++) {
  let ch = c[i];
  
  if (escape) { escape = false; continue; }
  
  if (inString) {
    if (ch === '\\') { escape = true; continue; }
    if (ch === inString) inString = null;
    continue;
  }
  
  if (ch === '"' || ch === "'" || ch === '`') {
    inString = ch;
    continue;
  }
  
  // Skip line comments
  if (ch === '/' && c[i+1] === '/') {
    let nl = c.indexOf('\n', i);
    if (nl === -1) break;
    i = nl;
    continue;
  }
  
  if (ch === '{') braces++;
  else if (ch === '}') braces--;
  else if (ch === '(') parens++;
  else if (ch === ')') parens--;
}

console.log('File: src/bots/kanserBot.js');
console.log('Braces ({}):', braces, '(should be 0)');
console.log('Parens (()):', parens, '(should be 0)');
console.log('Char count:', c.length);
