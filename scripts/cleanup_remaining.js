// KALAN CASE'LERI TEMIZLE - v2
const fs = require('fs');

function removeCases(filename, cases) {
  let content = fs.readFileSync(filename, 'utf8');
  let removed = 0;
  
  for (const cmd of cases) {
    // Try different patterns
    const patterns = [
      `    case '${cmd}':`,
      `      case '${cmd}':`,
      `\n    case '${cmd}':`,
      `\n      case '${cmd}':`,
      `case '${cmd}':\n`
    ];
    
    let idx = -1;
    for (const p of patterns) {
      idx = content.indexOf(p);
      if (idx !== -1) break;
    }
    
    if (idx === -1) {
      console.log(`  BULUNAMADI (${filename}): ${cmd}`);
      continue;
    }
    
    // Adjust idx to the start of case
    if (content[idx] === '\n') idx++;
    while (content[idx] === ' ') idx--;
    
    // Find the start of this line
    let start = idx;
    while (start > 0 && content[start] !== '\n') start--;
    if (content[start] === '\n') start++;
    
    // Find the end of this case block
    // Look for next `case` or `default:` at the same indentation, or end of switch
    const indent = content.substring(start, idx);
    
    let end = start + 1;
    while (end < content.length) {
      const nextCase = content.indexOf(`\n${indent}case `, end);
      const nextDefault = content.indexOf(`\n${indent}default:`, end);
      
      let nextMatch = -1;
      if (nextCase !== -1 && nextDefault !== -1) {
        nextMatch = Math.min(nextCase, nextDefault);
      } else if (nextCase !== -1) {
        nextMatch = nextCase;
      } else if (nextDefault !== -1) {
        nextMatch = nextDefault;
      }
      
      if (nextMatch !== -1) {
        end = nextMatch;
        break;
      }
      
      // Check for closing brace at lower indent (end of switch)
      if (content[end] === '}' && content[end+1] === '\n') {
        const beforeBrace = content.substring(0, end);
        const lastNewline = beforeBrace.lastIndexOf('\n');
        if (lastNewline !== -1) {
          const braceLine = beforeBrace.substring(lastNewline + 1);
          if (braceLine.trim() === '}' || braceLine.trim() === '},') {
            end = end + 1;
            break;
          }
        }
      }
      
      end++;
    }
    
    // Clean up trailing whitespace/newlines before the next case
    let cleanEnd = end;
    while (cleanEnd > start && (content[cleanEnd-1] === ' ' || content[cleanEnd-1] === '\n' || content[cleanEnd-1] === '\r')) {
      cleanEnd--;
    }
    
    // Clean up preceding newlines
    let cleanStart = start;
    while (cleanStart < content.length && (content[cleanStart] === '\n' || content[cleanStart] === '\r')) {
      cleanStart++;
    }
    
    console.log(`  SILINDI (${filename}): ${cmd} (lines ${content.substring(0, start).split('\n').length}-${content.substring(0, end).split('\n').length})`);
    content = content.substring(0, cleanStart) + content.substring(cleanEnd);
    removed++;
  }
  
  console.log(`  Toplam: ${removed} case kaldirildi`);
  fs.writeFileSync(filename, content);
}

// KANSERBOT.JS
const kanserCases = ['fotosint', 'canli-kamera', 'cve-radar'];
console.log('=== KANSERBOT.JS ===');
removeCases('src/bots/kanserBot.js', kanserCases);

// NEWCOMMANDS.JS
const ncCases = ['sifre-sorgula', 'pastebin-ara', 'port-hizli', 'ssl-coz', 'header-guvenlik', 'web-arsiv', 'asn-tarama', 'waf-test', 'dox-detay'];
console.log('\n=== NEWCOMMANDS.JS ===');
removeCases('src/bots/newCommands.js', ncCases);

console.log('\n=== ISLEM TAMAM ===');
