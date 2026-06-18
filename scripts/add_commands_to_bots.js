// BOTLARA KOMUT EKLEME SCRIPTSI
// Bu script her botun register script'ine ek komut tanimlari ekler
const fs = require('fs');

// HEDEF BOTLAR VE EKLENECEK KOMUTLAR
const EKLENECEKLER = {
  'registerWebOsint': {
    file: 'registerWebOsint.js',
    before: `  {\n    name: 'ip-gecmis',\n    description: 'Bir IP adresinin gecmis kayitlarini ve WHOIS gecmisini sorgular.',\n    options: [{ name: 'ip', description: 'Sorgulanacak IP adresi.', type: 3, required: true }]\n  },`,
    commands: [
      { name: 'email-sorgula', desc: 'E-posta adresinin HIBP veri sizintilarinda olup olmadigini kontrol eder.', opts: [{ name: 'email', desc: 'Sorgulanacak e-posta adresi.', type: 3, req: true }] },
      { name: 'sifre-sorgula', desc: 'Bir sifrenin veri sizintilarinda gorunup gorunmedigini SHA1 ile kontrol eder.', opts: [{ name: 'sifre', desc: 'Sorgulanacak sifre.', type: 3, req: true }] },
      { name: 'breach-scanner', desc: 'Domaini acik veritabanlarinda ve sizinti kaynaklarinda tarar.', opts: [{ name: 'domain', desc: 'Taranacak alan adi.', type: 3, req: true }] },
      { name: 'pastebin-ara', desc: 'Pastebin ve GitHub Gist uzerinde kelime aramasi yapar.', opts: [{ name: 'kelime', desc: 'Aranacak kelime.', type: 3, req: true }] },
      { name: 'whois-detay', desc: 'Domainin detayli WHOIS/RDAP kaydini ve DNS bilgilerini analiz eder.', opts: [{ name: 'domain', desc: 'Analiz edilecek alan adi.', type: 3, req: true }] },
      { name: 'web-arsiv', desc: 'Wayback Machine ile domainin gecmis goruntulerini arsivler.', opts: [{ name: 'domain', desc: 'Arsivlenecek alan adi.', type: 3, req: true }] },
      { name: 'sertifika-transparan', desc: 'crt.sh ile domainin gecmis SSL sertifikalarini ve alt alanlarini doker.', opts: [{ name: 'domain', desc: 'Sertifika sorgulanacak alan adi.', type: 3, req: true }] },
      { name: 'asn-tarama', desc: 'ASN numarasina ait IP bloklari, Shodan kayitlari ve RIPE verisini tarar.', opts: [{ name: 'asn', desc: 'ASN numarasi (Orn: AS13335).', type: 3, req: true }] },
      { name: 'cdn-gercek-ip', desc: 'Cloudflare/WAF arkasindaki gercek IP adresini 10+ yontemle bulur.', opts: [{ name: 'domain', desc: 'Gercek IPsi bulunacak alan adi.', type: 3, req: true }] }
    ]
  },
  'registerMobilOsint': {
    file: 'registerMobilOsint.js',
    before: 'const commands = [',
    commands: [
      { name: 'telefon-sorgula', desc: 'Telefon numarasinin ulke, operator ve gecerliligini sorgular.', opts: [{ name: 'telefon', desc: 'Sorgulanacak telefon (+90...).', type: 3, req: true }] }
    ]
  },
  'registerSosyalMuh': {
    file: 'registerSosyalMuh.js',
    before: 'const commands = [',
    commands: [
      { name: 'oltala', desc: 'Sosyal muhendislik simulasyonu icin log tutan sahte link uretir.', opts: [{ name: 'hedef', desc: 'Kurbanin yonlendirilecegi site.', type: 3, req: true }, { name: 'maske', desc: 'Linkin goruntusu.', type: 3, req: true }] },
      { name: 'qr-phish', desc: 'Oltalama amaciyla QR kod ve log tutan link olusturur.', opts: [{ name: 'hedef', desc: 'Kurbanin yonlendirilecegi URL.', type: 3, req: true }, { name: 'maske', desc: 'Linkin goruntusu.', type: 3, req: true }] },
      { name: 'fake-login', desc: 'Google/Instagram/Twitter klonu giris sayfasi olusturur.', opts: [{ name: 'tur', desc: 'Platform (google, instagram, twitter, discord).', type: 3, req: true, choices: [{ name: 'Google', value: 'google' }, { name: 'Instagram', value: 'instagram' }, { name: 'Twitter', value: 'twitter' }, { name: 'Discord', value: 'discord' }] }] },
      { name: 'link-mask', desc: 'Zararli linki maskeleyerek farkli formatlarda gosterir (Markdown/HTML).', opts: [{ name: 'hedef', desc: 'Kurbanin yonlendirilecegi URL.', type: 3, req: true }, { name: 'maske', desc: 'Linkin goruntusu.', type: 3, req: true }] }
    ]
  },
  'registerDerinWeb': {
    file: 'registerDerinWeb.js',
    before: 'const commands = [',
    commands: [
      { name: 'darkweb-arama', desc: 'Anahtar kelimeyi Tor agindaki yasadisi sitelerde (.onion) aratir.', opts: [{ name: 'kelime', desc: 'Darkwebde aranacak kelime.', type: 3, req: true }] }
    ]
  },
  'registerSosyalMedya': {
    file: 'registerSosyalMedya.js',
    before: 'const commands = [',
    commands: [
      { name: 'telegram-sorgula', desc: 'Telegram kullanici adinin profil detaylarini sorgular.', opts: [{ name: 'kullanici', desc: 'Telegram kullanici adi (@ olmadan).', type: 3, req: true }] },
      { name: 'insan-ara', desc: 'Isim soyisme gore sosyal medya ve GitHub profillerini tarar.', opts: [{ name: 'isim', desc: 'Aranacak kisi (Ad Soyad).', type: 3, req: true }] },
      { name: 'dox-detay', desc: 'Kullanici adi uzerinden GitHub, HIBP, sosyal medya ile profil cikarir.', opts: [{ name: 'kullanici', desc: 'Arastirilacak kullanici adi.', type: 3, req: true }] }
    ]
  },
  'registerGuvenlik': {
    file: 'registerGuvenlik.js',
    before: 'const commands = [',
    commands: [
      { name: 'cdn-coz', desc: 'Cloudflare/WAF arkasindaki gercek IP adreslerini subdomain ve DNS ile bulur.', opts: [{ name: 'domain', desc: 'Hedef alan adi.', type: 3, req: true }] },
      { name: 'port-hizli', desc: 'Hedef IPnin en kritik 10 HTTP portunu hizlica acik/kapali kontrol eder.', opts: [{ name: 'ip', desc: 'Taranacak IP.', type: 3, req: true }] },
      { name: 'tech-stack', desc: 'Web sitesinin kullandigi teknolojileri tespit eder (CMS, Framework, Sunucu).', opts: [{ name: 'domain', desc: 'Analiz edilecek domain.', type: 3, req: true }] },
      { name: 'ssl-coz', desc: 'SSL sertifika detaylarini ve TLS surumunu analiz eder.', opts: [{ name: 'domain', desc: 'SSL analizi yapilacak domain.', type: 3, req: true }] },
      { name: 'wp-scan', desc: 'WordPress sitelerde guvenlik aciklarini ve versiyon tespiti yapar.', opts: [{ name: 'domain', desc: 'Taranacak domain.', type: 3, req: true }] },
      { name: 'header-guvenlik', desc: 'HTTP guvenlik basliklarini analiz eder (CSP, HSTS, XSS vb).', opts: [{ name: 'domain', desc: 'Analiz edilecek domain.', type: 3, req: true }] },
      { name: 'waf-test', desc: 'SQLi, XSS, Path Traversal gibi payloadlarla WAF guvenligini test eder.', opts: [{ name: 'url', desc: 'Test edilecek URL.', type: 3, req: true }] },
      { name: 'email-spoof', desc: 'Domainin SPF/DKIM/DMARC kayitlarini analiz ederek spoof zafiyetini tespit eder.', opts: [{ name: 'domain', desc: 'Analiz edilecek domain.', type: 3, req: true }] }
    ]
  },
  'registerCografi': {
    file: 'registerCografi.js',
    before: 'const commands = [',
    commands: [
      { name: 'exif-derin', desc: 'Fotografin AI ile derin EXIF analizini yapar (cihaz, ortam, lokasyon).', opts: [{ name: 'fotograf', desc: 'Analiz edilecek gorsel.', type: 11, req: true }] },
      { name: 'fotosint', desc: 'Fotografi analiz ederek kim veya neresi oldugunu tahmin eder.', opts: [{ name: 'fotograf', desc: 'AI ile incelenecek gorsel.', type: 11, req: true }] }
    ]
  }
};

function makeCmdObj(cmd) {
  const opts = cmd.opts.map(o => {
    let optStr = `{ name: '${o.name}', description: '${o.desc}', type: ${o.type}, required: ${o.req}`;
    if (o.choices) {
      optStr += `, choices: [${o.choices.map(c => `{ name: '${c.name}', value: '${c.value}' }`).join(', ')}]`;
    }
    return optStr + ' }';
  });
  return `  {\n    name: '${cmd.name}',\n    description: '${cmd.desc}',\n    options: [${opts.join(',\n      ')}]\n  },`;
}

let totalAdded = 0;
for (const [key, bot] of Object.entries(EKLENECEKLER)) {
  if (!fs.existsSync(bot.file)) {
    console.log(`ATA: ${bot.file} bulunamadi, olusturuluyor...`);
    // Skip - bot file doesn't exist
    continue;
  }
  
  let content = fs.readFileSync(bot.file, 'utf8');
  let added = 0;
  
  for (const cmd of bot.commands) {
    // Check if already exists
    if (content.includes(`name: '${cmd.name}'`)) {
      console.log(`  ZATEN VAR (${bot.file}): ${cmd.name}`);
      continue;
    }
    
    // Insert after the before marker or before '];' (end of commands array)
    const insertPoint = content.indexOf(bot.before);
    if (insertPoint !== -1) {
      const cmdObj = makeCmdObj(cmd);
      const insertAfter = insertPoint + bot.before.length;
      content = content.substring(0, insertAfter) + '\n' + cmdObj + '\n' + content.substring(insertAfter);
      console.log(`  EKLENDI (${bot.file}): ${cmd.name}`);
      added++;
    } else {
      // Try inserting before the closing ];
      const closingBracket = content.indexOf('];');
      if (closingBracket !== -1) {
        const cmdObj = makeCmdObj(cmd);
        content = content.substring(0, closingBracket) + '\n' + cmdObj + '\n' + content.substring(closingBracket);
        console.log(`  EKLENDI (${bot.file} - sona): ${cmd.name}`);
        added++;
      } else {
        console.log(`  HATA (${bot.file}): ${cmd.name} - ekleme noktasi bulunamadi`);
      }
    }
  }
  
  fs.writeFileSync(bot.file, content);
  console.log(`${bot.file}: ${added} komut eklendi`);
  totalAdded += added;
}

console.log(`\n=== ISLEM TAMAM === Toplam ${totalAdded} komut eklendi`);
