# VDS'de Discord Bot Hosting — Guvenlik Rehberi

**Platform:** Linux VDS (Ubuntu/Debian), PM2, Node.js, Python
**Hedef:** Satisa sundugun bot ekosistemini dis saldirilardan korumak

---

## Icerik

| # | Konu | Risk |
|---|------|------|
| 1 | [SSH Guvenligi](#1-ssh-guvenligi) | **KRITIK** |
| 2 | [Token & API Key Guvenligi](#2-token--api-key-guvenligi) | **KRITIK** |
| 3 | [PM2 Guvenligi](#3-pm2-guvenligi) | **YUKSEK** |
| 4 | [DDoS & Network](#4-ddos--network-koruma) | **YUKSEK** |
| 5 | [Bot Process Guvenligi](#5-bot-process-guvenligi) | YUKSEK |
| 6 | [Rate Limiting & Anti-Spam](#6-rate-limiting--anti-spam) | YUKSEK |
| 7 | [Cod Level Zafiyetler](#7-code-level-zafiyetler) | ORTA |
| 8 | [File & Filesystem](#8-file--filesystem-guvenligi) | ORTA |
| 9 | [Monitoring & Alarm](#9-monitoring--alarm) | ORTA |
| 10 | [Yedekleme & Recovery](#10-yedekleme--recovery) | DUSUK |

---

## 1) SSH Guvenligi

En kritik saldiri vektoru. SSH acik = tum VDS elde.

### Yapilmasi Gerekenler

```bash
# 1. Sifre ile giris KAPAT (sadece SSH key)
sudo nano /etc/ssh/sshd_config
# Degistir:
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
sudo systemctl restart sshd

# 2. SSH portunu degistir (zorunlu degil ama onerilir)
sudo nano /etc/ssh/sshd_config
Port 2222  # 22 yerine baska bir port
sudo systemctl restart sshd

# 3. Fail2ban kur (brute force koruma)
sudo apt install fail2ban
sudo nano /etc/fail2ban/jail.local
# [sshd]
# enabled = true
# port = 2222
# maxretry = 3
# bantime = 3600
sudo systemctl restart fail2ban

# 4. SSH key olustur (YEREL bilgisayarinda)
ssh-keygen -t ed25519 -C "vds-bot"
ssh-copy-id -i ~/.ssh/id_ed25519.pub kullanici@VDS-IP -p 2222

# 5. Basarisiz giris denemelerini kontrol et
sudo journalctl -u sshd | grep "Failed password" | wc -l
# Eger 1000+ ise hemen SSH portunu degistir + fail2ban kur
```

### Nasil Saldirirlar?

```
Saldirgan: shodan.io'da "Discord Bot" veya "node:22" gibi
           servisleri bulunan VDS'leri tarar.
           -> SSH brute force (rockyou.txt)
           -> default sifre deneme (root:root, admin:admin)
           -> CVE exploit (OpenSSH zafiyetleri)

Korunma:  Yukaridaki 5 adim + duzenli `apt update && apt upgrade`
```

---

## 2) Token & API Key Guvenligi

Bot'un can damari. Token calinirsa bot + sunucu elde.

### Yapilmasi Gerekenler

```bash
# 1. .env dosyasi kullan (KESINLIKLE kod icine yazma)
cd /home/bot/proje1
nano .env
# DISCORD_TOKEN=MTIz...
# PUBLIC_KEY=abc...
# API_KEY=xyz...

# 2. .env'yi .gitignore'a ekle (git kullaniyorsan)
echo ".env" >> .gitignore
git rm --cached .env  # eger zaten eklenmisse

# 3. .env dosyasinin izinlerini kisitla
chmod 600 .env  # sadece dosya sahibi okuyabilir
# chmod 400 .env  # sadece okunabilir (yazilamaz)

# 4. PM2'ye .env'yi yukle (ecosystem.config.js)
module.exports = {
  apps: [{
    name: "bot1",
    script: "index.js",
    env_file: ".env",  // PM2 otomatik .env'yi yukler
    // VEYA manuel:
    env: {
      DISCORD_TOKEN: process.env.DISCORD_TOKEN
    }
  }]
};

# 5. PM2 env'lerini kontrol et (token gorunmesin!)
pm2 env 0  # Bunu baskalarina gosterme!
pm2 show bot1  # "env" bolumunde token gorunuyor mu?

# 6. Token'larin log'da gorunmemesi icin
# kod icinde ASLA console.log(token)
# Veya PM2 log'larini kapat:
pm2 start index.js --log-type json --merge-logs
```

### Token Nereden Calinabilir?

| Kaynak | Nasil? | Cozum |
|--------|--------|-------|
| `.env` dosyasi | SSH ile VDS'e girip okumak | chmod 600, SSH key |
| `pm2 env` ciktisi | Sunucuda calisan bir process'in env'lerini okumak | Token'i sadece bot process'i gormeli |
| `console.log` | PM2 log'larinda token yaziyorsa | Log'lari temizle, token'i loglama |
| `git push` | Yanlislikla public repo'ya | .gitignore, pre-commit hook |
| RAM dump | `/proc/self/environ` okumak | Konteyner/sandbox kullan |
| PM2 config | `ecosystem.config.js`'de duz metin | `env_file: ".env"` kullan |

### Discord Token Korunma

```js
// .env'den token al
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("[HATA] DISCORD_TOKEN bulunamadi!");
  process.exit(1);
}

// Token'i loglama (ASLA!)
// console.log("Token:", token); // YAPMA!

// Sadece client.login'de kullan
client.login(token);
```

---

## 3) PM2 Guvenligi

PM2, bot process'lerini yoneten ana program. Saldirgan PM2'ye
erisirse tum botlarini ele gecirebilir.

### Yapilmasi Gerekenler

```bash
# 1. PM2'yi root olarak calistirma!
# KOTU: sudo pm2 start index.js
# IYI: normal kullanici ile
sudo adduser botadmin
sudo usermod -aG sudo botadmin
su - botadmin
pm2 start index.js

# 2. PM2 dashboard kapat (public IP ile acikta)
pm2 stop pm2-dashboard  # eger yuklu ise
# pm2-dashboard -> http://VDS-IP:9615
# Bu portu UFW ile kapat:
sudo ufw deny 9615

# 3. PM2 log'larini sinirla (disk dolarsa bot duser)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 5
pm2 set pm2-logrotate:compress true

# 4. PM2 restart limiti — loop'u onler
# ecosystem.config.js'de:
// max_restarts: 5,
// min_uptime: 10000,  // 10 saniyeden az calisirsa restart say
// kill_timeout: 5000,

# 5. PM2 monit kullan (canli izle)
pm2 monit  # CPU, RAM, requests
```

### Ornek Secure PM2 Config

```js
// ecosystem.config.js (TUM botlarin icin)
module.exports = {
  apps: [
    {
      name: "ekonomi-bot",
      script: "ekonomi-bot/index.js",
      env_file: ".env.ekonomi",
      instances: 1,
      exec_mode: "fork",
      max_restarts: 5,
      min_uptime: 10000,
      kill_timeout: 5000,
      max_memory_restart: "400M",
      log_type: "json",
      error_file: "./logs/ekonomi-error.log",
      out_file: "./logs/ekonomi-out.log",
      merge_logs: true,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "moderasyon-bot",
      script: "moderasyon/index.js",
      env_file: ".env.moderasyon",
      instances: 1,
      max_restarts: 5,
      min_uptime: 10000,
      max_memory_restart: "300M",
      log_type: "json",
      error_file: "./logs/moderasyon-error.log",
      out_file: "./logs/moderasyon-out.log",
      merge_logs: true,
      autorestart: true,
      watch: false
    },
    {
      name: "python-log-bot",
      script: "logger/bot.py",
      interpreter: "python3",
      env_file: ".env.logger",
      instances: 1,
      max_restarts: 3,
      min_uptime: 5000,
      max_memory_restart: "200M"
    }
  ]
};
```

---

## 4) DDoS & Network Koruma

VDS'in IP'si hedef alindiginda tum botlar gidici.

### Yapilmasi Gerekenler

```bash
# 1. UFW ile gereksiz portlari kapat
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 2222/tcp  # SSH (degistirdigin port)
sudo ufw allow 80/tcp     # eger web panel varsa
sudo ufw allow 443/tcp    # eger SSL varsa
sudo ufw enable
sudo ufw status verbose

# 2. Cloudflare Proxy kullan (DNS adi varsa)
# Discord bot'larina DNS adi kullanmiyorsan:
# -> VDS IP'sini gizli tut
# -> Musterilere IP yerine bot davet linki ver
# -> Discord API zaten IP gerektirmez

# 3. Rate limiting (VDS level)
sudo apt install iptables-persistent
# Saniyede 100 baglantidan fazlasini engelle:
sudo iptables -A INPUT -p tcp --dport 80 -m state --state NEW -m limit --limit 100/s -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -m state --state NEW -j DROP

# 4. Syn flood koruma
sudo sysctl -w net.ipv4.tcp_syncookies=1
sudo sysctl -w net.ipv4.tcp_synack_retries=2
sudo sysctl -w net.ipv4.tcp_syn_retries=2

# 5. Sunucu kaynaklarini sinirla (bir bot digerini etkilemesin)
# Her bot process'i icin systemd servisi veya cgroups
```

### Musteri Sunucularindan Gelebilecek Saldirilar

```
Saldiri: Bir musteri, bot'unu kendi sunucusunda spam yaparak
         VDS'deki tum botlari etkileyebilir.

Korunma:
  - Her bot ayri process (PM2 zaten yapiyor)
  - Bot basina bellek limiti (max_memory_restart)
  - Bot basina API rate limit (process level)
  - Bir bot digerinin token'ini gormemeli (.env ayri)
```

---

## 5) Bot Process Guvenligi

### Cooldown Sistemi (OLMAZSA OLMAZ)

```js
// Discord.js v14 cooldown
const cooldowns = new Map();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, user } = interaction;
  const key = `${user.id}:${commandName}`;
  const now = Date.now();
  const cooldownAmount = 3 * 1000; // 3 saniye

  if (cooldowns.has(key)) {
    const expirationTime = cooldowns.get(key) + cooldownAmount;
    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: `Bu komutu tekrar kullanmak icin ${timeLeft.toFixed(1)}s bekleyin.`,
        ephemeral: true
      });
    }
  }

  cooldowns.set(key, now);
  setTimeout(() => cooldowns.delete(key), cooldownAmount);

  // Komut burada
});
```

### Process Memory Limit

```js
// Bot.js en ustunde
const mem = process.memoryUsage().heapUsed / 1024 / 1024;
if (mem > 350) { // 350MB uzeri
  console.error(`[KRITIK] Bellek limiti asildi: ${mem.toFixed(1)}MB`);
  process.exit(1); // PM2 yeniden baslatir
}
```

### Uncaught Exception Handler

```js
process.on('uncaughtException', (err) => {
  console.error('[KIRILMA] Yakalanamayan hata:', err.message);
  // Log'la
  require('fs').appendFileSync('crash.log',
    `${new Date().toISOString()} [UNCAUGHT] ${err.stack}\n`);
  // Process'i oldur (PM2 yeniden baslatsin)
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[KIRILMA] Yakalanamayan Promise hatasi:', reason);
});
```

---

## 6) Rate Limiting & Anti-Spam

### Discord.js Rate Limiting

```js
const PQueue = require('p-limit'); // veya benzeri
const queue = PQueue(2); // Ayni anda max 2 Discord API istegi

client.on('rateLimit', (info) => {
  console.error(`[RATE LIMIT] ${info.route} | ${info.timeout}ms`);
  // Bir kanala alarm gonder
  const channel = client.channels.cache.get('ALARM_KANALI_ID');
  if (channel) channel.send(`[ALARM] Rate limit: ${info.route} - ${info.timeout}ms`);
});

// API isteklerini sirala
async function sendToChannel(channel, content) {
  await queue(() => channel.send(content));
}
```

### Guild Join Limiti

```js
// Bot cok fazla sunucuya ayni anda eklenirse rate limit yer
// Cozum: join'leri sirala
client.on('guildCreate', async (guild) => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2s bekle
  console.log(`[+] Sunucu eklendi: ${guild.name} (${guild.id})`);
});
```

### Kullanici Kara Liste

```js
const blacklist = new Set();

// Kara listeden kullanici ekle/cikar komutlari
client.on('interactionCreate', async interaction => {
  if (blacklist.has(interaction.user.id)) {
    return interaction.reply({ content: 'Erisiminiz engellendi.', ephemeral: true });
  }
  // ...
});
```

---

## 7) Code Level Zafiyetler

### ASLA Yapilmamasi Gerekenler

```js
// 1. eval() KULLANMA — Remote Code Execution!
client.on('messageCreate', msg => {
  if (msg.content.startsWith('!eval')) {
    eval(msg.content.slice(5)); // OOOOOYYYYYYY
    // Bu kadar basit: !eval process.env.DISCORD_TOKEN
  }
});

// 2. exec() / spawn() KULLANMA
const { exec } = require('child_process');
exec(msg.content); // !exec rm -rf /

// 3. Kullanici girdisini dogrulamadan kullanma
// KOTU:
const name = msg.content;
const result = db.query(`SELECT * FROM users WHERE name = '${name}'`); // SQLi!
// IYI:
const result = db.query('SELECT * FROM users WHERE name = ?', [name]);

// 4. require() ile dosya yolu manipulasyonu
// KOTU:
const data = require(`./data/${msg.content}.json`); // Path traversal!
// !get ../config.json -> token calar

// 5. fetch() ile SSRF
// KOTU:
const res = await fetch(msg.content); // Server-Side Request Forgery
// !fetch http://169.254.169.254/latest/meta-data/  -> AWS credentials
```

### Guvenli Kod Ornegi

```js
const { URL } = require('url');

// Guvenli fetch: sadece beyaz listedeki URL'lere izin ver
const ALLOWED_DOMAINS = ['api.github.com', 'ip-api.com', 'haveibeenpwned.com'];

async function safeFetch(url) {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
      throw new Error('Bu domaine erisim izni yok');
    }
    return await fetch(url);
  } catch (e) {
    throw new Error(`Guvenlik hatasi: ${e.message}`);
  }
}
```

---

## 8) File & Filesystem Guvenligi

### Dosya Izinleri

```bash
# .env dosyalari
cd /home/botadmin/
chmod 600 .env*              # sadece sahip okuyabilir
chmod 600 ecosystem.config.js # PM2 config'inde token olabilir

# Bot klasorleri
chmod 755 /home/botadmin/    # ana klasor
chmod 700 /home/botadmin/*/  # her bot klasoru (sadece sahip)
chmod 644 /home/botadmin/*/*.js  # kod dosyalari

# Log'lar (token icerebilir!)
chmod 600 /home/botadmin/logs/*.log
chmod 600 /home/botadmin/*/crash.log

# Tum dosyalarin sahibini kontrol et
ls -la /home/botadmin/
# root:root gorursen -> sorun! botadmin olmali
sudo chown -R botadmin:botadmin /home/botadmin/
```

### Log Temizleme

```bash
# PM2 log'larinda token var mi kontrol et
grep -r "MT[0-9]" ~/.pm2/logs/  # token pattern
# Varsa hemen temizle:
pm2 flush  # tum log'lari sil
pm2 reloadLogs

# Log'lari duzenli temizle (cron)
crontab -e
# Her gun 03:00'da log'lari temizle
0 3 * * * pm2 flush >/dev/null 2>&1
```

---

## 9) Monitoring & Alarm

### Bot ayakta mi kontrol et

```bash
# Basit healthcheck (cron ile)
crontab -e
# Her 5 dakikada bir bot kontrol et
*/5 * * * * curl -X POST https://discord.com/api/v10/users/@me/channels \
  -H "Authorization: Bot MTIz..." \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":"SENIN_DISCORD_ID"}' \
  >/dev/null 2>&1

# Veya python script'i ile
```

### Python Healthcheck Scripti

```python
# healthcheck.py — PM2 botlarini izle
import subprocess, json, time

BOTS = ["ekonomi-bot", "moderasyon-bot", "log-bot"]
ALARM_KANAL_WEBHOOK = "https://discord.com/api/webhooks/..."

def check_bot(name):
    result = subprocess.run(
        ["pm2", "jlist"],
        capture_output=True, text=True
    )
    processes = json.loads(result.stdout)
    for p in processes:
        if p["name"] == name:
            status = p["pm2_env"]["status"]
            memory = p["monit"]["memory"] / 1024 / 1024
            cpu = p["monit"]["cpu"]
            uptime = p["pm2_env"]["pm_uptime"]
            return status, memory, cpu, uptime
    return "stopped", 0, 0, 0

def send_alarm(message):
    import requests
    requests.post(ALARM_KANAL_WEBHOOK, json={"content": message})

while True:
    for bot in BOTS:
        status, mem, cpu, uptime = check_bot(bot)
        if status != "online":
            send_alarm(f"[ALARM] {bot} durdu! Statu: {status}")
        if mem > 300:
            send_alarm(f"[UYARI] {bot} bellek: {mem:.0f}MB")
    time.sleep(60)
```

### Telegram Alarm (Alternatif)

```python
# Eger Discord kullanmak istemezsen -> Telegram botu
# https://core.telegram.org/bots/api

TELEGRAM_TOKEN = "123456:ABC-DEF..."
TELEGRAM_CHAT_ID = "123456789"

def send_telegram(msg):
    import requests
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": msg})
```

---

## 10) Yedekleme & Recovery

### Bot Kodlarini Yedekle

```bash
#!/bin/bash
# backup.sh — Haftalik yedekleme

BACKUP_DIR="/backup/bots"
DATE=$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR/$DATE

# Bot klasorlerini yedekle (env'ler HARIC!)
cd /home/botadmin
for bot in ekonomi-bot moderasyon-bot log-bot; do
  tar czf $BACKUP_DIR/$DATE/$bot.tar.gz \
    --exclude=".env" \
    --exclude="node_modules" \
    --exclude="logs" \
    $bot/
done

# .env dosyalarini AYRI yedekle (sifreli)
gpg --symmetric --cipher-algo AES256 \
  /home/botadmin/.env.ekonomi \
  --output $BACKUP_DIR/$DATE/.env.ekonomi.gpg

# Eski yedekleri temizle (30 gun)
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;

# cron'a ekle: 0 4 * * 0 /home/botadmin/backup.sh
```

### Recovery Suresi

```
DURUM                          COZUM                     SURE
-----                          -----                     ----
Bot process'i durdu            pm2 start bot1            <1dk
Bot surekli crash              pm2 logs bot1 -> debug    1-10dk
VDS tamamen dustu              DigitalOcean/Oracle        5-15dk
                                panelden reboot
VDS silindi / format            Yedekten geri yukle      30-60dk
Token calindi / iptal edildi   Yeni token + .env         5dk

### MUSTERI ICIN: Bot kullanima kapaliysa
1. VDS'ye SSH ile baglan
2. pm2 status  -> hangi botlar calisiyor
3. pm2 logs bot1 --lines 20  -> son hata mesaji
4. pm2 restart bot1  -> yeniden baslat
5. Musteriye: "Sorun cozuldu, bot aktif"
```

### Acil Durum Plani

```bash
# 1. Bot dustu — hizlica yeniden baslat
ssh botadmin@VDS-IP -p 2222
pm2 status
pm2 restart ALL
pm2 status

# 2. VDS'e erisilemiyor — DigitalOcean panelinden
# Droplet -> Console -> reboot

# 3. Token calindi — hemen iptal et
# https://discord.com/developers/applications
# -> Bot -> Reset Token
# -> .env'de guncelle
# -> pm2 restart ALL

# 4. Kalici cozum — yeni VDS'ye gec
# Yedekten geri yukle
# .env dosyalarini elle gir
# PM2'yi baslat
```

---

## OZET: VDS Bot Guvenlik Kontrol Listesi

```
SSH:
[ ] PasswordAuthentication NO
[ ] PermitRootLogin NO
[ ] SSH port degistirildi
[ ] Fail2ban kurulu
[ ] Sadece ed25519 key ile giris

TOKEN:
[ ] .env dosyasi kullaniliyor
[ ] .env chmod 600
[ ] .env .gitignore'da
[ ] console.log(token) yok
[ ] PM2 log'lari token icermiyor

PM2:
[ ] Root ile calismiyor
[ ] max_memory_restart ayarli
[ ] logrotate kurulu
[ ] max_restarts sinirli
[ ] dashboard kapali (port 9615)

NETWORK:
[ ] UFW aktif
[ ] Gereksiz portlar kapali
[ ] Syn flood koruma
[ ] IP gizli tutuluyor

CODE:
[ ] eval() kullanilmiyor
[ ] exec() kullanilmiyor
[ ] Input dogrulama var
[ ] SQL injection yok
[ ] Path traversal yok
[ ] Cooldown sistemi var

MONITOR:
[ ] Healthcheck scripti calisiyor
[ ] Alarm mekanizmasi var (Discord/Telegram)
[ ] Log rotasyonu var
[ ] Bellek takibi var
[ ] Crash log tutuluyor

BACKUP:
[ ] Haftalik yedekleme
[ ] .env sifreli yedek
[ ] Eski yedekler temizleniyor
[ ] Recovery plani yazili
```

---

## MUSTERI ICIN: Satis Oncesi Guvence

Musterine soyleyebilecegin guvenlik ozellikleri:

```
* Bot, enterprise-level VDS'de 7/24 calisir
* Cooldown sistemi ile spam korumali
* Duzenli yedekleme (30 gun retention)
* 5 dakikada bir healthcheck
* Anlik hata bildirim sistemi
* 15 dakika icinde mudahale garantisi
* SSL ile guvenli baglanti
* Token'lar sifrelenmis ortamda saklanir
* Process level izolasyon (bir bot digerini etkilemez)
* Rate limiting ile Discord API korumasi
```

---

**UYARI:** Bu dokuman egitim amaciyladir.
Baskasinin sistemine izinsiz mudahale yasa disidir.
