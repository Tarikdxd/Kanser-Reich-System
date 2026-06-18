const fs = require('fs');
let c = fs.readFileSync('src/bots/kanserBot.js', 'utf8');
let lines = c.split('\n');
let braces = 0, parens = 0, brackets = 0;
let inString = null;
let problems = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    let ch = line[j];
    let prev = j > 0 ? line[j-1] : '';
    
    if (inString) {
      if (ch === '\\' && inString !== '`') j++;
      else if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    
    // Skip comments
    if (ch === '/' && line[j+1] === '/') break;
    
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '(') parens++;
    else if (ch === ')') parens--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
    
    // Track unbalanced state at each line
    if ((ch === '{' || ch === '}' || ch === '(' || ch === ')' || ch === '[' || ch === ']') && 
        (braces < 0 || parens < 0 || brackets < 0)) {
      problems.push(`Line ${i+1}: ${ch} causes ${braces < 0 ? 'braces('+braces+')' : parens < 0 ? 'parens('+parens+')' : 'brackets('+brackets+')'}`);
    }
  }
}

console.log('Final state:');
console.log('  Braces:', braces, '(expect 0)');
console.log('  Parens:', parens, '(expect 0)');
console.log('  Brackets:', brackets, '(expect 0)');
console.log('  Total lines:', lines.length);
if (problems.length > 0) {
  console.log('\nProblems:');
  problems.forEach(p => console.log('  ' + p));
} else {
  console.log('\nNo immediate closing issues found.');
}
