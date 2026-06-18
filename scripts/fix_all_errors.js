const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'bots', 'newCommands.js');
let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Step 1: Check for actual 0x0A bytes inside template literals (from broken \\n fix)
// The correct fix should change \\n to \n (backslash+n), NOT to actual newlines
// Let's check if any \n bytes got turned into actual newlines
let hasActualNewlines = false;
for (let i = 0; i < content.length; i++) {
  if (content.charCodeAt(i) === 10) { // 0x0A = newline
    // Check if this is inside a template literal
    hasActualNewlines = true;
    break;
  }
}
console.log('Has actual newlines (0x0A):', hasActualNewlines);

// Step 2: Read the file as hex to find any non-ASCII or problematic bytes
const buf = fs.readFileSync(filePath);
let problems = [];
for (let i = 0; i < buf.length; i++) {
  const byte = buf[i];
  // Check for non-ASCII (except newlines, carriage returns, tabs)
  if (byte > 127) {
    // Find line number
    const beforeSlice = buf.slice(0, i);
    const lineNum = (beforeSlice.toString('utf8').match(/\n/g) || []).length + 1;
    problems.push({ pos: i, byte, line: lineNum });
  }
}
console.log('Non-ASCII bytes:', problems.length);
if (problems.length > 0) {
  console.log('First 5:', problems.slice(0, 5).map(p => `line=${p.line} pos=${p.pos} byte=0x${p.byte.toString(16)}`).join(', '));
}

// Step 3: Fix - replace any remaining \\n (double backslash + n) with \n (single backslash + n) AGAIN
// This handles any missed cases
let fixed = content;
// Match exactly \\n (backslash, backslash, n) - only inside template literals and strings
fixed = fixed.split('\\\\n').join('\\n');

if (fixed !== originalContent) {
  console.log('Additional replacements made:', (originalContent.length - fixed.length) / 2);
}

fs.writeFileSync(filePath, fixed);
console.log('File saved.');
