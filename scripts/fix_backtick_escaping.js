const fs = require('fs');

const filePath = 'src/bots/newCommands.js';
let content = fs.readFileSync(filePath, 'utf8');

// The issue: `\\foo` in template literals should be `\foo`
// `\\n` is for newlines (which is now correctly `\n`)
// But `\\`` (two backslashes + backtick) inside template literal should be `\`` (one backslash + backtick)

// Strategy: replace \\` with \` but NOT inside regular strings (single/double quoted)
// Since we're working inside a JS file and the pattern is clear:
// Find all occurrences of \\` that are inside template literals

// Count all occurrences
const backtickDoubleSlash = content.match(/\\\\`/g);
console.log('Found', backtickDoubleSlash ? backtickDoubleSlash.length : 0, 'occurrences of \\\\`');

// Replace ALL \\` with \`
// This is safe because:
// 1. In template literals: \\` -> \` (properly escaped backtick)
// 2. In regular strings: \\` -> \` (in regular strings \` is a backtick char)
// 3. Outside strings: this pattern doesn't exist in JS code
content = content.split('\\\\`').join('\\`');

fs.writeFileSync(filePath, content);
console.log('File saved. Running checks...');
