const fs = require('fs');
const lines = fs.readFileSync('src/bots/newCommands.js', 'utf8').split('\n');

[10, 75, 77, 118, 318, 371, 717, 724].forEach(n => {
  const i = n - 1;
  if (lines[i]) {
    console.log('=== LINE ' + n + ' (len=' + lines[i].length + ') ===');
    // Print each char with its code
    const chars = [];
    for (let j = 0; j < lines[i].length; j++) {
      const code = lines[i].charCodeAt(j);
      let display;
      if (code === 92) display = '\\';
      else if (code === 96) display = '`';
      else if (code === 10) display = '\\n';
      else if (code < 32 || code > 126) display = '[' + code + ']';
      else display = String.fromCharCode(code);
      chars.push(display);
    }
    console.log(chars.join(''));
    console.log();
  }
});
