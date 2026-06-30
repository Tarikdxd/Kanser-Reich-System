const CATEGORIES = {
  'yapay-zeka': {
    name: 'Yapay Zeka',
    emoji: '🤖',
    commands: [
      ['fotoyu-anlat', 'Foto AI analizi'],
      ['ses-coz', 'Sesten metin'],
      ['kombin-yap', 'AI gorsel birlestir'],
      ['sor', 'AI sohbet'],
      ['ceviri', 'Metin ceviri'],
      ['resim-ciz', 'AI gorsel uret'],
      ['seslendir', 'Metni seslendir'],
      ['sesli-ceviri', 'Ceviri + ses'],
      ['ozetle', 'Metin ozetle'],
      ['sql-yaz', 'SQL sorgu yaz'],
      ['kanserai', 'Sinirsiz AI'],
      ['rootkit', 'Kernel-9 AI'],
      ['analiz', 'AI av rapor analizi'],
      ['analiz2', 'AI komut onerisi']
    ]
  },
  'web-osint': {
    name: 'Web OSINT',
    emoji: '🌐',
    commands: [
      ['ip-sorgula', 'IP tehdit + port'],
      ['domain-sorgula', 'Domain tehdit'],
      ['dns-sorgu', 'DNS kayitlari'],
      ['domain-istihbarat', 'WHOIS/RDAP'],
      ['derin-tarama', 'Subdomain + sizinti'],
      ['guvenli-link', 'Browser izole analiz'],
      ['hizmet-analiz', 'Port + servis + CVE'],
      ['sosyal-graf', 'Kurum haritasi'],
      ['alt-alan', 'crt.sh subdomain'],
      ['gecmis-dns', 'DNS gecmisi'],
      ['config-avla', '.env/.git tarama'],
      ['git-dump', '.git ifsa kontrol'],
      ['web-arsiv', 'Wayback Machine'],
      ['sertifika-transparan', 'SSL sertifika gecmisi'],
      ['cdn-gercek-ip', 'Gercek IP bul'],
      ['vpn-tespit', 'VPN/Proxy/TOR tespit'],
      ['ip-derin', 'Kapsamli IP analiz'],
      ['curl', 'HTTP istek at'],
      ['kaynak-kod', 'HTML kaynak getir'],
      ['meta-tara', 'Meta/OG etiketleri'],
      ['dns-kayit', 'A/MX/NS/TXT sorgula']
    ]
  },
  'ag-guvenlik': {
    name: 'Ag / Guvenlik',
    emoji: '🛡️',
    commands: [
      ['ag-takip', 'ASN/ISP/Abuse'],
      ['saldirgan-avi', 'Blocklist/OTX analiz'],
      ['shodan-tam', 'Shodan deep scan'],
      ['kara-liste', 'Spamhaus/Sorbs'],
      ['exploit-ara', 'CVE exploit ara'],
      ['sifre-kir', 'MD5/SHA1 kir'],
      ['zararli-analiz', 'VT multi-scan'],
      ['dev-tara', 'GitHub sizinti'],
      ['dev-istihbarat', 'GitHub derin'],
      ['ip-gecmis', 'IP WHOIS gecmisi'],
      ['bgp-tara', 'BGP route analizi'],
      ['cdn-harita', 'CDN tespit'],
      ['asn-tarama', 'ASN IP bloklari']
    ]
  },
  'sosyal-medya': {
    name: 'Sosyal Medya OSINT',
    emoji: '📱',
    commands: [
      ['kullanici-avla', 'Sosyal medya ara'],
      ['kim-bu', 'Capraz profil'],
      ['ayak-izi', 'Dijital ayak izi'],
      ['iz-sur', 'AI profilleme'],
      ['dijital-iz', 'GitHub/HIBP/SM'],
      ['dox-detay', 'Kapsamli profil'],
      ['telegram-sorgula', 'Telegram profil'],
      ['reddit-profil', 'Reddit analiz'],
      ['steam-istihbarat', 'Steam profil'],
      ['sarki-profil', 'Muzik profili'],
      ['sosyal-derin', 'SM derin tarama']
    ]
  },
  'mobil-osint': {
    name: 'Mobil OSINT',
    emoji: '📲',
    commands: [
      ['telefon-sorgula', 'Telefon dogrulama'],
      ['imei-coz', 'IMEI marka/model'],
      ['cihaz-detay', 'UA cihaz tespit'],
      ['apk-incele', 'APK manifest analiz'],
      ['apk-tehlikeli', 'APK VT tarama'],
      ['play-store', 'Google Play ara'],
      ['app-store', 'App Store ara'],
      ['mobil-operator-detay', 'Operator tespit']
    ]
  },
  'siber-saldiri': {
    name: 'Siber Saldiri',
    emoji: '⚔️',
    commands: [
      ['brute-force', 'Login brute force'],
      ['sql-tara', 'SQL injection'],
      ['xss-tara', 'XSS tarama'],
      ['reverse-shell', 'Shell one-liner'],
      ['sunucu-dusur', 'Stres test'],
      ['waf-atlat', 'WAF bypass'],
      ['auto-pwn', 'Oto pentest zincir'],
      ['auto-pentest', 'Gelismis pentest'],
      ['tehdit-model', 'AI tehdit modeli'],
      ['email-spoof', 'SPF/DKIM/DMARC'],
      ['header-guvenlik', 'HTTP guvenlik'],
      ['port-hizli', 'Hizli port tarama'],
      ['jwt-kir', 'JWT brute force']
    ]
  },
  'sosyal-muh': {
    name: 'Sosyal Muhendislik',
    emoji: '🎭',
    commands: [
      ['link-mask', 'Link maskele'],
      ['fake-login', 'Klon giris sayfasi'],
      ['qr-phish', 'QR kod + log'],
      ['oltala', 'Log tutan link'],
      ['deep-voice', 'AI ses klon'],
      ['otp-bypass', 'OTP test'],
      ['call-spoof', 'Arayan kimligi'],
      ['vishing-senaryo', 'AI sesli phishing'],
      ['credential-stuff', 'Sifre dene'],
      ['gorsel-osint', 'Gorsel ara'],
      ['email-derin', 'Email derin analiz'],
      ['sifre-tahmin', 'Sifre kombinasyon'],
      ['rat', 'Keylogger RAT'],
      ['dosya-rat', 'HTA RAT'],
      ['foto-tuzak', 'Fotograf tuzagi'],
      ['profiler', '30 platform profil'],
      ['oltala-pixel', 'Email pixel tracker']
    ]
  },
  'gozetim': {
    name: 'Gozetim / Monitor',
    emoji: '👁️',
    commands: [
      ['canli-takip', 'Domain/IP monitor'],
      ['alan-izle', 'Domain surec takip'],
      ['sizinti-alarm', 'Sizinti alarm'],
      ['hedef-izle', 'Kisi takip'],
      ['hedef-dosya', 'Toplu istihbarat'],
      ['karsilastir', 'Hedef karsilastir'],
      ['network-graf', 'Ag gorsel'],
      ['zaman-sirasi', 'Zaman akisi'],
      ['metadata-oku', 'Dosya metadata'],
      ['hash-dogrula', 'Hash dogrula'],
      ['ekran-arsiv', 'SS + HTML arsiv'],
      ['kronik-takip', 'Periyodik izle'],
      ['delil-kaydet', 'Sayfa SS + HTML'],
      ['kullanici-gecmis', 'Nick gecmisi']
    ]
  },
  'cografi': {
    name: 'Cografi / Gorsel',
    emoji: '🗺️',
    commands: [
      ['fotosint', 'Foto konum tahmin'],
      ['exif-derin', 'AI EXIF analiz'],
      ['exif-bak', 'EXIF metadata'],
      ['yer-bul', 'Mekan analiz'],
      ['yuz-tanima', 'Yuz analiz'],
      ['logo-tara', 'Logo tespit'],
      ['harita-karsilastir', 'Mesafe/rota'],
      ['koordinat-coz', 'Koordinat adres'],
      ['maps-tara', 'Google Maps sorgu'],
      ['drone-haritasi', 'Uydu goruntusu'],
      ['deepfake-kontrol', 'Deepfake tespit']
    ]
  },
  'cookies': {
    name: 'Cookies / Session',
    emoji: '🍪',
    commands: [
      ['oturum-cal', 'Session hijacking'],
      ['xss-cookie', 'XSS cookie avi'],
      ['csrf-cookie', 'CSRF analiz'],
      ['sql-cookie', 'SQL cookie avi'],
      ['kimlik-avi', 'Phishing analiz'],
      ['ddos-cookie', 'Cookie DDoS'],
      ['cookie-manipule', 'Yetki yukselt'],
      ['session-fixation', 'Session fixation'],
      ['cors-cookie', 'CORS misconfig'],
      ['crlf-cookie', 'CRLF injection'],
      ['httponly-bypass', 'HttpOnly atlat'],
      ['samesite-bypass', 'SameSite atlat'],
      ['localstorage-avla', 'LocalStorage avi'],
      ['websocket-cookie', 'WS cookie sizinti'],
      ['browser-finger', 'Browser fingerprint']
    ]
  },
  'derin-web': {
    name: 'Derin Web / Dark Web',
    emoji: '🌑',
    commands: [
      ['darkweb-arama', 'Onion sitelerde ara'],
      ['tor-sorgu', 'Onion ping test'],
      ['tor-istatistik', 'Tor istatistik'],
      ['i2p-tara', 'I2P tarama'],
      ['breach-forum', 'IntelX sizinti'],
      ['ransom-not', 'Ransomware kontrol'],
      ['deep-web-scan', 'Kapsamli tarama'],
      ['darkweb-gelismis', 'Forum/pazar yeri']
    ]
  },
  'araclar': {
    name: 'Araclar / Utility',
    emoji: '🛠️',
    commands: [
      ['sifre-uret', 'Rastgele sifre'],
      ['sil', 'Toplu mesaj sil'],
      ['mock-api', 'Mock JSON API'],
      ['kod-analiz', 'Kod analizi'],
      ['api-test', 'HTTP istek at'],
      ['sunucu-istatistik', 'Sunucu bilgi'],
      ['oto-moderasyon', 'Auto-mod yonet'],
      ['kanser-sorgu', 'TC/GSM/adres sorgu'],
      ['veri-toplama', 'Toplu OSINT rapor'],
      ['wiki', 'Wikipedia terim'],
      ['traceroute-sim', 'Trace simule'],
      ['websiteleri-ortak', 'Domain ortak IP'],
      ['subdomain-takeover', 'Subdomain takeover'],
      ['firebase-ara', 'Firebase test'],
      ['s3-tara', 'S3 bucket tarama'],
      ['github-dork', 'GitHub dork'],
      ['cryptoscan', 'SSL tarama'],
      ['dork-avla', 'Google dork'],
      ['waf-as', 'WAF analiz'],
      ['whois-detay', 'WHOIS analiz'],
      ['email-sorgula', 'HIBP sorgu'],
      ['sifre-sorgula', 'Sifre sizinti'],
      ['pastebin-ara', 'Pastebin ara'],
      ['mail-gonder', 'E-posta gonder'],
      ['mail-sorgu', 'Mail DNS sorgu'],
      ['config-goster', 'Config goruntule'],
      ['config-ayarla', 'Config guncelle'],
      ['audit-goster', 'Komut loglari'],
      ['jwt-coz', 'JWT token decode']
    ]
  }
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

export function getHelpEmbed(categoryId) {
  const cat = CATEGORIES[categoryId];
  if (!cat) return getHelpEmbed(CATEGORY_KEYS[0]);

  let lines = [`${cat.emoji} **${cat.name} Komutlari**\n`, '```'];
  for (const [name, desc] of cat.commands) {
    const row = `/${name}`.padEnd(22) + desc;
    if (lines.join('\n').length + row.length + 3 < 1900) {
      lines.push(row);
    }
  }
  lines.push('```');
  lines.push('', `Kategori: \`${cat.name}\` (${cat.commands.length} komut)`);
  lines.push('📌 Kategori degistirmek icin asagidaki menuyu kullan.');
  return lines.join('\n');
}

export function createCategorySelect(selectedId) {
  return {
    type: 1,
    components: [{
      type: 3,
      custom_id: 'yardim_category',
      placeholder: 'Kategori sec...',
      options: CATEGORY_KEYS.map(k => ({
        label: CATEGORIES[k].name,
        value: k,
        description: `${CATEGORIES[k].commands.length} komut`,
        emoji: { name: CATEGORIES[k].emoji },
        default: k === selectedId
      }))
    }]
  };
}


