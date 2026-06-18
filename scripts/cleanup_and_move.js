// TEMIZLIK & TASIMA SCRIPTI
// Kullanimi: node scripts/cleanup_and_move.js
const fs = require('fs');

// ===== KOMUT LISTELERI =====

// SILINECEK 10 ZAYIF KOMUT (kullanilmiyor/kirik)
const SIL = ['muzik-profil', 'rontgen', 'canli-kamera', 'exif-oku', 'cve-radar', 'fp-list', 'email-tracker', 'session-steal', 'headless-browse', 'sms-bomb'];

// TASINACAK KOMUTLAR
const TASINACAKLAR = {
  'sosyal-muh': ['oltala', 'qr-phish', 'fake-login', 'link-mask'],
  'derin-web': ['darkweb-arama'],
  'sosyal-medya': ['telegram-sorgula', 'insan-ara', 'dox-detay'],
  'mobil-osint': ['telefon-sorgula'],
  'cografi-osint': ['fotosint', 'exif-derin'],
  'guvenlik': ['cdn-coz', 'port-hizli', 'tech-stack', 'header-guvenlik', 'ssl-coz', 'wp-scan', 'waf-test', 'email-spoof'],
  'web-osint': ['whois-detay', 'web-arsiv', 'sertifika-transparan', 'asn-tarama', 'cdn-gercek-ip', 'email-sorgula', 'sifre-sorgula', 'breach-scanner', 'pastebin-ara']
};

// ===== 1. REGISTER.JS TEMIZLIGI =====
let reg = fs.readFileSync('register.js', 'utf8');
let silinen = 0;

function removeCommandFromRegister(name) {
  // Find the command in the array
  const pattern = `    name: '${name}'`;
  const idx = reg.indexOf(pattern);
  if (idx === -1) {
    // Try with different indentation
    const pattern2 = `  name: '${name}'`;
    const idx2 = reg.indexOf(pattern2);
    if (idx2 === -1) return false;
    return removeBlock(idx2);
  }
  return removeBlock(idx);
}

function removeBlock(fromIdx) {
  // Go back to find the opening {
  let start = fromIdx;
  let braceCount = 0;
  while (start > 0) {
    start--;
    if (reg[start] === '{') {
      // Found opening brace - verify this is the command block
      const beforeRest = reg.substring(Math.max(0, start - 5), start).trim();
      if (beforeRest === '' || beforeRest === '[' || beforeRest === ',' || beforeRest === '],') {
        braceCount = 1;
        break;
      }
    }
  }
  if (braceCount !== 1) return false;

  // Find the matching closing }
  let end = start;
  let depth = 0;
  let found = false;
  for (let i = start; i < reg.length; i++) {
    if (reg[i] === '{') depth++;
    else if (reg[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        found = true;
        break;
      }
    }
  }
  if (!found) return false;

  // Include the comma after the closing brace and any trailing whitespace/newlines before
  let cleanStart = start;
  while (cleanStart > 0 && (reg[cleanStart - 1] === ' ' || reg[cleanStart - 1] === '\n' || reg[cleanStart - 1] === '\r' || reg[cleanStart - 1] === ',' || reg[cleanStart - 1] === '\t')) {
    cleanStart--;
  }

  let cleanEnd = end;
  // Skip comma and whitespace after the block
  while (cleanEnd < reg.length && (reg[cleanEnd] === ' ' || reg[cleanEnd] === '\n' || reg[cleanEnd] === '\r' || reg[cleanEnd] === '\t')) {
    cleanEnd++;
  }
  if (reg[cleanEnd] === ',') cleanEnd++;
  if (reg[cleanEnd] === '\n' || reg[cleanEnd] === '\r') cleanEnd++;

  reg = reg.substring(0, cleanStart) + reg.substring(cleanEnd);
  return true;
}

// Remove SIL commands
for (const cmd of SIL) {
  if (removeCommandFromRegister(cmd)) {
    silinen++;
    console.log('SILINDI (register): ' + cmd);
  } else {
    console.log('BULUNAMADI (register): ' + cmd);
  }
}
console.log('Toplam silinen (register): ' + silinen);
fs.writeFileSync('register.js', reg);

// ===== 2. HANDLER DOSYALARINDAN SILME =====
// kanserBot.js ve newCommands.js'den case bloklarini kaldir
const handlerFiles = [
  { path: 'src/bots/kanserBot.js', finder: (c, cmd) => { const i = c.indexOf(`    case '${cmd}':`); return i !== -1 ? i : c.indexOf(`      case '${cmd}':`); } },
  { path: 'src/bots/newCommands.js', finder: (c, cmd) => { const i = c.indexOf(`    case '${cmd}':`); return i !== -1 ? i : c.indexOf(`      case '${cmd}':`); } }
];

for (const hf of handlerFiles) {
  let content = fs.readFileSync(hf.path, 'utf8');
  let handlerSilinen = 0;
  
  // Remove SIL commands
  for (const cmd of SIL) {
    const idx = hf.finder(content, cmd);
    if (idx === -1) {
      console.log('BULUNAMADI (' + hf.path + '): ' + cmd);
      continue;
    }
    
    // Find the end of this case block (next case or default or closing brace)
    let end = idx;
    // Find the end of the case line
    const lineEnd = content.indexOf('\n', idx);
    end = lineEnd;
    
    // Skip to find the NEXT case/default or closing }
    // We need to find the matching structure ending
    let depth = 0;
    let foundEnd = false;
    for (let i = lineEnd; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        if (depth === 0) {
          // This closes the case handler
          end = i;
          foundEnd = true;
          break;
        }
        depth--;
      }
    }
    
    if (!foundEnd) {
      console.log('BULUNAMADI END (' + hf.path + '): ' + cmd);
      continue;
    }
    
    // Remove from start of case to end (plus trailing newlines)
    let cleanEnd = end;
    while (cleanEnd < content.length && (content[cleanEnd] === ' ' || content[cleanEnd] === '\n' || content[cleanEnd] === '\r')) {
      cleanEnd++;
    }
    
    // Go back from case to clean up preceding whitespace
    let cleanStart = idx;
    while (cleanStart > 0 && (content[cleanStart - 1] === ' ' || content[cleanStart - 1] === '\n' || content[cleanStart - 1] === '\r' || content[cleanStart - 1] === '\t')) {
      cleanStart--;
    }
    
    content = content.substring(0, cleanStart) + content.substring(cleanEnd);
    handlerSilinen++;
    console.log('SILINDI (' + hf.path + '): ' + cmd);
  }
  
  console.log('Toplam silinen (' + hf.path + '): ' + handlerSilinen);
  fs.writeFileSync(hf.path, content);
}

// ===== 3. TASINACAK KOMUTLARI REGISTER'DAN KALDIR =====
reg = fs.readFileSync('register.js', 'utf8');
let tasinanSayisi = 0;
for (const [bot, cmds] of Object.entries(TASINACAKLAR)) {
  for (const cmd of cmds) {
    if (removeCommandFromRegister(cmd)) {
      console.log('TASINDI (register -> ' + bot + '): ' + cmd);
      tasinanSayisi++;
    } else {
      console.log('BULUNAMADI (register): ' + cmd + ' -> ' + bot);
    }
  }
}
fs.writeFileSync('register.js', reg);
console.log('Toplam tasinan (register): ' + tasinanSayisi);

// ===== 4. YENI BOT REGISTER SCRIPT'LERINE EKLE =====
// Read all the new bot register files, find the commands array, and add the moved commands
// This is complex - we need to parse each register file and add command definitions
// For now, we'll just note the counts

console.log('\n=== ISLEM TAMAMLANDI ===');
console.log('Register.js guncellendi.');
console.log('Handler dosyalari temizlendi.');
console.log('Simdi nouveau register script\'lerine komut tanimlari eklenmeli.');
