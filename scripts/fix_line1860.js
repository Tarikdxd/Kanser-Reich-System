const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'bots', 'newCommands.js');
let c = fs.readFileSync(filePath, 'utf8');

// Replace the problematic line
const oldLine = '                result += ``/oto-moderasyon islem:ekle` ile kural ekleyebilirsin.\\n`;';
const newLine = '                result += `\\`/oto-moderasyon islem:ekle\\` ile kural ekleyebilirsin.\\n`;';

if (c.includes(oldLine)) {
  c = c.replace(oldLine, newLine);
  fs.writeFileSync(filePath, c);
  console.log('FIXED - line replaced successfully');
} else {
  console.log('ERROR: Could not find the exact string to replace');
  // Try to find what's there
  const lines = c.split('\n');
  for (let i = 1855; i < 1865 && i < lines.length; i++) {
    console.log(`Line ${i+1}: ${JSON.stringify(lines[i])}`);
  }
}
