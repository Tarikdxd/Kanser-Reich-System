// HANDLER TEMIZLIK SCRIPTSI
// Kullanimi: node scripts/cleanup_handlers.js
const fs = require('fs');

// ===== KOMUT LISTELERI =====
const SIL = ['muzik-profil', 'rontgen', 'canli-kamera', 'exif-oku', 'cve-radar', 'fp-list', 'email-tracker', 'session-steal', 'headless-browse', 'sms-bomb'];
const TASINACAKLAR = [
  'oltala', 'qr-phish', 'fake-login', 'link-mask',
  'darkweb-arama',
  'telegram-sorgula', 'insan-ara', 'dox-detay',
  'telefon-sorgula',
  'fotosint', 'exif-derin',
  'cdn-coz', 'port-hizli', 'tech-stack', 'header-guvenlik', 'ssl-coz', 'wp-scan', 'waf-test', 'email-spoof',
  'whois-detay', 'web-arsiv', 'sertifika-transparan', 'asn-tarama', 'cdn-gercek-ip', 'email-sorgula', 'sifre-sorgula', 'breach-scanner', 'pastebin-ara'
];

const ALL = [...SIL, ...TASINACAKLAR];

function removeCaseBlocks(content, cmdNames) {
  const lines = content.split('\n');
  const result = [];
  let skipping = false;
  let skipIndent = 0;
  let skipCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!skipping) {
      // Check if this line starts a case we want to remove
      const trimmed = line.trim();
      let matchedCmd = null;
      
      for (const cmd of cmdNames) {
        // Match: `      case 'cmd-name':` or similar
        const caseRegex = new RegExp(`^case\\s+'${cmd}':`);
        if (caseRegex.test(trimmed)) {
          matchedCmd = cmd;
          break;
        }
        // Match multi-case: `      case 'cmd-name':` followed by `      case 'cmd-name2':`
        if (trimmed.startsWith(`case '${cmd}':`)) {
          matchedCmd = cmd;
          break;
        }
      }
      
      if (matchedCmd) {
        skipping = true;
        skipIndent = line.length - line.trimStart().length;
        skipCount++;
        console.log(`  ATLIYOR: ${matchedCmd} (satir ${i + 1})`);
        continue; // Skip this line
      }
      
      result.push(line);
    } else {
      // We're skipping lines - check if this line starts a new case at same or lower indent
      const trimmed = line.trim();
      const currentIndent = line.length - line.trimStart().length;
      
      // Check for next case or default at same or lower indent level
      if ((trimmed.startsWith('case ') || trimmed.startsWith('default:')) && currentIndent <= skipIndent) {
        // Also make sure this isn't a nested case inside a function
        // We only stop skipping when the indent is <= the skip indent
        skipping = false;
        result.push(line); // This is the next case we want to keep
        continue;
      }
      
      // If line is at lower indent and not a case/default, we might have missed the end
      if (currentIndent < skipIndent && !trimmed.startsWith('}') && !trimmed.startsWith('break') && !trimmed.startsWith('//') && trimmed !== '') {
        // This might be a closing brace or something at lower indent
        // Check if we've gone too far
      }
      
      // Skip this line
    }
  }

  console.log(`  Toplam atlanan: ${skipCount} case blok`);
  return result.join('\n');
}

// ===== 1. kanserBot.js =====
console.log('=== KANSERBOT.JS TEMIZLIGI ===');
const kanserBotSil = ['muzik-profil', 'oltala', 'rontgen', 'canli-kamera', 'exif-oku', 'cve-radar', 'fp-list', 'email-tracker', 'session-steal', 'headless-browse', 'sms-bomb', 'fotosint', 'telefon-sorgula', 'insan-ara', 'dox-detay', 'fake-login', 'qr-phish', 'link-mask', 'darkweb-arama'];

let kanser = fs.readFileSync('src/bots/kanserBot.js', 'utf8');
const originalKanserLen = kanser.length;
kanser = removeCaseBlocks(kanser, kanserBotSil);
fs.writeFileSync('src/bots/kanserBot.js', kanser);
console.log(`kanserBot.js: ${originalKanserLen} -> ${kanser.length} karakter`);

// ===== 2. newCommands.js =====
console.log('\n=== NEWCOMMANDS.JS TEMIZLIGI ===');
const ncSil = ['sifre-sorgula', 'email-sorgula', 'telegram-sorgula', 'whois-detay', 'exif-derin', 'cdn-coz', 'port-hizli', 'tech-stack', 'header-guvenlik', 'ssl-coz', 'wp-scan', 'waf-test', 'email-spoof', 'web-arsiv', 'sertifika-transparan', 'asn-tarama', 'cdn-gercek-ip', 'pastebin-ara', 'breach-scanner', 'telefon-sorgula', 'insan-ara', 'dox-detay', 'fotosint'];

let nc = fs.readFileSync('src/bots/newCommands.js', 'utf8');
const originalNcLen = nc.length;
nc = removeCaseBlocks(nc, ncSil);
fs.writeFileSync('src/bots/newCommands.js', nc);
console.log(`newCommands.js: ${originalNcLen} -> ${nc.length} karakter`);

console.log('\n=== ISLEM TAMAMLANDI ===');
