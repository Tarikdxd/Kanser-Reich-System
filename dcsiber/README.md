# DCSIBER — Discord Bot Guvenlik Egitimi

**Discord botlari nasil dusurulur, nasil korunur?**

Bu rehber, Discord botlarina karsi yapilabilecek saldirilari ve
korunma yontemlerini adim adim anlatir. Kanser-Reich-System
projemizdeki 12 bot ornek alinarak hazirlanmistir.

---

## Icerik

| # | Konu | Aciklama |
|---|------|----------|
| 1 | [Token Hirsizligi](#1-token-hirsizligi) | En kritik zafiyet |
| 2 | [Rate Limit Abuse](#2-rate-limit-abuse) | API'yi asiri yukleme |
| 3 | [Resource Exhaustion](#3-resource-exhaustion) | CPU/bellek tuketme |
| 4 | [WebSocket Saldirilari](#4-websocket-saldirilari) | Baglanti koparma |
| 5 | [Interactions API Abuse](#5-interactions-api-abuse) | Imza atlatma, replay |
| 6 | [OAuth2 Exploitation](#6-oauth2-exploitation) | Yetki yukseltme |
| 7 | [Supply Chain](#7-supply-chain-saldirilari) | npm/pip bagimliligi |
| 8 | [Permission Escalation](#8-permission-escalation) | Admin yetkisi alma |
| 9 | [Cooldown & Rate Limiting](#9-cooldown--rate-limiting) | Nasil eklenir |
| 10 | [Monitoring & Logging](#10-monitoring--logging) | Tespit sistemi |
| 11 | [Proje Bazli Cozumler](#11-proje-bazli-cozumler) | Kod ornekleriyle |

---

## 1) TOKEN HIRSIZLIGI

### Token nerede saklanmamali?

```
KOTU ORNEKLER:
  const token = "MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GABCDE.abc123def456";
  process.env.TOKEN  -> .env dosyasi git'e commit edilmis
  config.json        -> { "token": "MTIz..." }
  wrangler.jsonc     -> { "vars": { "DISCORD_TOKEN": "..." } }
  Herhangi bir JS dosyasi icinde düz metin
```

### Projemizdeki durum

Bizim botta token'lar `wrangler secret put DISCORD_TOKEN` ile
saklaniyor. Bu dogru yontem. Ancak GECMISTE token register
dosyalarinda gecici olarak bulundu (sonra `.gitignore`'a eklendi).

### Token'lar nasil calinir?

| Yontem | Aciklama |
|--------|----------|
| **GitHub Secret Scanning** | GitHub, her commit'te token arar. Public repo'da token varsa Discord hemen token'i iptal eder |
| **GitLeaks / TruffleHog** | Offline tarama araclari. `.env`, `config.json`, `token`, `MT` gibi pattern'leri tarar |
| **Phishing** | "Discord Developer Portal'a gir" diyerek token'i calma |
| **Malware / Infostealer** | Bilgisayardaki `.env`, `wrangler.jsonc`, `credentials` dosyalarini calar |
| **npm Malicious Package** | `postinstall` script'inde token ortam degiskenini okuyan paket |
| **CI/CD Leak** | GitHub Actions log'unda token'in yanlislikla basilmasi |

### Korunma

```bash
# 1. wrangler secret ile sakla
wrangler secret put DISCORD_TOKEN

# 2. .gitignore'a token icerebilecek dosyalari ekle
echo "wrangler.jsonc" >> .gitignore
echo "register*.js" >> .gitignore
echo ".env" >> .gitignore

# 3. GitHub Secret Scanning'i aktif et
#    Settings -> Security -> Secret scanning

# 4. Token rotasyonu (3 ayda bir degistir)
wrangler secret put DISCORD_TOKEN  # yeni token ile

# 5. Log'lara token yazdirma
console.log("Token:", process.env.TOKEN);  // ASLA!
```

### Test: Token tarama

```bash
python scripts/01-token-scanner.py --path C:\Projects
```

---

## 2) RATE LIMIT ABUSE

### Discord Rate Limit Nedir?

```
Global rate limit:     50 istek / saniye
Bot basina route:      (istatistiksel) 10.000 / 60 saniye
Webhook mesaji:        30 / 60 saniye
Guild kanal listesi:   20 / 10 saniye
Avatar guncelleme:     2 / 3600 saniye (saatte 2 kere)
```

### Saldiri Vektoru

Bir botun API'ye cok fazla istek gondermesine sebep olarak
rate limit'e takilmasini saglamak. Bot, rate limit'e takilinca:

1. **Tum istekler 429 (Too Many Requests) doner**
2. Bot tum fonksiyonlarini kaybeder (mesaj gonderemez, etkilesim kuramaz)
3. Butun sunucularda islevsiz hale gelir

### Projemizdeki Zafiyet

Bizim botta **HICBIR rate limiting yok!** Bir kullanici:

- `/dev-tara` komutunu saniyede 50 kere calistirabilir
- Tum 12 bot'a ayni anda spam gonderebilir
- `ctx.waitUntil` ile Workers islem cisimlerini sisirebilir

### Nasil Korunuruz?

#### Cooldown Sistemi (per-user)

```js
// helpers.js'ye ekle
const cooldowns = new Map();
const COOLDOWN_SECONDS = 3;

export function checkCooldown(userId, commandName) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const last = cooldowns.get(key);
  if (last && now - last < COOLDOWN_SECONDS * 1000) {
    const remaining = Math.ceil((COOLDOWN_SECONDS * 1000 - (now - last)) / 1000);
    return remaining; // kalan sure
  }
  cooldowns.set(key, now);
  return 0; // sorun yok
}
```

#### Global Rate Limit Takibi

```js
let requestCounts = new Map();
const GLOBAL_LIMIT = 40; // saniyede 40 istek

export function checkGlobalRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - 1000;
  
  // Temizlik
  for (const [k, v] of requestCounts) {
    if (v.time < windowStart) requestCounts.delete(k);
  }
  
  const userData = requestCounts.get(userId) || { count: 0, time: now };
  if (userData.count >= GLOBAL_LIMIT) return true; // limit asildi
  userData.count++;
  requestCounts.set(userId, userData);
  return false;
}
```

---

## 3) RESOURCE EXHAUSTION

### Saldiri Vektoru

Bot kaynaklarini tuketerek islevsiz hale getirme.

| Kaynak | Saldiri | Etki |
|--------|---------|------|
| **CPU** | Karmasik sifre cozme, hash brute-force | Workers CPU limiti asimi |
| **Bellek** | Buyuk dosyalar, sonsuz donguler | 128MB Workers limiti |
| **Zaman** | Uzun suren API cagrilari (timeout) | Workers 30s limit |
| **KV** | Cok fazla KV okuma/yazma | KV rate limit |
| **Fetch** | Cok fazla HTTP istegi | Workers subrequest limiti |

### Workers Ozellikleri

```
CPU:      30 ms (free) / 30 saniye (paid)
Bellek:   128 MB
Subrequest: 50 (free) / 1000 (paid)
KV okuma: 1000/s (free)
```

### Projemizdeki Riskli Komutlar

Bizim boticin kaynak tuketebilecek komutlar:

```
/dev-tara     -> GitHub API'ye 5+ istek
/ag-takip     -> ip-api.com + diger servisler
/email-tara   -> Hunter.io + HaveIBeenPwned
/kanserai     -> Workers AI model cagrisi
/rootkit      -> AI model cagrisi + uzun yanit
/analiz       -> AI model + veri analizi
```

Bir saldirgan bu komutlari arka arkaya calistirarak Workers
limitlerini asmaniza neden olabilir (Error 1102 - CPU/Memory
exceeded).

### Korunma

```js
// 1. Zaman asimi kontrolu
export async function withTimeout(promise, ms = 25000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await Promise.race([
      promise,
      new Promise((_, rej) =>
        ac.signal.addEventListener('abort', () => rej(new Error('Zaman asimi')))
      )
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// 2. Komut basina maksimum calisma suresi
const MAX_EXECUTION_MS = 20000; // 20 saniye

// 3. Karmasik islemleri sirala (queue)
const taskQueue = [];
let processing = false;

export async function queueTask(task) {
  return new Promise((resolve, reject) => {
    taskQueue.push({ task, resolve, reject });
    if (!processing) processNext();
  });
}

async function processNext() {
  if (taskQueue.length === 0) { processing = false; return; }
  processing = true;
  const { task, resolve, reject } = taskQueue.shift();
  try {
    resolve(await task());
  } catch (e) {
    reject(e);
  }
  processNext();
}
```

---

## 4) WEBSOCKET SALDIRILARI

### Nasil Calisir

Discord botlari, Gateway WebSocket uzerinden Discord'a baglanir.
Workers botlari ise **Interactions API** kullandigi icin WebSocket
baglantisi YOKTUR. Bu, Workers botlarini bu saldirilardan
otomatik olarak korur.

| Saldiri | Normal Bot | Workers Bot |
|---------|------------|-------------|
| WebSocket flood | Riskli | **Korumali** |
| OP kodu manipulasyonu | Riskli | **Korumali** |
| Yeniden baglanma saldirisi | Riskli | **Korumali** |
| Heartbeat abuse | Riskli | **Korumali** |
| Intent abuse | Riskli | **Korumali** |

Workers botlari HTTP/UDP uzerinden Discord ile iletisim kurar,
WebSocket kullanmaz. Bu buyuk bir guvenlik avantajidir.

### Eger Normal Bot Kullaniyorsaniz

```js
// Korunma: Intents'i minimal tut
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Sadece ihtiyaciniz olan intent'leri ekleyin
  ]
});

// Yeniden baglanma stratejisi
client.on('shardDisconnected', (event, shardId) => {
  console.log(`Shard ${shardId} baglantisi koptu.`);
  // 5 saniye bekle, sonra tekrar dene
  setTimeout(() => client.login(token), 5000);
});
```

---

## 5) INTERACTIONS API ABUSE

### Signature Verification

Discord, butun interaction'lari Ed25519 ile imzalar.
Dogru bir bot, bu imzayi dogrulamali ve gecersiz imzali
istekleri REDDETMELIDIR.

Bizim botta bu var (`helpers.js:167`):

```js
export async function verifyDiscordSignature(request, publicKey) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp || !publicKey) return false;
  try {
    const body = await request.clone().text();
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', hexToBuf(publicKey),
      { name: 'Ed25519' }, false, ['verify']
    );
    return await crypto.subtle.verify(
      'Ed25519', key,
      hexToBuf(signature),
      enc.encode(timestamp + body)
    );
  } catch { return false; }
}
```

### Replay Saldirisi

Bir saldirgan, gecerli bir Discord interaction'ini kaydedip
tekrar gonderebilir. Bunu engellemek icin timestamp kontrolu
gereklidir:

```js
// Timestamp kontrolu (5 dakikadan eski istekleri reddet)
export function validateTimestamp(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp);
  if (!ts) return false;
  return Math.abs(now - ts) < 300; // 5 dakika
}
```

### Invalid Payload Saldirisi

Beklenmeyen JSON yapisi, tip hatasi, alan eksikligi gibi
saldirilar. Korunma:

```js
// Her interaction handler'inda try/catch SART
try {
  const cmd = interaction.data.name;
  // ...
} catch (e) {
  console.error('[HATA]', e.message);
  return new Response('Internal Error', { status: 500 });
}
```

SIMDI bizim boticin: Tum handler'larda `try/catch` var mi?
`kanserBot.js`'de var. Peki `webOsintBot.js`, `sosyalMuhBot.js`
gibi diger botlar? Onlari kontrol etmek lazim.

---

## 6) OAUTH2 EXPLOITATION

### Nasil Calisir

Discord botlari OAuth2 ile yetkilendirme yapar. Eger bot
`applications.commands` scope'una ek olarak `bot` scope'una
sahipse ve `Administrator` yetkisi istiyorsa:

1. Bir sunucuya eklendiginde otomatik admin olur
2. Saldirgan, bot uzerinden sunucuda her seyi yapabilir

### Bizim Botumuz

Bizim register scriptlerimizde:

```js
permissions: 8  // ADMINISTRATOR
```

Bu, bot eklendigi tum sunucularda ADMIN yetkisi alir.
Eger bot token'i calinirsa, saldirgan bot'u kullanarak
tum sunuculari ele gecirebilir!

### Nasil Cozulur

```js
// Cozum: En az yetki prensibi
permissions: [
  'SendMessages',
  'ReadMessageHistory',
  'UseSlashCommands'
  // Ihtiyac duyulan en az yetki
].reduce((a, p) => a | Permissions.FLAGS[p], 0n)
```

---

## 7) SUPPLY CHAIN SALDIRILARI

### Nasil Calisir

Saldirgan, populer bir npm/pip paketini ele gecirir veya
benzer isimde zararli bir paket yayinlar. Bot gelistiricisi
bu paketi kullaninca, token/env bilgileri calinir.

### Projemizdeki Bagimliliklar

`package.json`'da `"dependencies": {}` (bos) — cunku Workers
Edge runtime'da calisiyor ve sadece built-in API'leri kullaniyor.

Bu buyuk bir avantaj! Bagimlilik azaldikca saldiri yuzeyi
kuculur.

### Korunma

```bash
# 1. Minimum bagimlilik
npm ls --depth=0  # kac paket var?
# Cikti: (empty) -> MUKEMEL!

# 2. Regulr audit
npm audit

# 3. lockfile korumasi
git add package-lock.json  # CI'de dogrulama icin

# 4. pip icin (Python tool'lar)
pip freeze > requirements.txt
pip audit
```

---

## 8) PERMISSION ESCALATION

### Nasil Calisir

Bot icindeki komutlarin gerektirdiginden fazla yetkiye sahip
olmasi. Ornegin normal bir kullanicinin admin panelini
gormesi.

### Projemizdeki Durum

`kanserBot.js`'de admin kontrolleri var:

```js
const userPermissions = BigInt(interaction.member?.permissions || "0");
const ADMINISTRATOR_FLAG = BigInt(8);
if ((userPermissions & ADMINISTRATOR_FLAG) !== ADMINISTRATOR_FLAG) {
  return sendResponse("Hata: Bu komutu kullanmak icin...", true);
}
```

Bu dogru. Ancak **DIGER BOTLARDA** bu kontrol yok!
Herhangi bir kullanici:

- `webOsintBot.js` komutlarini kullanabilir
- `sosyalMuhBot.js` komutlarini kullanabilir
- `gozetimBot.js` komutlarini kullanabilir

### Cozum

```js
// helpers.js'ye ekle
export function hasPermission(interaction, requiredFlag = 8n) {
  const perms = BigInt(interaction.member?.permissions || "0");
  return (perms & requiredFlag) === requiredFlag;
}

// Kullanimi:
if (!hasPermission(interaction)) {
  return sendResponse("Yetkiniz yok.", true);
}
```

---

## 9) COOLDOWN & RATE LIMITING

### Workers'ta Cooldown Implementasyonu

Workers'ta global degiskenler paylasilmaz (her request yeni bir
izolasyonda calisir). Cooldown icin **KV** kullanmak gerekir:

```js
// helpers.js - KV tabanli cooldown
export async function checkCooldownKV(env, userId, commandName, seconds = 3) {
  const key = `cd_${userId}_${commandName}`;
  const last = await env.KV.get(key);
  const now = Date.now();
  
  if (last && now - parseInt(last) < seconds * 1000) {
    const remaining = Math.ceil((seconds * 1000 - (now - parseInt(last))) / 1000);
    return remaining; // 0 degilse -> beklemesi gereken sure
  }
  
  await env.KV.put(key, now.toString(), { expirationTtl: seconds + 5 });
  return 0; // sorun yok, devam et
}
```

Kullanimi:

```js
// herhangi bir komut handler'inda
const cooldown = await checkCooldownKV(env, userId, name, 5);
if (cooldown > 0) {
  return sendResponse(`Bu komutu tekrar kullanmak icin ${cooldown} saniye bekleyin.`, true);
}
```

### KV Yerine In-Memory (Workers Unstable)

Workers'un `env.KV` disinda, dogrudan global scope'da Map
kullanilabilir. Ancak bu global degil, sadece ayni izolasyon
icin gecerlidir. Yine de, Durable Objects kullanilarak
gercek global cooldown yapilabilir.

---

## 10) MONITORING & LOGGING

### Neleri Izlemeliyiz?

```
METRIK                 NASIL
------                 -----
Komut kullanim sayisi  KV'de sayac tut
Hata orani             try/catch icinde log
429 (rate limit)       API yanitini kontrol et
Token kullanimi        Discord audit log
Sunucu sayisi          Guild Count
Aktif kullanici        Son 24 saat
Workers CPU/Bellek     Cloudflare Dashboard
```

### Projemiz Icin Monitoring

```js
// helpers.js - monitoring
export async function logMetric(env, metric, value = 1) {
  const key = `metric_${metric}_${new Date().toISOString().slice(0, 13)}`;
  const current = parseInt(await env.KV.get(key) || "0");
  await env.KV.put(key, (current + value).toString(), { expirationTtl: 86400 });
}

// Kullanimi:
try {
  // komut burada
  await logMetric(env, `cmd_${name}`);
} catch (e) {
  await logMetric(env, `error_${name}`);
  console.error(`[HATA] ${name}:`, e.message);
}
```

### Discord Uzerinden Alarm

```js
// Kurumsal alarm kanalina gonder
export async function sendAlert(env, message) {
  if (!env.ALERT_WEBHOOK_URL) return;
  await fetch(env.ALERT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `[ALARM] ${message}` })
  });
}

// Kullanimi:
if (hataOrani > 10) {
  await sendAlert(env, `Hata orani cok yuksek! Son 1 saat: ${hataOrani}`);
}
```

---

## 11) PROJE BAZLI COZUMLER

### Kanser-Reich-System Icin Yapilmasi Gerekenler

| # | Yapilacak | Oncelik | Durum |
|---|-----------|---------|-------|
| 1 | KV tabanli cooldown ekle | Yuksek | YAPILMADI |
| 2 | Tum bot'larda try/catch kontrol | Yuksek | KISMEN |
| 3 | Hata mesajlarinda stack trace'i gizle | Yuksek | YAPILMADI |
| 4 | Monitor sistemi ekle | Orta | YAPILMADI |
| 5 | Discord alert webhook'u ekle | Orta | YAPILMADI |
| 6 | Admin komutlari icin rol bazli yetki | Orta | KISMEN |
| 7 | Komut basina sure limiti (timeout) | Dusuk | YAPILMADI |
| 8 | Kullanici kara liste (blacklist) | Dusuk | YAPILMADI |
| 9 | Komut kullanim istatistikleri | Dusuk | YAPILMADI |
| 10 | Workers CPU sure takibi | Dusuk | Cloudflare yapar |

### Cooldown Ekleme (Hemen Yapilabilir)

`src/utils/helpers.js` dosyasina eklenmesi gereken fonksiyon:

```js
// KV tabanli cooldown
export async function checkCooldown(env, userId, cmdName, seconds = 3) {
  const key = `cd_${userId}_${cmdName}`;
  const last = await env.KV?.get(key);
  const now = Date.now();
  if (last && now - parseInt(last) < seconds * 1000) {
    return Math.ceil((seconds * 1000 - (now - parseInt(last))) / 1000);
  }
  await env.KV?.put(key, now.toString(), { expirationTtl: seconds + 5 });
  return 0;
}
```

Her komut handler'inda en basa eklenecek satir:

```js
const cd = await checkCooldown(env, getUserId(interaction), name, 3);
if (cd > 0) return sendResponse(`Bu komutu tekrar kullanmak icin ${cd} saniye bekleyin.`, true);
```

### Kullanici Kara Liste

```js
// helpers.js
export async function isBlacklisted(env, userId) {
  const list = await env.KV?.get('blacklist');
  if (!list) return false;
  return JSON.parse(list).includes(userId);
}

export async function addBlacklist(env, userId) {
  const list = JSON.parse(await env.KV?.get('blacklist') || '[]');
  if (!list.includes(userId)) list.push(userId);
  await env.KV?.put('blacklist', JSON.stringify(list));
}

// Komut handler'inda:
if (await isBlacklisted(env, getUserId(interaction))) {
  return sendResponse('Erisiminiz engellendi.', true);
}
```

---

## OZET: Discord Bot Korunma Kontrol Listesi

```
[ ] Token'lar env variable'da (wrangler secret)
[ ] .gitignore'da register'lar, .env, config
[ ] Signature verification (Ed25519)
[ ] Timestamp dogrulama (5dk)
[ ] Cooldown sistemi (per-user per-command)
[ ] Global rate limit (saniyede max istek)
[ ] Tum handler'larda try/catch
[ ] Hata mesajlari generic (stack trace yok)
[ ] En az yetki prensibi (permissions)
[ ] Komut basina sure limiti (timeout)
[ ] Kara liste destegi
[ ] Monitoring metrikleri
[ ] Alarm sistemi (webhook)
[ ] Workers CPU sure limiti (30s)
[ ] Bagimlilik minimizasyonu
[ ] Duzenli token rotasyonu (3 ay)
[ ] Cloudflare WAF kurallari
[ ] Cloudflare Dashboard monitor
[ ] Test ortami (production'dan ayri)
[ ] Log toplama (KV veya R2)
```

---

## Scriptler

| Script | Amac |
|--------|------|
| `01-token-scanner.py` | GitHub/public repo'da token tarama (egitim) |
| `02-rate-limit-test.py` | Bot rate limit testi |
| `03-monitoring-setup.py` | Bot monitoring araci |
| `04-webhook-security.py` | Webhook validasyonu |
| `05-security-audit.py` | Bot guvenlik denetimi |

---

**Not:** Bu dokuman tamamen egitim amaciyla hazirlanmistir.
Gercek sistemlere karsi kullanimi yasa disidir.
