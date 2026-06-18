const fs = require('fs');
const path = require('path');

// Fix newCommands.js - replace literal \\n with \n for template literals
const filePath = path.join(__dirname, '..', 'src', 'bots', 'newCommands.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace \\n (double backslash + n) with \n (single backslash + n)
// This fixes template literals to produce actual newlines
const originalLength = content.length;
content = content.split('\\\\n').join('\\n');

console.log(`Replaced ${(originalLength - content.length) / 2} occurrences of \\\\n`);
fs.writeFileSync(filePath, content);
console.log('File saved successfully.');
