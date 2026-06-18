// REGISTER.JS TEMIZLIK SCRIPTS
// Kullanimi: node scripts/cleanup_register.js
const fs = require('fs');

// ===== KOMUT LISTELERI =====
const SIL = ['muzik-profil', 'rontgen', 'canli-kamera', 'exif-oku', 'cve-radar', 'fp-list', 'email-tracker', 'session-steal', 'headless-browse', 'sms-bomb'];
const TASINACAKLAR = [
  // sosyal-muh (4)
  'oltala', 'qr-phish', 'fake-login', 'link-mask',
  // derin-web (1)
  'darkweb-arama',
  // sosyal-medya (3)
  'telegram-sorgula', 'insan-ara', 'dox-detay',
  // mobil-osint (1)
  'telefon-sorgula',
  // cografi-osint (2)
  'fotosint', 'exif-derin',
  // guvenlik (8)
  'cdn-coz', 'port-hizli', 'tech-stack', 'header-guvenlik', 'ssl-coz', 'wp-scan', 'waf-test', 'email-spoof',
  // web-osint (9)
  'whois-detay', 'web-arsiv', 'sertifika-transparan', 'asn-tarama', 'cdn-gercek-ip', 'email-sorgula', 'sifre-sorgula', 'breach-scanner', 'pastebin-ara'
];

const ALL = [...SIL, ...TASINACAKLAR];

// register.js'yi oku
let reg = fs.readFileSync('register.js', 'utf8');

function removeCommand(name) {
  // Find the name line
  const searchStr = `    name: '${name}'`;
  let idx = reg.indexOf(searchStr);
  if (idx === -1) {
    // Try 2-space indent
    const searchStr2 = `  name: '${name}'`;
    idx = reg.indexOf(searchStr2);
    if (idx === -1) {
      console.log(`  BULUNAMADI: ${name}`);
      return false;
    }
  }

  // Go back to find the opening { of this command block
  let start = idx;
  let depth = 0;
  let foundOpen = false;
  while (start > 0) {
    start--;
    if (reg[start] === '{') {
      // Check if this is a command-level brace (preceded by [ or , or whitespace/newline)
      const before = reg.substring(Math.max(0, start - 2), start).trim();
      if (before === '' || before === '[' || before === ',' || before === '},' || before === '}') {
        depth = 1;
        foundOpen = true;
        break;
      }
    }
  }
  if (!foundOpen) {
    console.log(`  BASLANGIC BULUNAMADI: ${name}`);
    return false;
  }

  // Find the matching closing }
  let end = start;
  while (end < reg.length) {
    end++;
    if (reg[end] === '{') depth++;
    else if (reg[end] === '}') {
      depth--;
      if (depth === 0) {
        break;
      }
    }
  }

  // Include the trailing comma and whitespace/newlines
  let cleanEnd = end + 1;
  while (cleanEnd < reg.length && (reg[cleanEnd] === ' ' || reg[cleanEnd] === '\n' || reg[cleanEnd] === '\r' || reg[cleanEnd] === '\t')) {
    cleanEnd++;
  }
  if (reg[cleanEnd] === ',') cleanEnd++;
  if (reg[cleanEnd] === '\n' || reg[cleanEnd] === '\r') cleanEnd++;

  // Clean up preceding whitespace/newlines
  let cleanStart = start;
  while (cleanStart > 0 && (reg[cleanStart - 1] === ' ' || reg[cleanStart - 1] === '\n' || reg[cleanStart - 1] === '\r' || reg[cleanStart - 1] === '\t' || reg[cleanStart - 1] === ',')) {
    cleanStart--;
  }

  reg = reg.substring(0, cleanStart) + reg.substring(cleanEnd);
  console.log(`  SILINDI: ${name}`);
  return true;
}

console.log('=== REGISTER.JS TEMIZLIGI ===');
console.log(`Toplam silinecek: ${ALL.length} komut\n`);

let sayac = 0;
for (const cmd of ALL) {
  if (removeCommand(cmd)) sayac++;
}

console.log(`\nToplam ${sayac}/${ALL.length} komut basariyla kaldirildi.`);

fs.writeFileSync('register.js', reg);
console.log('register.js guncellendi.');
